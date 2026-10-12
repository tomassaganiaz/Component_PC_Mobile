import { IsUUID, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PaymentWebhookDto {
  @ApiProperty({ example: "3f1e2d4c-...-uuid" })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({ example: "payment.succeeded" })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({ example: "mock_abc123" })
  @IsOptional()
  @IsString()
  externalId?: string;
}
