import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { AvatarUnlocksService } from './avatar-unlocks.service';

@Module({
  imports: [NotificationsModule],
  providers: [AvatarUnlocksService],
  exports: [AvatarUnlocksService],
})
export class AvatarUnlocksModule {}
