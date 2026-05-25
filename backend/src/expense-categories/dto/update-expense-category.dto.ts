import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateExpenseCategoryDto {
  @ApiProperty({ example: 'Courses & alimentation' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
}
