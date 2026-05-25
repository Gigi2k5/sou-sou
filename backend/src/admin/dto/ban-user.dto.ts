import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class BanUserDto {
  @ApiProperty({
    description: 'Raison du bannissement, visible par l\'admin et stockée en log.',
    minLength: 3,
    maxLength: 280,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(280)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason!: string;
}
