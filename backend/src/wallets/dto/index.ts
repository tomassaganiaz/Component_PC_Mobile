import { IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class RequestPayoutDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;
}
