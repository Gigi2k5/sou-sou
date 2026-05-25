import { Module } from '@nestjs/common';

import { NotificationsCron } from './notifications.cron';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsCron],
  exports: [NotificationsService],
})
export class NotificationsModule {}
