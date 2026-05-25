import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import { AvatarUnlocksService } from '../avatar-unlocks/avatar-unlocks.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_SOURCES,
} from './default-categories';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { TokensService } from './tokens.service';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

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
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly email: EmailService,
    private readonly avatarUnlocks: AvatarUnlocksService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Création atomique : si la seed des catégories échoue, le user est rollback.
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          password: passwordHash,
          name: dto.name.trim(),
        },
      });
      await tx.incomeSource.createMany({
        data: DEFAULT_INCOME_SOURCES.map((name) => ({
          userId: created.id,
          name,
        })),
      });
      await tx.expenseCategory.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
          userId: created.id,
          name,
        })),
      });
      return created;
    });

    // V2.5 : débloque le cochon par défaut (silent — pas de notif "Bravo"
    // pour le default au signup) et évalue les autres conditions au cas où.
    await this.avatarUnlocks.checkAndUnlock(user.id);

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    if (user.isBanned) {
      throw new UnauthorizedException('Compte suspendu.');
    }

    // Met à jour `lastLoginAt` uniquement sur login réel, pas sur refresh.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildAuthResult(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant.');
    }
    const found = await this.tokens.findActiveRefreshToken(refreshToken);
    if (!found) {
      throw new UnauthorizedException('Refresh token invalide.');
    }

    const newRefresh = await this.tokens.rotateRefreshToken(
      refreshToken,
      found.user.id,
    );
    const accessToken = this.tokens.signAccessToken(
      found.user.id,
      found.user.email,
      found.user.role,
    );

    return {
      user: this.toPublicUser(found.user),
      tokens: { accessToken, refreshToken: newRefresh },
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) {
      await this.tokens.revokeRefreshToken(refreshToken);
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.toPublicUser(user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    // Volontairement silencieux si l'email n'existe pas (pas de leak).
    if (!user) {
      this.logger.log(`Forgot-password ignoré (email inconnu): ${dto.email}`);
      return;
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt },
    });

    try {
      await this.email.sendPasswordReset(user.email, user.name, resetToken);
    } catch (err) {
      // On ne re-throw pas pour ne pas révéler que l'email existe.
      this.logger.error(
        `Échec envoi reset email à ${user.email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });
    if (!user) {
      throw new BadRequestException('Token invalide ou expiré.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    // Sécurité : on révoque toutes les sessions actives.
    await this.tokens.revokeAllForUser(user.id);
  }

  private async buildAuthResult(user: User): Promise<AuthResult> {
    const accessToken = this.tokens.signAccessToken(
      user.id,
      user.email,
      user.role,
    );
    const refreshToken = await this.tokens.issueRefreshToken(user.id);
    return {
      user: this.toPublicUser(user),
      tokens: { accessToken, refreshToken },
    };
  }

  private toPublicUser(user: User): PublicUser {
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
}
