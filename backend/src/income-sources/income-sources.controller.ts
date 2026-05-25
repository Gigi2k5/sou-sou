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
import { CreateIncomeSourceDto } from './dto/create-income-source.dto';
import { UpdateIncomeSourceDto } from './dto/update-income-source.dto';
import { IncomeSourcesService } from './income-sources.service';

@ApiTags('income-sources')
@ApiCookieAuth('access_token')
@Controller('income-sources')
export class IncomeSourcesController {
  constructor(private readonly service: IncomeSourcesService) {}

  @Get()
  @ApiOperation({ summary: "Lister les sources de revenu de l'utilisateur" })
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une source de revenu' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateIncomeSourceDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renommer une source de revenu' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateIncomeSourceDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Supprimer une source de revenu (les transactions liées gardent l'historique)",
  })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.remove(user.id, id);
  }
}
