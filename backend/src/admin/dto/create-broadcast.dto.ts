import { ApiProperty } from '@nestjs/swagger';
import { BroadcastSegment } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBroadcastDto {
  @ApiProperty({ minLength: 3, maxLength: 80 })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  body!: string;

  @ApiProperty({ enum: BroadcastSegment })
  @IsEnum(BroadcastSegment)
  segment!: BroadcastSegment;
}
