import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSavingsGoalDto {
  @ApiProperty({ example: 'Voyage à Marrakech' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @ApiProperty({ example: 500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  targetAmount!: number;

  @ApiProperty({ example: 5000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  dailyAmount!: number;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  @Type(() => Date)
  @IsDate()
  deadline!: Date;
}
