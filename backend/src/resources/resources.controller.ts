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
import { Role } from '@prisma/client';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ListResourcesDto } from './dto/list-resources.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesService } from './resources.service';

@ApiTags('resources')
@ApiCookieAuth('access_token')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lister les vidéos (filtre catégorie optionnel) + catégories existantes',
  })
  list(@Query() query: ListResourcesDto) {
    return this.service.list(query);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ajouter une vidéo YouTube (admin)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateResourceDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Mettre à jour catégorie / description (admin)',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une vidéo (admin)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
