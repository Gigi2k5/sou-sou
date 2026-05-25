import { Module } from '@nestjs/common';

import { AdminGuard } from '../auth/guards/admin.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminArticlesController } from './admin-articles.controller';
import { AdminArticlesService } from './admin-articles.service';
import { AdminBroadcastsController } from './admin-broadcasts.controller';
import { AdminBroadcastsService } from './admin-broadcasts.service';
import { AdminLogService } from './admin-log.service';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminResourcesController } from './admin-resources.controller';
import { AdminResourcesService } from './admin-resources.service';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    AdminStatsController,
    AdminUsersController,
    AdminArticlesController,
    AdminResourcesController,
    AdminReportsController,
    AdminBroadcastsController,
  ],
  providers: [
    AdminLogService,
    AdminGuard,
    AdminStatsService,
    AdminUsersService,
    AdminArticlesService,
    AdminResourcesService,
    AdminReportsService,
    AdminBroadcastsService,
  ],
  exports: [AdminLogService, AdminGuard],
})
export class AdminModule {}
