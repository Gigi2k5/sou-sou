import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminArticleTab {
  ALL = 'all',
  REPORTED = 'reported',
  HIDDEN = 'hidden',
}

export class ListAdminArticlesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Recherche dans titre + nom auteur.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ enum: AdminArticleTab, default: AdminArticleTab.ALL })
  @IsOptional()
  @IsEnum(AdminArticleTab)
  tab: AdminArticleTab = AdminArticleTab.ALL;
}
