import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({ example: '5 astuces pour épargner sans se priver' })
  @IsString()
  @MinLength(5)
  @MaxLength(180)
  title!: string;

  @ApiProperty({
    example: '# Mon astuce préférée\n\nMettre 10% de son salaire de côté...',
  })
  @IsString()
  @MinLength(20)
  content!: string;

  @ApiPropertyOptional({
    description: 'Extrait court. Auto-généré depuis le contenu si absent.',
    example: "Trois leviers concrets que j'utilise au quotidien.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  excerpt?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  coverImage?: string;
}
