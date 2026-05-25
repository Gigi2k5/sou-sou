import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { MascotQueryDto } from './dto/mascot-query.dto';
import { MascotService } from './mascot.service';

@ApiTags('mascot')
@ApiCookieAuth('access_token')
@Controller('mascot')
export class MascotController {
  constructor(private readonly service: MascotService) {}

  @Get('message')
  @ApiOperation({
    summary:
      "Retourne un message contextuel pour la mascotte selon l'état de l'user (10 règles de priorité).",
  })
  message(@CurrentUser() user: AuthUser, @Query() query: MascotQueryDto) {
    return this.service.build(user.id, query.context);
  }
}
