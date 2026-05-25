import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { MoneyPotsController } from './money-pots.controller';
import { MoneyPotsService } from './money-pots.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MoneyPotsController],
  providers: [MoneyPotsService],
  exports: [MoneyPotsService],
})
export class MoneyPotsModule {}
