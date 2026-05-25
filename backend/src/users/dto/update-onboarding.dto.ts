import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * PATCH /users/me/onboarding
 *
 * 2 utilisations :
 *   - Mettre à jour la step en cours : `{ step: 2 }`
 *   - Marquer comme complété : `{ completed: true }`  → +50 pts + badge WELCOME
 *
 * Les deux peuvent être combinés mais en pratique le front envoie l'un ou l'autre.
 */
export class UpdateOnboardingDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  step?: number;

  @ApiPropertyOptional({
    description:
      'Marquer l’onboarding comme complété. Idempotent : si déjà complété, no-op (pas de double bonus).',
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
