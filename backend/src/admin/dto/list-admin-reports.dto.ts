import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReportReason, ReportStatus, ReportTarget } from '@prisma/client';

export enum AdminReportTab {
  ALL = 'all',
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export class ListAdminReportsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 20;

  @ApiPropertyOptional({ enum: AdminReportTab, default: AdminReportTab.PENDING })
  @IsOptional()
  @IsEnum(AdminReportTab)
  tab: AdminReportTab = AdminReportTab.PENDING;

  @ApiPropertyOptional({ enum: ReportTarget })
  @IsOptional()
  @IsEnum(ReportTarget)
  targetType?: ReportTarget;

  @ApiPropertyOptional({ enum: ReportReason })
  @IsOptional()
  @IsEnum(ReportReason)
  reason?: ReportReason;

  @ApiPropertyOptional({
    enum: ReportStatus,
    description:
      "Override fin du filtre par tab — si fourni, prend le pas sur tab.",
  })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
