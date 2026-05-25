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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminUsersService } from './admin-users.service';
import { BanUserDto } from './dto/ban-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('admin')
@ApiCookieAuth('access_token')
@UseGuards(AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée des utilisateurs (admin only).' })
  list(@Query() query: ListAdminUsersDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Détail d'un utilisateur + stats agrégées + timeline 20 actions.",
  })
  getDetail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getDetail(id);
  }

  @Patch(':id/ban')
  @ApiOperation({ summary: 'Bannir un utilisateur (révoque ses tokens).' })
  ban(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: BanUserDto,
  ) {
    return this.service.ban(admin.id, id, dto.reason);
  }

  @Patch(':id/unban')
  @ApiOperation({ summary: 'Débannir un utilisateur.' })
  unban(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.unban(admin.id, id);
  }

  @Patch(':id/role')
  @ApiOperation({
    summary: "Changer le rôle (USER/ADMIN). Refuse si dernier admin.",
  })
  updateRole(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.service.updateRole(admin.id, id, dto.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Supprimer un compte (RGPD) — soft-delete + scrub PII + cascade ciblé.',
  })
  remove(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeleteUserDto,
  ) {
    return this.service.remove(admin.id, id, dto.confirmEmail);
  }
}
