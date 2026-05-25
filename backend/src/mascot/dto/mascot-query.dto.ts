import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum MascotContext {
  DASHBOARD = 'dashboard',
  SAVINGS = 'savings',
  RECAP = 'recap',
}

export class MascotQueryDto {
  @ApiPropertyOptional({
    enum: MascotContext,
    default: MascotContext.DASHBOARD,
  })
  @IsOptional()
  @IsEnum(MascotContext)
  context: MascotContext = MascotContext.DASHBOARD;
}
