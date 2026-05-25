import { ApiProperty } from '@nestjs/swagger';
import { BroadcastSegment } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class PreviewBroadcastDto {
  @ApiProperty({ enum: BroadcastSegment })
  @IsEnum(BroadcastSegment)
  segment!: BroadcastSegment;
}
