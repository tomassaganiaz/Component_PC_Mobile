import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsSeed } from './products.seed';
import { Product } from './product.entity';
import { Review } from '../reviews/review.entity';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Review, Order, User])],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsSeed],
  exports: [ProductsService],
})
export class ProductsModule {}
