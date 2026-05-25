import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class JoinMoneyPotDto {
  @ApiProperty({ example: 'A2B3C4' })
  @IsString()
  @Length(6, 6)
  inviteCode!: string;
}
