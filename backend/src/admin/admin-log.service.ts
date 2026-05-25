import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type AdminLogAction =
  | 'BAN_USER'
  | 'UNBAN_USER'
  | 'DELETE_USER'
  | 'PROMOTE_ROLE'
  | 'DEMOTE_ROLE'
  | 'HIDE_ARTICLE'
  | 'UNHIDE_ARTICLE'
  | 'DELETE_ARTICLE'
  | 'WARN_AUTHOR'
  | 'RESOLVE_REPORT'
  | 'REJECT_REPORT'
  | 'ADD_RESOURCE'
  | 'UPDATE_RESOURCE'
  | 'DELETE_RESOURCE'
  | 'BROADCAST';

export interface AdminLogInput {
  adminId: string;
  action: AdminLogAction;
  targetType?: string;
  targetId?: string;
  details?: Prisma.InputJsonValue;
}

/**
 * Centralise l'écriture dans `AdminLog`. À appeler depuis chaque service admin
 * après une action sensible (ban, suppression, promotion, broadcast, etc.).
 */
@Injectable()
export class AdminLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AdminLogInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.adminLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        details: input.details ?? Prisma.JsonNull,
      },
    });
  }
}
