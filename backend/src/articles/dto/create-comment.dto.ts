import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Très bon article, merci !',
    description:
      'Plain text — pas de markdown. Le front auto-link les URLs au rendu.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}
