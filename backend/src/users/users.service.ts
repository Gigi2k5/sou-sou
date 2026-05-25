import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';

import { AvatarUnlocksService } from '../avatar-unlocks/avatar-unlocks.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  getUploadFilename,
  isPresetAvatar,
  parseDataUrl,
  PRESET_AVATARS,
  removeUploadedAvatar,
  saveUploadedAvatar,
} from './avatar';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type PublicUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'name'
  | 'currency'
  | 'role'
  | 'avatarUrl'
  | 'totalPoints'
  | 'currentStreak'
  | 'bestStreak'
  | 'theme'
  | 'hasCompletedOnboarding'
  | 'onboardingStep'
  | 'createdAt'
>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avatarUnlocks: AvatarUnlocksService,
  ) {}

  async update(userId: string, dto: UpdateUserDto): Promise<PublicUser> {
    if (!dto.name && !dto.currency && !dto.theme) {
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!current) throw new NotFoundException();
      return toPublic(current);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.currency !== undefined
          ? { currency: dto.currency.trim().toUpperCase() }
          : {}),
        ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
      },
    });
    return toPublic(updated);
  }

  /**
   * Met à jour l'avatar de l'utilisateur. Si l'utilisateur avait précédemment
   * un fichier uploadé, on le supprime du disque (sauf si on remplace par un
   * nouvel upload du même user, auquel cas saveUploadedAvatar le réécrase).
   */
  async updateAvatar(
    userId: string,
    dto: UpdateAvatarDto,
  ): Promise<PublicUser> {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!current) throw new NotFoundException();

    const previousUploadedFile = getUploadFilename(current.avatarUrl);

    let nextAvatarUrl: string | null;

    if (dto.type === 'remove') {
      nextAvatarUrl = null;
    } else if (dto.type === 'preset') {
      if (!isPresetAvatar(dto.value)) {
        throw new BadRequestException(
          `Preset inconnu. Choisis parmi : ${PRESET_AVATARS.join(', ')}.`,
        );
      }
      // V2.5 : avatars débloqués par achievement. Le cochon est garanti à
      // l'inscription (silent unlock dans AvatarUnlocksService.onModuleInit
      // ou hook au signup), les autres exigent que la condition soit remplie.
      const unlocked = await this.avatarUnlocks.isUnlocked(userId, dto.value);
      if (!unlocked) {
        throw new ForbiddenException(
          "Cet avatar n'est pas encore débloqué pour ton compte.",
        );
      }
      nextAvatarUrl = `preset:${dto.value}`;
    } else {
      // type === 'upload'
      const { buffer } = parseDataUrl(dto.value);
      const filename = await saveUploadedAvatar(userId, buffer);
      nextAvatarUrl = `upload:${filename}`;
    }

    // Si on retire l'avatar OU on passe à un preset → supprimer l'ancien fichier.
    // Si on uploade un nouveau et que l'ancien était aussi un upload du même user,
    // saveUploadedAvatar a déjà écrasé le fichier (même nom), pas besoin de cleanup.
    if (previousUploadedFile && nextAvatarUrl?.startsWith('upload:') !== true) {
      await removeUploadedAvatar(previousUploadedFile);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: nextAvatarUrl },
    });
    return toPublic(updated);
  }
}

function toPublic(user: User): PublicUser {
  const {
    id,
    email,
    name,
    currency,
    role,
    avatarUrl,
    totalPoints,
    currentStreak,
    bestStreak,
    theme,
    hasCompletedOnboarding,
    onboardingStep,
    createdAt,
  } = user;
  return {
    id,
    email,
    name,
    currency,
    role,
    avatarUrl,
    totalPoints,
    currentStreak,
    bestStreak,
    theme,
    hasCompletedOnboarding,
    onboardingStep,
    createdAt,
  };
}
