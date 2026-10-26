import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Shipment } from "./shipment.entity";
import { Order } from "../orders/order.entity";
import { ShippingService } from "./shipping.service";
import { ShippingController } from "./shipping.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Shipment, Order])],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
