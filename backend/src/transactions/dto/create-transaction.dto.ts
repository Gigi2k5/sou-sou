import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TxType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ enum: TxType })
  @IsEnum(TxType)
  type!: TxType;

  @ApiProperty({ example: 1500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-04-29T12:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  date!: Date;

  @ApiPropertyOptional({ example: 'Repas avec Justine' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;

  @ApiPropertyOptional({ example: 'uuid-source-de-revenu' })
  @IsOptional()
  @IsUUID()
  incomeSourceId?: string;

  @ApiPropertyOptional({ example: 'uuid-categorie-depense' })
  @IsOptional()
  @IsUUID()
  expenseCategoryId?: string;
}
