import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Au-delà, l'écran de revue devient impraticable et l'écriture trop longue. */
export const MAX_IMPORT_LINES = 2_000;

/** Garde-fou de bon sens : 1 milliard FCFA sur une ligne, c'est une erreur. */
export const MAX_LINE_AMOUNT = 1_000_000_000;

export class ImportLineDto {
  @ApiProperty({ example: '2026-08-01' })
  @IsISO8601({ strict: false })
  date!: string;

  @ApiProperty({ example: 'Zem' })
  @IsString()
  @MaxLength(280)
  label!: string;

  @ApiProperty({ example: 1000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1)
  amount!: number;

  @ApiProperty({ enum: ['income', 'expense'] })
  @IsIn(['income', 'expense'])
  direction!: 'income' | 'expense';

  @ApiPropertyOptional({
    description:
      "Catégorie de dépense ou source de revenu. Créée si elle n'existe pas.",
    example: 'Déplacement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;
}

export class CommitImportDto {
  @ApiProperty({ type: [ImportLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_LINES)
  @ValidateNested({ each: true })
  @Type(() => ImportLineDto)
  lines!: ImportLineDto[];

  @ApiPropertyOptional({ example: 'Août 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  periodLabel?: string;

  @ApiPropertyOptional({
    description: 'Total des entrées annoncé par le document source.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredIncomeTotal?: number;

  @ApiPropertyOptional({
    description: 'Total des sorties annoncé par le document source.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredExpenseTotal?: number;
}
