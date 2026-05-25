import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateIncomeSourceDto {
  @ApiProperty({ example: 'Salaire principal' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
}
