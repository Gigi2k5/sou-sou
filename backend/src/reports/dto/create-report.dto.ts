import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason, ReportTarget } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ enum: ReportTarget })
  @IsEnum(ReportTarget)
  targetType!: ReportTarget;

  @ApiProperty({ description: "ID de la cible (article, commentaire, user)." })
  @IsUUID()
  targetId!: string;

  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason!: ReportReason;

  @ApiPropertyOptional({
    description: 'Description libre (optionnelle).',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;
}
