import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { TokensService } from '../auth/tokens.service';
import { AccountExportService } from './account-export.service';
import { AccountService } from './account.service';
import { DeleteAccountDto } from './dto/delete-account.dto';

@ApiTags('account')
@ApiCookieAuth('access_token')
@Controller('account')
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly exporter: AccountExportService,
    private readonly tokens: TokensService,
  ) {}

  /**
   * Copie intégrale, en JSON.
   *
   * Limité à quelques appels par heure : la requête balaie une dizaine de
   * tables et n'a aucune raison d'être répétée en boucle.
   */
  @Get('export')
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Télécharger toutes ses données (JSON)' })
  async exportJson(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const data = await this.exporter.collect(user.id);
    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', 'application/json; charset=utf-8')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="sousou-donnees-${stamp()}.json"`,
      )
      .send(JSON.stringify(data, null, 2));
  }

  /**
   * Suppression du compte par son propriétaire.
   *
   * Les cookies sont effacés dans la foulée : sans ça le navigateur garderait
   * une session pointant vers un compte anonymisé, et l'application afficherait
   * des erreurs incompréhensibles jusqu'à la prochaine déconnexion.
   */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Supprimer définitivement son compte' })
  async deleteMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.account.deleteOwnAccount(user.id, dto.password);
    this.tokens.clearAuthCookies(res);
  }
}

/** `2026-09-19`, pour que plusieurs exports ne se recouvrent pas. */
function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}
