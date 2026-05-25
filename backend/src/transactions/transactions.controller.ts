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
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import {
  ListTransactionsDto,
  SummaryQueryDto,
} from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiCookieAuth('access_token')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les transactions (filtres + pagination)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListTransactionsDto) {
    return this.service.list(user.id, query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Totaux et breakdown par source/catégorie sur une période',
  })
  summary(@CurrentUser() user: AuthUser, @Query() query: SummaryQueryDto) {
    return this.service.summary(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une transaction (revenu ou dépense)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransactionDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une transaction' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une transaction' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.remove(user.id, id);
  }
}
