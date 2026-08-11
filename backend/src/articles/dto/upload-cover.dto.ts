import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UploadCoverDto {
  @ApiProperty({
    description: 'Image en data URL base64 (data:image/...;base64,...)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...',
  })
  @IsString()
  @Matches(/^data:image\/(jpeg|png|webp);base64,/, {
    message: 'Attendu une data URL base64 JPG, PNG ou WEBP',
  })
  dataUrl!: string;
}
