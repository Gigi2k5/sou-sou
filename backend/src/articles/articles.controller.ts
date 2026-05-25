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
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('articles')
@ApiCookieAuth('access_token')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les articles (paginé)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListArticlesDto) {
    return this.service.list(user, query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Lire un article par son slug' })
  getBySlug(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.service.getBySlug(user, slug);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un article (auto-publié)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateArticleDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un article (auteur ou admin)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un article (auteur ou admin)' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.remove(user, id);
  }
}
