import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class ResolveReportDto {
  @ApiPropertyOptional({
    enum: ReportStatus,
    description:
      "Nouveau statut. Pour passer de PENDING vers REVIEWING/RESOLVED/REJECTED.",
  })
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @ApiPropertyOptional({
    description: "Note libre de l'admin sur la résolution (max 500 chars).",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  adminNote?: string;
}
