import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { Order } from "./order.entity";
import { ProductsModule } from "../products/products.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CouponsModule } from "../coupons/coupons.module";
import { CartModule } from "../cart/cart.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    ProductsModule,
    NotificationsModule,
    CouponsModule,
    CartModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
