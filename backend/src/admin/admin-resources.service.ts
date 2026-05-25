import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  extractYoutubeVideoId,
  fetchYoutubeMetadata,
} from '../resources/youtube';
import { CreateResourceDto } from '../resources/dto/create-resource.dto';
import { AdminLogService } from './admin-log.service';
import { UpdateAdminResourceDto } from './dto/update-admin-resource.dto';

const adminResourceSelect = {
  id: true,
  videoId: true,
  title: true,
  channelName: true,
  thumbnailUrl: true,
  youtubeUrl: true,
  description: true,
  category: true,
  position: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  addedById: true,
  addedBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.ResourceSelect;

@Injectable()
export class AdminResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLog: AdminLogService,
  ) {}

  async list() {
    const items = await this.prisma.resource.findMany({
      orderBy: [{ isFeatured: 'desc' }, { position: 'asc' }],
      select: adminResourceSelect,
    });
    return { items };
  }

  async create(adminId: string, dto: CreateResourceDto) {
    const videoId = extractYoutubeVideoId(dto.youtubeUrl);
    if (!videoId) {
      throw new BadRequestException(
        'URL YouTube invalide — vérifie le lien (formats acceptés : watch, youtu.be, embed, shorts).',
      );
    }

    const existing = await this.prisma.resource.findUnique({
      where: { videoId },
    });
    if (existing) {
      throw new ConflictException(
        'Cette vidéo est déjà dans la liste des ressources.',
      );
    }

    const meta = await fetchYoutubeMetadata(videoId, dto.youtubeUrl);

    // Insertion en tête : position = min(position) - 1000.
    const minPos = await this.prisma.resource.aggregate({
      _min: { position: true },
    });
    const newPosition = (minPos._min.position ?? 0) - 1000;

    const resource = await this.prisma.$transaction(async (tx) => {
      const created = await tx.resource.create({
        data: {
          videoId,
          title: meta.title,
          channelName: meta.channelName,
          thumbnailUrl: meta.thumbnailUrl,
          youtubeUrl: dto.youtubeUrl,
          category: dto.category?.trim() || null,
          description: dto.description?.trim() || null,
          position: newPosition,
          addedById: adminId,
        },
        select: adminResourceSelect,
      });

      await this.adminLog.record(
        {
          adminId,
          action: 'ADD_RESOURCE',
          targetType: 'RESOURCE',
          targetId: created.id,
          details: { videoId, title: meta.title, youtubeUrl: dto.youtubeUrl },
        },
        tx,
      );

      return created;
    });

    return resource;
  }

  async update(adminId: string, id: string, dto: UpdateAdminResourceDto) {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ressource introuvable.');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.resource.update({
        where: { id },
        data: {
          ...(dto.category !== undefined
            ? { category: dto.category || null }
            : {}),
          ...(dto.description !== undefined
            ? { description: dto.description || null }
            : {}),
          ...(dto.isFeatured !== undefined
            ? { isFeatured: dto.isFeatured }
            : {}),
        },
        select: adminResourceSelect,
      });

      await this.adminLog.record(
        {
          adminId,
          action: 'UPDATE_RESOURCE',
          targetType: 'RESOURCE',
          targetId: id,
          details: {
            title: existing.title,
            ...(dto.category !== undefined ? { category: dto.category } : {}),
            ...(dto.description !== undefined
              ? { descriptionChanged: true }
              : {}),
            ...(dto.isFeatured !== undefined
              ? { isFeatured: dto.isFeatured }
              : {}),
          },
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  async remove(adminId: string, id: string) {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ressource introuvable.');

    await this.prisma.$transaction(async (tx) => {
      await this.adminLog.record(
        {
          adminId,
          action: 'DELETE_RESOURCE',
          targetType: 'RESOURCE',
          targetId: id,
          details: { title: existing.title, videoId: existing.videoId },
        },
        tx,
      );
      await tx.resource.delete({ where: { id } });
    });
  }

  /**
   * Réordonne complètement la liste : `ids[i]` doit avoir position = i * 1000.
   * Espace large entre positions pour permettre des insertions futures sans
   * tout renuméroter.
   *
   * Vérifie que les IDs fournis correspondent exactement aux ressources existantes
   * (anti-perte d'élément ou ID fantôme).
   */
  async reorder(adminId: string, ids: string[]) {
    const all = await this.prisma.resource.findMany({ select: { id: true } });
    const allIds = new Set(all.map((r) => r.id));
    const inputIds = new Set(ids);

    if (allIds.size !== inputIds.size || ids.length !== all.length) {
      throw new BadRequestException(
        "L'ordre fourni ne couvre pas exactement toutes les ressources existantes.",
      );
    }
    for (const id of ids) {
      if (!allIds.has(id)) {
        throw new BadRequestException(`Ressource ${id} introuvable.`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        ids.map((id, index) =>
          tx.resource.update({
            where: { id },
            data: { position: index * 1000 },
          }),
        ),
      );
      await this.adminLog.record(
        {
          adminId,
          action: 'UPDATE_RESOURCE',
          targetType: 'RESOURCE',
          details: { reorder: true, count: ids.length },
        },
        tx,
      );
    });

    return this.list();
  }
}
