import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum RecapPeriod {
  WEEK = 'week',
  MONTH = 'month',
}

export class RecapQueryDto {
  @ApiPropertyOptional({ enum: RecapPeriod, default: RecapPeriod.WEEK })
  @IsOptional()
  @IsEnum(RecapPeriod)
  period: RecapPeriod = RecapPeriod.WEEK;
}
