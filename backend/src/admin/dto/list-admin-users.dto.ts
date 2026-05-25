import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum UserStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

export enum UserSortBy {
  CREATED_AT = 'createdAt',
  LAST_LOGIN_AT = 'lastLoginAt',
  TOTAL_POINTS = 'totalPoints',
  NAME = 'name',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListAdminUsersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Recherche dans nom + email (case insensitive).' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ enum: UserStatusFilter })
  @IsOptional()
  @IsEnum(UserStatusFilter)
  status?: UserStatusFilter;

  @ApiPropertyOptional({ description: 'Code devise exact (ex: FCFA, EUR).' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: UserSortBy, default: UserSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(UserSortBy)
  sortBy: UserSortBy = UserSortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
