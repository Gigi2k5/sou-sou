import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AvatarUnlocksModule } from './avatar-unlocks/avatar-unlocks.module';
import { BudgetsModule } from './budgets/budgets.module';
import { MascotModule } from './mascot/mascot.module';
import { MoneyPotsModule } from './money-pots/money-pots.module';
import { EmailModule } from './email/email.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { GamificationModule } from './gamification/gamification.module';
import { IncomeSourcesModule } from './income-sources/income-sources.module';
import { InsightsModule } from './insights/insights.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecapModule } from './recap/recap.module';
import { RecurringTransactionsModule } from './recurring-transactions/recurring-transactions.module';
import { ReportsModule } from './reports/reports.module';
import { ResourcesModule } from './resources/resources.module';
import { SavingsGoalModule } from './savings-goal/savings-goal.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    AdminModule,
    AvatarUnlocksModule,
    AuthModule,
    UsersModule,
    IncomeSourcesModule,
    ExpenseCategoriesModule,
    TransactionsModule,
    NotificationsModule,
    GamificationModule,
    SavingsGoalModule,
    ArticlesModule,
    ResourcesModule,
    MoneyPotsModule,
    RecapModule,
    RecurringTransactionsModule,
    ReportsModule,
    MascotModule,
    BudgetsModule,
    InsightsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
