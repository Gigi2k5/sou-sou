import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminReportsService } from './admin-reports.service';
import { ListAdminReportsDto } from './dto/list-admin-reports.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@ApiTags('admin')
@ApiCookieAuth('access_token')
@UseGuards(AdminGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly service: AdminReportsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Liste paginée des signalements + comptes par statut (admin only).',
  })
  list(@Query() query: ListAdminReportsDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      "Détail d'un signalement avec preview de la cible (article/user/comment).",
  })
  getDetail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getDetail(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Mettre à jour le statut (REVIEWING/RESOLVED/REJECTED) + note admin.',
  })
  resolve(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.service.resolve(admin.id, id, dto);
  }
}
