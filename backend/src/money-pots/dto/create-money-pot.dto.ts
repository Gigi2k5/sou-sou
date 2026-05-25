import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMoneyPotDto {
  @ApiProperty({ example: 'Anniversaire de Aïcha' })
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({ example: 'Cadeau commun à offrir le 15 mai' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1_000_000_000)
  targetAmount!: number;

  @ApiPropertyOptional({
    description: 'Date limite optionnelle (ISO 8601)',
    example: '2026-05-15T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;

  @ApiPropertyOptional({
    description:
      "Si true, génère un code d'invitation et autorise plusieurs membres.",
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isGroup?: boolean;
}
