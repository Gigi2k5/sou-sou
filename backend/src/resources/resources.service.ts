import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ListResourcesDto } from './dto/list-resources.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { extractYoutubeVideoId, fetchYoutubeMetadata } from './youtube';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListResourcesDto) {
    const where: Prisma.ResourceWhereInput = query.category
      ? { category: query.category }
      : {};
    const [items, categories] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        // Featured d'abord (pour le badge en tête), puis ordre admin (position ASC).
        orderBy: [{ isFeatured: 'desc' }, { position: 'asc' }],
      }),
      this.prisma.resource.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
    ]);
    return {
      items,
      categories: categories
        .map((c) => c.category)
        .filter((c): c is string => !!c),
    };
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

    // Position : on insère en tête (plus petite valeur que la min actuelle).
    const minPos = await this.prisma.resource.aggregate({
      _min: { position: true },
    });
    const newPosition = (minPos._min.position ?? 0) - 1000;

    return this.prisma.resource.create({
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
    });
  }

  async update(id: string, dto: UpdateResourceDto) {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ressource introuvable.');
    return this.prisma.resource.update({
      where: { id },
      data: {
        ...(dto.category !== undefined
          ? { category: dto.category.trim() || null }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ressource introuvable.');
    await this.prisma.resource.delete({ where: { id } });
  }
}
