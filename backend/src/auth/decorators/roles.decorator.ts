import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restreint l'accès à un endpoint à certains rôles.
 * Combiné au RolesGuard global, qui ne s'active que si la metadata est présente.
 *
 * Exemple : `@Roles(Role.ADMIN)`
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
