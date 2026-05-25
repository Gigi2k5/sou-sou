import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'charbel@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Charbel' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ example: 'unMotDePasseSolide123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
