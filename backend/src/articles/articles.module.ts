import { Module } from '@nestjs/common';

import { AvatarUnlocksModule } from '../avatar-unlocks/avatar-unlocks.module';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ArticleCommentsService } from './article-comments.service';
import { ArticleEngagementController } from './article-engagement.controller';
import { ArticleLikesService } from './article-likes.service';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [AvatarUnlocksModule, GamificationModule, NotificationsModule],
  controllers: [ArticlesController, ArticleEngagementController],
  providers: [ArticlesService, ArticleLikesService, ArticleCommentsService],
  exports: [ArticlesService, ArticleLikesService, ArticleCommentsService],
})
export class ArticlesModule {}
