import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { AnalyzeImportDto } from './dto/analyze-import.dto';
import { CommitImportDto } from './dto/commit-import.dto';
import { ImportService } from './import.service';

@ApiTags('import')
@ApiCookieAuth('access_token')
@Controller('import')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  /**
   * Chaque appel consomme du quota chez le fournisseur d'IA. La limite est
   * donc nettement plus basse que le 100/min global de l'application : elle
   * protège le budget, pas le serveur.
   */
  @Post('analyze')
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({
    summary:
      "Analyser des notes collées et renvoyer les transactions comprises. N'écrit rien.",
  })
  analyze(@CurrentUser() user: AuthUser, @Body() dto: AnalyzeImportDto) {
    return this.service.analyze(user.id, dto);
  }

  @Post('commit')
  @ApiOperation({
    summary:
      "Écrire les lignes validées par l'utilisateur dans un lot annulable.",
  })
  commit(@CurrentUser() user: AuthUser, @Body() dto: CommitImportDto) {
    return this.service.commit(user.id, dto);
  }

  @Get('batches')
  @ApiOperation({ summary: 'Lister les imports passés' })
  listBatches(@CurrentUser() user: AuthUser) {
    return this.service.listBatches(user.id);
  }

  @Delete('batches/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Annuler un import — supprime toutes ses transactions',
  })
  undo(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.undo(user.id, id);
  }
}
