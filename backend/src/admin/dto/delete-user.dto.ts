import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class DeleteUserDto {
  @ApiProperty({
    description:
      'Email du user à supprimer — saisi dans la modale de confirmation pour éviter les fausses manips.',
  })
  @IsEmail()
  confirmEmail!: string;
}
