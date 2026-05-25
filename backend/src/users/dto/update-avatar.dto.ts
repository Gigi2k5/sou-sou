import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({
    enum: ['preset', 'upload', 'remove'],
    description:
      "preset = un des 8 avatars fournis ; upload = data URL base64 ; remove = retirer l'avatar.",
  })
  @IsIn(['preset', 'upload', 'remove'])
  type!: 'preset' | 'upload' | 'remove';

  @ApiProperty({
    description:
      'Si type=preset : nom du preset (ex "pig-green"). Si type=upload : data URL complète. Ignoré si type=remove (peut être chaîne vide).',
    example: 'pig-green',
  })
  @IsString()
  @MaxLength(2_900_000) // ~2 MB en base64 (+ overhead encoding)
  value!: string;
}
