import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Report } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée un signalement. Refuse :
   *  - de signaler son propre contenu (article uniquement pour V3)
   *  - de signaler 2 fois la même cible (contrainte d'unicité)
   *  - de signaler une cible inexistante (article supprimé entre temps).
   */
  async create(reporterId: string, dto: CreateReportDto): Promise<Report> {
    if (dto.targetType === 'ARTICLE') {
      const article = await this.prisma.article.findUnique({
        where: { id: dto.targetId },
        select: { authorId: true },
      });
      if (!article) {
        throw new NotFoundException('Article introuvable.');
      }
      if (article.authorId === reporterId) {
        throw new BadRequestException(
          'Tu ne peux pas signaler ton propre article.',
        );
      }
    } else if (dto.targetType === 'USER') {
      if (dto.targetId === reporterId) {
        throw new BadRequestException(
          'Tu ne peux pas te signaler toi-même.',
        );
      }
      const user = await this.prisma.user.findUnique({
        where: { id: dto.targetId },
        select: { id: true },
      });
      if (!user) throw new NotFoundException('Utilisateur introuvable.');
    } else if (dto.targetType === 'COMMENT') {
      // Pas encore implémenté côté V3 — on accepte mais on n'a aucune table à
      // valider. À implémenter quand le système de commentaires arrivera.
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const report = await tx.report.create({
          data: {
            reporterId,
            targetType: dto.targetType,
            targetId: dto.targetId,
            reason: dto.reason,
            description: dto.description?.trim() || null,
          },
        });

        // Incrémente le compteur de signalements de l'article pour l'onglet
        // "signalés" du back-office.
        if (dto.targetType === 'ARTICLE') {
          await tx.article.update({
            where: { id: dto.targetId },
            data: { reportCount: { increment: 1 } },
          });
        }

        return report;
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          "Tu as déjà signalé ce contenu — un signalement par contenu suffit.",
        );
      }
      throw err;
    }
  }
}
