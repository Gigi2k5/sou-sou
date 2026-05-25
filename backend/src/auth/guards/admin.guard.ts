import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { AuthUser } from '../decorators/current-user.decorator';

/**
 * Garde dédié aux endpoints `/admin/*`. Refuse l'accès si le user courant
 * n'a pas le rôle ADMIN. À combiner avec `JwtAuthGuard` (déjà global) qui
 * a chargé `req.user`. Le check `isBanned` est déjà effectué par
 * `JwtStrategy.validate()` — un user banni ne sera jamais authentifié.
 *
 * S'applique au niveau `@Controller()` via `@UseGuards(AdminGuard)`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException();
    }
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException("Accès réservé aux administrateurs.");
    }
    return true;
  }
}
