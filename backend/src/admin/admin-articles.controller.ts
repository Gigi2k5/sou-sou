import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminArticlesService } from './admin-articles.service';
import { HideArticleDto } from './dto/hide-article.dto';
import { ListAdminArticlesDto } from './dto/list-admin-articles.dto';
import { WarnAuthorDto } from './dto/warn-author.dto';

@ApiTags('admin')
@ApiCookieAuth('access_token')
@UseGuards(AdminGuard)
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly service: AdminArticlesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Liste paginée des articles avec onglets (all/reported/hidden) — admin only.',
  })
  list(@Query() query: ListAdminArticlesDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Détail d'un article + signalements associés (admin only).",
  })
  getDetail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getDetail(id);
  }

  @Patch(':id/hide')
  @ApiOperation({
    summary:
      "Masquer un article (caché du public, l'auteur le voit toujours).",
  })
  hide(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: HideArticleDto,
  ) {
    return this.service.hide(admin.id, id, dto.reason);
  }

  @Patch(':id/unhide')
  @ApiOperation({ summary: 'Démasquer un article.' })
  unhide(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.unhide(admin.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Supprimer définitivement un article (notifie l'auteur).",
  })
  remove(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: HideArticleDto,
  ) {
    return this.service.remove(admin.id, id, dto.reason);
  }

  @Post(':id/warn')
  @ApiOperation({
    summary:
      "Avertir l'auteur sans masquer ni supprimer — envoie une notification.",
  })
  warn(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: WarnAuthorDto,
  ) {
    return this.service.warnAuthor(admin.id, id, dto.message);
  }
}
