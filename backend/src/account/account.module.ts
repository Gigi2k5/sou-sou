import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AccountController } from './account.controller';
import { AccountExportService } from './account-export.service';
import { AccountPurgeService } from './account-purge.service';
import { AccountService } from './account.service';

@Module({
  imports: [AuthModule],
  controllers: [AccountController],
  providers: [AccountService, AccountPurgeService, AccountExportService],
  // `AccountPurgeService` est exporté pour que l'administration s'en serve :
  // une seule implémentation de la suppression, donc aucune divergence possible.
  exports: [AccountPurgeService],
})
export class AccountModule {}
