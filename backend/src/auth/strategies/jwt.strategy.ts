import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AuthUser['role'];
}

const cookieExtractor = (req: Request): string | null => {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  return cookies?.['access_token'] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET manquant dans .env');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Vérifie le payload signé ET interroge la DB pour s'assurer que le user
   * existe toujours et n'est pas banni. Coût : 1 query indexée par requête
   * authentifiée — acceptable pour avoir un effet immédiat du bannissement.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isBanned: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.isBanned) {
      throw new UnauthorizedException('Compte suspendu.');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
