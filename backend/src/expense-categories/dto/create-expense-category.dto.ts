import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Courses' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
}
