import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { AccountPurgeService } from './account-purge.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purger: AccountPurgeService,
  ) {}

  /**
   * Suppression demandée par la personne elle-même.
   *
   * L'ordre des vérifications compte : on confirme l'identité AVANT d'annoncer
   * qu'une cotisation bloque. Sinon quiconque met la main sur une session
   * apprend gratuitement de quels groupes la personne fait partie.
   */
  async deleteOwnAccount(userId: string, password: string): Promise<void> {
    const user = await this.purger.loadLive(userId);

    const ok =
      user.password !== '' && (await bcrypt.compare(password, user.password));
    if (!ok) {
      throw new UnauthorizedException(
        "Mot de passe incorrect. Ton compte n'a pas été supprimé.",
      );
    }

    await this.purger.assertDeletable(userId);

    await this.prisma.$transaction(async (tx) => {
      // `bannedBy` reçoit son propre identifiant : c'est ce qui distingue, plus
      // tard, un départ volontaire d'une exclusion par l'administration.
      await this.purger.purge(tx, userId, userId);
    });
  }
}
