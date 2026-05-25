import { Module } from '@nestjs/common';

import { SavingsGoalController } from './savings-goal.controller';
import { SavingsGoalService } from './savings-goal.service';

@Module({
  controllers: [SavingsGoalController],
  providers: [SavingsGoalService],
  exports: [SavingsGoalService],
})
export class SavingsGoalModule {}
