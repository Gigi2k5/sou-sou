import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminStatsService } from './admin-stats.service';

@ApiTags('admin')
@ApiCookieAuth('access_token')
@UseGuards(AdminGuard)
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Vue d\'ensemble pour le tableau de bord admin (4 KPIs + 2 séries 30j + activités récentes).',
  })
  overview() {
    return this.stats.overview();
  }
}
