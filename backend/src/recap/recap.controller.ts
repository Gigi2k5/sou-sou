import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { RecapQueryDto } from './dto/recap-query.dto';
import { RecapService } from './recap.service';

@ApiTags('recap')
@ApiCookieAuth('access_token')
@Controller('recap')
export class RecapController {
  constructor(private readonly service: RecapService) {}

  @Get()
  @ApiOperation({
    summary:
      "Récap de l'activité (épargne + cotisations) sur 7 ou 30 j glissants, avec delta vs période précédente.",
  })
  build(@CurrentUser() user: AuthUser, @Query() query: RecapQueryDto) {
    return this.service.build(user.id, query.period);
  }
}
