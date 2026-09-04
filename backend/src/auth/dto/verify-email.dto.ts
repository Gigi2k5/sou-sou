import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'charbel@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '482193',
    description: 'Code à 6 chiffres reçu par email',
  })
  @IsString()
  // On accepte un peu de mou (espaces / tirets collés) — `normalizeVerificationCode`
  // fait le ménage et rejette proprement si le format ne tient pas.
  @Length(6, 12)
  code!: string;
}
