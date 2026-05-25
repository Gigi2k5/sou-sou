import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Modifications autorisées : montant, jour, note, refs, isActive (pause/resume).
 * Le `type` n'est pas modifiable (changer INCOME→EXPENSE casse la sémantique
 * de la source/catégorie liée).
 */
export class UpdateRecurringTransactionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(1_000_000_000)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(140)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  incomeSourceId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  expenseCategoryId?: string | null;

  @ApiPropertyOptional({ description: 'Pause / reprise sans suppression' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
