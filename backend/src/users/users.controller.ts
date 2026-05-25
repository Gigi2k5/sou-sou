import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { AvatarUnlocksService } from '../avatar-unlocks/avatar-unlocks.service';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { OnboardingService } from './onboarding.service';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth('access_token')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly avatarUnlocks: AvatarUnlocksService,
    private readonly onboarding: OnboardingService,
  ) {}

  @Patch('me')
  @ApiOperation({ summary: 'Mettre à jour son profil (nom, devise)' })
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateUserDto) {
    return { user: await this.users.update(user.id, dto) };
  }

  @Get('me/avatars')
  @ApiOperation({
    summary:
      'Liste des 8 avatars avec leur statut (débloqué, progression, condition).',
  })
  async listMyAvatars(@CurrentUser() user: AuthUser) {
    return { avatars: await this.avatarUnlocks.listForUser(user.id) };
  }

  @Patch('me/avatar')
  @ApiOperation({
    summary:
      'Mettre à jour son avatar : preset débloqué, upload (data URL), ou remove.',
  })
  async updateMyAvatar(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAvatarDto,
  ) {
    return { user: await this.users.updateAvatar(user.id, dto) };
  }

  @Get('me/onboarding')
  @ApiOperation({ summary: 'Récupérer l’état d’onboarding de l’utilisateur.' })
  async getOnboarding(@CurrentUser() user: AuthUser) {
    return this.onboarding.getState(user.id);
  }

  @Patch('me/onboarding')
  @ApiOperation({
    summary:
      'Mettre à jour la step en cours et/ou marquer l’onboarding comme complété (+50 pts + badge WELCOME).',
  })
  async updateOnboarding(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.onboarding.update(user.id, dto);
  }
}
