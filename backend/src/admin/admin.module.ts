import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { User } from "../users/user.entity";
import { Product } from "../products/product.entity";
import { Order } from "../orders/order.entity";
import { Review } from "../reviews/review.entity";
import { Report } from "../reports/report.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, Order, Review, Report])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
