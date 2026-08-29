import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from './product.entity';
import { CreateProductDto, UpdateProductDto, FilterProductDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto, sellerId: string): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      sellerId,
    });
    return this.productRepository.save(product);
  }

  async findAll(filters?: FilterProductDto): Promise<Product[]> {
    const query = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('product.status = :status', { status: ProductStatus.PUBLISHED });

    if (filters?.category) {
      query.andWhere('product.category = :category', { category: filters.category });
    }

    if (filters?.condition) {
      query.andWhere('product.condition = :condition', { condition: filters.condition });
    }

    if (filters?.minPrice) {
      query.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters?.maxPrice) {
      query.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    if (filters?.search) {
      query.andWhere(
        '(product.title ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.orderBy('product.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['seller', 'verifications'],
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async findBySeller(sellerId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.softRemove(product);
  }
}
