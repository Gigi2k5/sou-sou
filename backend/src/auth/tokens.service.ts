import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import type { CookieOptions, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './strategies/jwt.strategy';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

type SameSite = 'lax' | 'none' | 'strict';

@Injectable()
export class TokensService {
  private readonly accessTtl: string;
  private readonly refreshTtlMs: number;
  private readonly cookieSecure: boolean;
  private readonly cookieDomain: string | undefined;
  private readonly cookieSameSite: SameSite;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    this.refreshTtlMs = parseDurationMs(
      this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
    );
    const sameSiteEnv = (
      this.config.get<string>('COOKIE_SAMESITE') ?? 'lax'
    ).toLowerCase();
    this.cookieSameSite = (['lax', 'none', 'strict'] as const).includes(
      sameSiteEnv as SameSite,
    )
      ? (sameSiteEnv as SameSite)
      : 'lax';
    // `sameSite=none` requiert obligatoirement `secure=true` côté navigateur,
    // sinon le cookie est rejeté silencieusement. On force pour éviter
    // les déploiements cross-origin cassés.
    const secureEnv =
      (this.config.get<string>('COOKIE_SECURE') ?? 'false') === 'true';
    this.cookieSecure = secureEnv || this.cookieSameSite === 'none';
    const domain = this.config.get<string>('COOKIE_DOMAIN');
    this.cookieDomain = domain && domain !== 'localhost' ? domain : undefined;
  }

  signAccessToken(userId: string, email: string, role: Role): string {
    const payload: JwtPayload = { sub: userId, email, role };
    // L'expiration est déjà fixée dans JwtModule.registerAsync (signOptions.expiresIn).
    return this.jwt.sign(payload);
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(48).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return token;
  }

  async rotateRefreshToken(oldToken: string, userId: string): Promise<string> {
    const oldHash = hashToken(oldToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: oldHash, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return this.issueRefreshToken(userId);
  }

  async findActiveRefreshToken(token: string) {
    const tokenHash = hashToken(token);
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie(ACCESS_COOKIE, accessToken, this.accessCookieOptions());
    res.cookie(REFRESH_COOKIE, refreshToken, this.refreshCookieOptions());
  }

  clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, this.accessCookieOptions());
    res.clearCookie(REFRESH_COOKIE, this.refreshCookieOptions());
  }

  private baseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.cookieSameSite,
      domain: this.cookieDomain,
    };
  }

  private accessCookieOptions(): CookieOptions {
    return {
      ...this.baseCookieOptions(),
      path: '/',
      maxAge: parseDurationMs(this.accessTtl),
    };
  }

  private refreshCookieOptions(): CookieOptions {
    return {
      ...this.baseCookieOptions(),
      path: '/',
      maxAge: this.refreshTtlMs,
    };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && asNum > 0) return asNum * 1000;
    throw new Error(`Durée invalide: "${value}"`);
  }
  const n = Number(match[1]);
  const unit = match[2];
  const factor = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return n * factor;
}
