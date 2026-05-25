import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { InsightsQueryDto } from './dto/insights-query.dto';
import { InsightsService } from './insights.service';

@ApiTags('insights')
@ApiCookieAuth('access_token')
@Controller('insights')
export class InsightsController {
  constructor(
    private readonly service: InsightsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Analyses : top catégories, évolution 6 mois, comparaison vs précédent, répartition par jour/semaine + 3-5 phrases auto-générées.',
  })
  async get(@CurrentUser() user: AuthUser, @Query() query: InsightsQueryDto) {
    // Récupère la devise pour formatter les phrases d'insights côté backend.
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { currency: true },
    });
    return this.service.getInsights(
      user.id,
      query.period,
      u?.currency ?? 'FCFA',
    );
  }
}
