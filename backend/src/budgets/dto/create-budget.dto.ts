import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'ID de la catégorie de dépense (kind=FREE uniquement).',
  })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ minimum: 1, example: 50000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monthlyLimit!: number;

  @ApiPropertyOptional({
    description: "Seuil d'alerte (0.5 à 0.95). Défaut 0.8 (80%).",
    minimum: 0.5,
    maximum: 0.95,
    default: 0.8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(0.95)
  alertThreshold?: number;
}
