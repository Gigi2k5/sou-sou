import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a1b2c3...' })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;

  @ApiProperty({ example: 'unNouveauMotDePasseSolide123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
