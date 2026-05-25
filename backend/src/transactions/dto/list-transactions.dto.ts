import { ApiPropertyOptional } from '@nestjs/swagger';
import { TxType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListTransactionsDto {
  @ApiPropertyOptional({ enum: TxType })
  @IsOptional()
  @IsEnum(TxType)
  type?: TxType;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ example: '2026-04-30T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class SummaryQueryDto {
  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ example: '2026-04-30T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
