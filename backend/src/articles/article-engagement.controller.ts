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
import { ArticleCommentsService } from './article-comments.service';
import { ArticleLikesService } from './article-likes.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('articles')
@ApiCookieAuth('access_token')
@Controller('articles')
export class ArticleEngagementController {
  constructor(
    private readonly likes: ArticleLikesService,
    private readonly comments: ArticleCommentsService,
  ) {}

  // -- Likes -----------------------------------------------------------------

  @Get(':id/like')
  @ApiOperation({
    summary: "Statut du like de l'utilisateur courant + count global.",
  })
  getLikeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.likes.getStatus(user.id, id);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Liker un article (idempotent, refuse self-like)' })
  like(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.likes.like(user.id, id);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Unliker un article (idempotent)' })
  unlike(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.likes.unlike(user.id, id);
  }

  // -- Comments --------------------------------------------------------------

  @Get(':id/comments')
  @ApiOperation({ summary: "Lister les commentaires d'un article (paginé)" })
  listComments(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ListCommentsDto,
  ) {
    return this.comments.list(user, id, query);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Ajouter un commentaire' })
  createComment(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(user.id, id, dto);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Modifier son propre commentaire' })
  updateComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.comments.update(user, commentId, dto);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un commentaire (auteur ou admin)' })
  removeComment(
    @CurrentUser() user: AuthUser,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
  ) {
    return this.comments.remove(user, commentId);
  }
}
