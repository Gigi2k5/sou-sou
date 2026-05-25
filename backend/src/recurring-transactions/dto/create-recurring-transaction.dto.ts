import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TxType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRecurringTransactionDto {
  @ApiProperty({ enum: TxType, example: TxType.EXPENSE })
  @IsEnum(TxType)
  type!: TxType;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(1_000_000_000)
  amount!: number;

  @ApiProperty({
    example: 1,
    description:
      'Jour du mois (1..31). Clampé si > daysInMonth (ex: 31 → 28/29/30).',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth!: number;

  @ApiPropertyOptional({ example: 'Loyer mensuel' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
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
