import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatCheckDto {
  @ApiProperty({ example: 'Hola, ¿seguís teniendo la RTX? Te pago por transferencia directa' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}