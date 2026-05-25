import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { GamificationService } from './gamification.service';

@ApiTags('gamification')
@ApiCookieAuth('access_token')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly service: GamificationService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Stats de gamification : points, streak, badges débloqués',
  })
  me(@CurrentUser() user: AuthUser) {
    return this.service.getStats(user.id);
  }

  @Get('badges')
  @ApiOperation({
    summary: "Liste de tous les badges (flag `unlocked` + date d'obtention)",
  })
  badges(@CurrentUser() user: AuthUser) {
    return this.service.listBadges(user.id);
  }
}
