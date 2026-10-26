import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { ProductsSeed } from "./products.seed";
import { Product } from "./product.entity";
import { ProductVariation } from "./product-variation.entity";
import { Review } from "../reviews/review.entity";
import { Order } from "../orders/order.entity";
import { User } from "../users/user.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { FavoritesModule } from "../favorites/favorites.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariation, Review, Order, User]),
    NotificationsModule,
    FavoritesModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsSeed],
  exports: [ProductsService],
})
export class ProductsModule {}
