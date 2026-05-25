import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderResourcesDto {
  @ApiProperty({
    description:
      "Ordre complet des ressources (UUIDs). L'index dans le tableau définit la position finale.",
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids!: string[];
}
