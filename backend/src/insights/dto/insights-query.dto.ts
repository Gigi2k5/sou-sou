import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum InsightsPeriod {
  CURRENT_MONTH = 'current_month',
  LAST_MONTH = 'last_month',
  LAST_3_MONTHS = 'last_3_months',
  LAST_6_MONTHS = 'last_6_months',
}

export class InsightsQueryDto {
  @ApiPropertyOptional({
    enum: InsightsPeriod,
    default: InsightsPeriod.CURRENT_MONTH,
  })
  @IsOptional()
  @IsEnum(InsightsPeriod)
  period: InsightsPeriod = InsightsPeriod.CURRENT_MONTH;

  /**
   * Recule la période de N mois. 0 = aujourd'hui, -4 = « il y a quatre mois ».
   *
   * Les quatre périodes sont toutes ancrées sur le présent, ce qui rendait tout
   * historique ancien inconsultable — exactement le problème rencontré avec
   * l'import : des données de mai importées en septembre n'apparaissaient nulle
   * part. Plutôt que d'ajouter des périodes figées, on décale le point de
   * référence : `current_month` avec -4 devient « mai 2026 », et les
   * comparaisons « vs période précédente » suivent naturellement.
   */
  @ApiPropertyOptional({ minimum: -120, maximum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-120)
  @Max(0)
  monthOffset = 0;
}
