import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIncomeSourceDto {
  @ApiProperty({ example: 'Salaire' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
}
