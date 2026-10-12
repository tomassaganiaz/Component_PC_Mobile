import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Shipment } from "./shipment.entity";
import { ShippingService } from "./shipping.service";
import { ShippingController } from "./shipping.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Shipment])],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
