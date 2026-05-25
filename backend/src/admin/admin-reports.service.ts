import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReportStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AdminLogService } from './admin-log.service';
import {
  AdminReportTab,
  ListAdminReportsDto,
} from './dto/list-admin-reports.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

const reportListSelect = {
  id: true,
  targetType: true,
  targetId: true,
  reason: true,
  description: true,
  status: true,
  adminNote: true,
  resolvedById: true,
  resolvedAt: true,
  createdAt: true,
  reporter: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.ReportSelect;

const TAB_TO_STATUS: Record<
  AdminReportTab,
  ReportStatus | ReportStatus[] | null
> = {
  [AdminReportTab.ALL]: null,
  [AdminReportTab.PENDING]: ReportStatus.PENDING,
  [AdminReportTab.REVIEWING]: ReportStatus.REVIEWING,
  [AdminReportTab.RESOLVED]: ReportStatus.RESOLVED,
  [AdminReportTab.REJECTED]: ReportStatus.REJECTED,
};

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLog: AdminLogService,
  ) {}

  async list(query: ListAdminReportsDto) {
    const where: Prisma.ReportWhereInput = {};
    if (query.status) {
      where.status = query.status;
    } else {
      const fromTab = TAB_TO_STATUS[query.tab];
      if (fromTab) {
        where.status = Array.isArray(fromTab) ? { in: fromTab } : fromTab;
      }
    }
    if (query.targetType) where.targetType = query.targetType;
    if (query.reason) where.reason = query.reason;

    // Comptes par statut (pour les badges des onglets) — toujours en parallèle.
    const [items, total, statusCounts] = await Promise.all([
      this.prisma.report.findMany({
        where,
        select: reportListSelect,
        // Pending d'abord, puis plus récents en haut.
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.report.count({ where }),
      this.prisma.report.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const counts = {
      pending: 0,
      reviewing: 0,
      resolved: 0,
      rejected: 0,
      total: 0,
    };
    for (const row of statusCounts) {
      counts.total += row._count._all;
      if (row.status === ReportStatus.PENDING) counts.pending = row._count._all;
      if (row.status === ReportStatus.REVIEWING)
        counts.reviewing = row._count._all;
      if (row.status === ReportStatus.RESOLVED)
        counts.resolved = row._count._all;
      if (row.status === ReportStatus.REJECTED)
        counts.rejected = row._count._all;
    }

    return {
      items,
      total,
      counts,
      page: query.page,
      limit: query.limit,
      pageCount: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async getDetail(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      select: reportListSelect,
    });
    if (!report) throw new NotFoundException('Signalement introuvable.');

    // Preview de la cible — peut être null si la cible a été supprimée
    // entre temps (on garde le report pour l'audit).
    const target = await this.fetchTargetPreview(
      report.targetType,
      report.targetId,
    );

    return { ...report, target };
  }

  async resolve(adminId: string, id: string, dto: ResolveReportDto) {
    const existing = await this.prisma.report.findUnique({
      where: { id },
      select: { id: true, status: true, targetType: true, targetId: true },
    });
    if (!existing) throw new NotFoundException('Signalement introuvable.');

    // RESOLVED/REJECTED sont terminaux : on bloque toute transition après coup.
    if (
      existing.status === ReportStatus.RESOLVED ||
      existing.status === ReportStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Ce signalement est déjà clos. Crée un nouveau signalement si nécessaire.',
      );
    }

    const now = new Date();
    const isTerminal =
      dto.status === ReportStatus.RESOLVED ||
      dto.status === ReportStatus.REJECTED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.report.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.adminNote !== undefined ? { adminNote: dto.adminNote } : {}),
          ...(isTerminal
            ? { resolvedById: adminId, resolvedAt: now }
            : { resolvedById: null, resolvedAt: null }),
        },
        select: reportListSelect,
      });

      const action =
        dto.status === ReportStatus.RESOLVED
          ? 'RESOLVE_REPORT'
          : dto.status === ReportStatus.REJECTED
            ? 'REJECT_REPORT'
            : 'RESOLVE_REPORT';
      await this.adminLog.record(
        {
          adminId,
          action,
          targetType: 'REPORT',
          targetId: id,
          details: {
            from: existing.status,
            to: dto.status,
            adminNote: dto.adminNote ?? null,
            reportTargetType: existing.targetType,
            reportTargetId: existing.targetId,
          },
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  /**
   * Récupère un aperçu lisible de la cible signalée pour le panneau admin.
   * Retourne `null` si la cible a été supprimée (on conserve le report pour audit).
   */
  private async fetchTargetPreview(
    targetType: string,
    targetId: string,
  ): Promise<
    | {
        type: 'ARTICLE';
        id: string;
        title: string;
        slug: string;
        excerpt: string;
        isHidden: boolean;
        author: {
          id: string;
          name: string;
          avatarUrl: string | null;
          isBanned: boolean;
        };
      }
    | {
        type: 'USER';
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
        isBanned: boolean;
      }
    | { type: 'COMMENT'; id: string; placeholder: true }
    | null
  > {
    if (targetType === 'ARTICLE') {
      const article = await this.prisma.article.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          isHidden: true,
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              isBanned: true,
            },
          },
        },
      });
      if (!article) return null;
      return { type: 'ARTICLE', ...article };
    }

    if (targetType === 'USER') {
      const user = await this.prisma.user.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          isBanned: true,
        },
      });
      if (!user) return null;
      return { type: 'USER', ...user };
    }

    if (targetType === 'COMMENT') {
      // Pas encore implémenté côté V3 — placeholder pour l'UI.
      return { type: 'COMMENT', id: targetId, placeholder: true };
    }

    return null;
  }
}
