import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdminResourceDto {
  @ApiPropertyOptional({ example: 'Investissement' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  category?: string;

  @ApiPropertyOptional({ example: 'Pour démarrer en 5 minutes.' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({ description: 'Mettre en avant (badge + tri prioritaire).' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
