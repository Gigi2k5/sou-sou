import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { CreateMoneyPotDto } from './dto/create-money-pot.dto';
import { JoinMoneyPotDto } from './dto/join-money-pot.dto';
import { UpdateMoneyPotDto } from './dto/update-money-pot.dto';
import { MoneyPotsService } from './money-pots.service';

@ApiTags('money-pots')
@ApiCookieAuth('access_token')
@Controller('money-pots')
export class MoneyPotsController {
  constructor(private readonly service: MoneyPotsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lister mes cotisations (solo + groupe)' })
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user.id);
  }

  @Post()
  @ApiOperation({
    summary:
      "Créer une cotisation. `isGroup:true` génère un code d'invitation.",
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMoneyPotDto) {
    return this.service.create(user.id, dto);
  }

  @Post('join')
  @ApiOperation({ summary: 'Rejoindre une cotisation groupe via son code' })
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinMoneyPotDto) {
    return this.service.join(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une cotisation + membres + leaderboard" })
  getDetail(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.getDetail(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une cotisation (owner uniquement)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateMoneyPotDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une cotisation (owner uniquement)' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.remove(user.id, id);
  }

  @Delete(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Quitter une cotisation groupe (membre non-owner)',
  })
  leave(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.leave(user.id, id);
  }

  @Get(':id/contributions')
  @ApiOperation({
    summary:
      'Historique des contributions (Transactions liées aux catégories du pot).',
  })
  listContributions(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.listContributions(user.id, id);
  }
}
