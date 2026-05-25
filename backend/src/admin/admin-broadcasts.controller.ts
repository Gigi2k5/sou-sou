import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminBroadcastsService } from './admin-broadcasts.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { PreviewBroadcastDto } from './dto/preview-broadcast.dto';

@ApiTags('admin')
@ApiCookieAuth('access_token')
@UseGuards(AdminGuard)
@Controller('admin/broadcasts')
export class AdminBroadcastsController {
  constructor(private readonly service: AdminBroadcastsService) {}

  @Get()
  @ApiOperation({ summary: "Historique des broadcasts (paginé)." })
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(
      page ? Math.max(1, Number(page)) : 1,
      limit ? Math.min(200, Math.max(1, Number(limit))) : 20,
    );
  }

  @Post('preview')
  @ApiOperation({
    summary:
      "Compte le nombre de destinataires d'un segment sans rien envoyer.",
  })
  preview(@Body() dto: PreviewBroadcastDto) {
    return this.service.preview(dto.segment);
  }

  @Post()
  @ApiOperation({
    summary:
      "Envoie un broadcast — crée le broadcast + bulk notifications.",
  })
  create(@CurrentUser() admin: AuthUser, @Body() dto: CreateBroadcastDto) {
    return this.service.create(admin.id, dto);
  }
}
