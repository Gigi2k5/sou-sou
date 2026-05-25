import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class HideArticleDto {
  @ApiProperty({
    description: "Raison du masquage — visible dans l'AdminLog et la notif auteur.",
    minLength: 3,
    maxLength: 280,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(280)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason!: string;
}
