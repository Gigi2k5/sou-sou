import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Modifications autorisées : nom, description, montant cible, deadline.
 * Le toggle `isGroup` n'est PAS modifiable après création (changer un solo
 * en groupe nécessiterait un code, l'inverse retirerait des membres — on
 * garde simple et explicite : on supprime + recrée si besoin).
 */
export class UpdateMoneyPotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1_000_000_000)
  targetAmount?: number;

  @ApiPropertyOptional({ description: 'Null pour retirer la deadline' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;
}
