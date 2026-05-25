import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateTransactionDto {
  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ example: '2026-04-29T12:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @ApiPropertyOptional({ example: 'Mise à jour' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  incomeSourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  expenseCategoryId?: string;
}
