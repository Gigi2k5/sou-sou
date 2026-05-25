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
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
import { RecurringTransactionsService } from './recurring-transactions.service';

@ApiTags('recurring-transactions')
@ApiCookieAuth('access_token')
@Controller('recurring-transactions')
export class RecurringTransactionsController {
  constructor(private readonly service: RecurringTransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister mes récurrences' })
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une récurrence (mensuelle, day-of-month)' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRecurringTransactionDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier une récurrence (montant, jour, pause...)',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRecurringTransactionDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer une récurrence (les transactions générées restent)',
  })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.remove(user.id, id);
  }
}
