import { Body, Controller, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiCookieAuth('access_token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post()
  @ApiOperation({
    summary: 'Signaler un contenu (article, plus tard commentaire/user).',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    return this.service.create(user.id, dto);
  }
}
