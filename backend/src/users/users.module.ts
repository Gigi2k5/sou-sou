import { Module } from '@nestjs/common';

import { AvatarUnlocksModule } from '../avatar-unlocks/avatar-unlocks.module';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OnboardingService } from './onboarding.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AvatarUnlocksModule, GamificationModule, NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService, OnboardingService],
  exports: [UsersService, OnboardingService],
})
export class UsersModule {}
