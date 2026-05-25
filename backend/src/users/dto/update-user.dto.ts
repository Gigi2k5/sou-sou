import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum UserTheme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Charbel N.' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ enum: UserTheme })
  @IsOptional()
  @IsEnum(UserTheme)
  theme?: UserTheme;
}
