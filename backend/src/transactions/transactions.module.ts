import { Module } from '@nestjs/common';

import { AvatarUnlocksModule } from '../avatar-unlocks/avatar-unlocks.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TransactionHooksService } from './transaction-hooks.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    AvatarUnlocksModule,
    BudgetsModule,
    GamificationModule,
    NotificationsModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionHooksService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
