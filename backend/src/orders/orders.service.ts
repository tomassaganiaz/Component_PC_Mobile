import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly productsService: ProductsService,
  ) {}

  async create(createOrderDto: CreateOrderDto, buyerId: string): Promise<Order> {
    const product = await this.productsService.findOne(createOrderDto.productId);

    if (product.status === 'sold') {
      throw new BadRequestException('El producto ya fue vendido');
    }

    const order = this.orderRepository.create({
      ...createOrderDto,
      buyerId,
      total: product.price,
    });

    const savedOrder = await this.orderRepository.save(order);

    await this.productsService.update(product.id, { status: 'sold' as any });

    return savedOrder;
  }

  async findByBuyer(buyerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { buyerId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['buyer', 'product'],
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    Object.assign(order, updateOrderDto);
    return this.orderRepository.save(order);
  }

  async cancel(id: string): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Solo se pueden cancelar órdenes pendientes');
    }

    order.status = OrderStatus.CANCELLED;
    await this.productsService.update(order.productId, { status: 'published' as any });

    return this.orderRepository.save(order);
  }
}
