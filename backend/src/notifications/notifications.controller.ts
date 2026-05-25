import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiCookieAuth('access_token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Mes notifications (paginées, plus récentes en haut)',
  })
  list(@CurrentUser() user: AuthUser, @Query() query: ListNotificationsDto) {
    return this.service.list(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de notifs non lues (pour le badge)' })
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.service.unreadCount(user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Tout marquer comme lu' })
  markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.service.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notif comme lue' })
  markAsRead(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.markAsRead(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une notif' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.remove(user.id, id);
  }
}
