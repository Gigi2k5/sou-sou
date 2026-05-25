import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';
import { SavingsGoalService } from './savings-goal.service';

@ApiTags('savings-goal')
@ApiCookieAuth('access_token')
@Controller('savings-goal')
export class SavingsGoalController {
  constructor(private readonly service: SavingsGoalService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer mon objectif d'épargne" })
  getMine(@CurrentUser() user: AuthUser) {
    return this.service.getMine(user.id);
  }

  @Post()
  @ApiOperation({ summary: "Créer mon objectif d'épargne (1 par user)" })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSavingsGoalDto) {
    return this.service.create(user.id, dto);
  }

  @Patch()
  @ApiOperation({ summary: "Modifier mon objectif d'épargne" })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateSavingsGoalDto) {
    return this.service.update(user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer mon objectif (les contributions partent avec)',
  })
  remove(@CurrentUser() user: AuthUser) {
    return this.service.remove(user.id);
  }

  @Get('contributions')
  @ApiOperation({
    summary:
      'Lister les Transactions liées à la catégorie SAVINGS (historique).',
  })
  listContributions(@CurrentUser() user: AuthUser) {
    return this.service.listContributions(user.id);
  }
}
