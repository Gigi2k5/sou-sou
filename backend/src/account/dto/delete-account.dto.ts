import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  /**
   * Le mot de passe, redemandé alors que la personne est déjà connectée.
   *
   * Ce n'est pas de la paperasse : une session volée — téléphone prêté, poste
   * partagé, cookie dérobé — suffirait sinon à détruire des mois de données
   * d'un seul appel. Le mot de passe est la seule chose que le voleur de session
   * n'a pas.
   */
  @ApiProperty({ description: 'Mot de passe actuel, pour confirmer.' })
  @IsString()
  @MinLength(1, { message: 'Entre ton mot de passe pour confirmer.' })
  password!: string;
}
