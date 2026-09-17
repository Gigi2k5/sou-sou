import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Plafond de texte accepté. ~60 000 caractères représentent largement un an de
 * notes manuscrites ; au-delà, c'est soit un fichier à découper, soit un abus.
 * La limite protège le quota d'API autant que le temps de réponse.
 */
export const MAX_IMPORT_CHARS = 60_000;

export class AnalyzeImportDto {
  @ApiProperty({
    description: "Notes brutes collées par l'utilisateur.",
    example: 'Samedi 01/08/2026\nZem = 1000\nRiz = 1350\nTotal = 2350',
  })
  @IsString()
  @MinLength(10, {
    message: 'Le texte collé est trop court pour être analysé.',
  })
  @MaxLength(MAX_IMPORT_CHARS, {
    message: `Le texte dépasse ${MAX_IMPORT_CHARS} caractères. Découpe-le par mois.`,
  })
  text!: string;

  @ApiPropertyOptional({
    enum: ['DMY', 'MDY'],
    description:
      "Format des dates ambiguës, quand l'utilisateur l'a confirmé après une première analyse.",
  })
  @IsOptional()
  @IsIn(['DMY', 'MDY'])
  dateFormat?: 'DMY' | 'MDY';
}
