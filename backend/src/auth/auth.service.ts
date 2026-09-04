import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
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
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { TokensService } from './tokens.service';
import {
  MAX_VERIFICATION_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  VERIFICATION_CODE_TTL_MS,
  generateVerificationCode,
  hashVerificationCode,
  normalizeVerificationCode,
} from './verification-code';

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

/**
 * Le signup ne connecte plus : il crée le compte en attente de vérification.
 * Aucun token n'est émis tant que le code n'a pas été validé.
 */
export interface SignupResult {
  email: string;
  /** Minutes de validité du code, pour l'afficher côté front. */
  expiresInMinutes: number;
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
  | 'emailVerified'
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

  async signup(dto: SignupDto): Promise<SignupResult> {
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

    // Aucun token émis ici : le compte reste inactif jusqu'à la saisie du code.
    await this.issueVerificationCode(user);

    return {
      email: user.email,
      expiresInMinutes: VERIFICATION_CODE_TTL_MS / 60_000,
    };
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
    // Le front s'appuie sur `code` pour rediriger vers /verify-email plutôt
    // que d'afficher une erreur sèche.
    if (!user.emailVerified) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        message: "Ton adresse email n'est pas encore vérifiée.",
      });
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

  /**
   * Valide le code saisi et connecte l'utilisateur dans la foulée — inutile de
   * lui redemander son mot de passe juste après l'inscription.
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<AuthResult> {
    const code = normalizeVerificationCode(dto.code);
    if (!code) {
      throw new BadRequestException('Code invalide.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      // Même message que pour un mauvais code : on ne révèle pas les comptes.
      throw new BadRequestException('Code invalide ou expiré.');
    }
    if (user.emailVerified) {
      throw new BadRequestException('Ce compte est déjà vérifié.');
    }
    if (!user.verificationCodeHash || !user.verificationCodeExpiresAt) {
      throw new BadRequestException(
        'Aucun code en attente — demande un nouvel envoi.',
      );
    }
    if (user.verificationCodeExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Code expiré — demande un nouvel envoi.');
    }
    if (user.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new BadRequestException(
        'Trop de tentatives — demande un nouveau code.',
      );
    }

    if (hashVerificationCode(code) !== user.verificationCodeHash) {
      // On incrémente avant de rejeter : au-delà du seuil, le code est mort
      // même si l'attaquant finit par tomber sur la bonne valeur.
      const attempts = user.verificationAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { verificationAttempts: attempts },
      });
      const left = MAX_VERIFICATION_ATTEMPTS - attempts;
      throw new BadRequestException(
        left > 0
          ? `Code incorrect — ${left} essai${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}.`
          : 'Trop de tentatives — demande un nouveau code.',
      );
    }

    const verified = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCodeHash: null,
        verificationCodeExpiresAt: null,
        verificationAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    return this.buildAuthResult(verified);
  }

  /**
   * Renvoie un code. Volontairement silencieux si l'email est inconnu ou déjà
   * vérifié (pas d'énumération de comptes) — seul le cooldown remonte une erreur.
   */
  async resendVerification(dto: ResendVerificationDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || user.emailVerified) {
      this.logger.log(
        `Resend vérification ignoré (inconnu ou déjà vérifié): ${dto.email}`,
      );
      return;
    }

    const sentAt = user.verificationCodeSentAt?.getTime() ?? 0;
    const waitMs = sentAt + RESEND_COOLDOWN_MS - Date.now();
    if (waitMs > 0) {
      throw new HttpException(
        `Patiente encore ${Math.ceil(waitMs / 1000)}s avant de redemander un code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.issueVerificationCode(user);
  }

  /**
   * Génère un code, le stocke hashé et l'envoie. Remet le compteur d'essais à
   * zéro : un nouveau code = une nouvelle chance.
   */
  private async issueVerificationCode(user: User): Promise<void> {
    const code = generateVerificationCode();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCodeHash: hashVerificationCode(code),
        verificationCodeExpiresAt: new Date(
          Date.now() + VERIFICATION_CODE_TTL_MS,
        ),
        verificationAttempts: 0,
        verificationCodeSentAt: new Date(),
      },
    });

    try {
      await this.email.sendVerificationCode(
        user.email,
        user.name,
        code,
        VERIFICATION_CODE_TTL_MS / 60_000,
      );
    } catch (err) {
      // On ne fait pas échouer le signup pour un souci d'envoi : le compte
      // existe, l'utilisateur peut demander un renvoi depuis /verify-email.
      this.logger.error(
        `Échec envoi code de vérification à ${user.email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
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
      emailVerified,
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
      emailVerified,
      createdAt,
    };
  }
}
