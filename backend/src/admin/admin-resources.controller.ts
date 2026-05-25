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
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  type AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateResourceDto } from '../resources/dto/create-resource.dto';
import { AdminResourcesService } from './admin-resources.service';
import { ReorderResourcesDto } from './dto/reorder-resources.dto';
import { UpdateAdminResourceDto } from './dto/update-admin-resource.dto';

@ApiTags('admin')
@ApiCookieAuth('access_token')
@UseGuards(AdminGuard)
@Controller('admin/resources')
export class AdminResourcesController {
  constructor(private readonly service: AdminResourcesService) {}

  @Get()
  @ApiOperation({
    summary: 'Liste complète des ressources avec position et addedBy.',
  })
  list() {
    return this.service.list();
  }

  @Post()
  @ApiOperation({ summary: 'Ajouter une vidéo YouTube (avec preview oEmbed).' })
  create(@CurrentUser() admin: AuthUser, @Body() dto: CreateResourceDto) {
    return this.service.create(admin.id, dto);
  }

  @Patch('reorder')
  @ApiOperation({
    summary: 'Réordonner les ressources via un tableau ordonné d\'IDs.',
  })
  reorder(@CurrentUser() admin: AuthUser, @Body() dto: ReorderResourcesDto) {
    return this.service.reorder(admin.id, dto.ids);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour catégorie / description / isFeatured.',
  })
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAdminResourceDto,
  ) {
    return this.service.update(admin.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une ressource.' })
  remove(
    @CurrentUser() admin: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.remove(admin.id, id);
  }
}
