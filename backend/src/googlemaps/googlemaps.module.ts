import { Module } from "@nestjs/common";
import { GoogleMapsService } from "./googlemaps.service";
import { GoogleMapsController } from "./googlemaps.controller";
import { User } from "../users/user.entity";
import { Product } from "../products/product.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductsModule } from "../products/products.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([User, Product]), ProductsModule, UsersModule],
  controllers: [GoogleMapsController],
  providers: [GoogleMapsService],
  exports: [GoogleMapsService],
})
export class GoogleMapsModule {}