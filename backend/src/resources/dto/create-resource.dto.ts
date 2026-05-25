import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({
    example: 'https://www.youtube.com/watch?v=PBXlWHpYaYY',
  })
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  youtubeUrl!: string;

  @ApiPropertyOptional({ example: 'Investissement' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @ApiPropertyOptional({ example: 'Pour démarrer en 5 minutes.' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;
}
