import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum InsightsPeriod {
  CURRENT_MONTH = 'current_month',
  LAST_MONTH = 'last_month',
  LAST_3_MONTHS = 'last_3_months',
  LAST_6_MONTHS = 'last_6_months',
}

export class InsightsQueryDto {
  @ApiPropertyOptional({
    enum: InsightsPeriod,
    default: InsightsPeriod.CURRENT_MONTH,
  })
  @IsOptional()
  @IsEnum(InsightsPeriod)
  period: InsightsPeriod = InsightsPeriod.CURRENT_MONTH;
}
