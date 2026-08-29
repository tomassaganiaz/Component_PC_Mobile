import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Verification, VerificationResult } from './verification.entity';
import { CreateVerificationDto } from './dto';
import { ProductsService } from '../products/products.service';
import { ProductCondition, ProductStatus } from '../products/product.entity';

@Injectable()
export class VerificationsService {
  constructor(
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    private readonly productsService: ProductsService,
  ) {}

  async create(createVerificationDto: CreateVerificationDto, verifiedBy: string): Promise<Verification> {
    const product = await this.productsService.findOne(createVerificationDto.productId);

    if (product.condition !== ProductCondition.USED) {
      throw new BadRequestException('Solo se pueden verificar productos usados');
    }

    const verification = this.verificationRepository.create({
      ...createVerificationDto,
      verifiedBy,
    });

    const savedVerification = await this.verificationRepository.save(verification);

    const newStatus = createVerificationDto.result === VerificationResult.PASS
      ? ProductStatus.VERIFIED
      : ProductStatus.DRAFT;

    await this.productsService.update(product.id, {
      status: newStatus,
      hoursOfUse: createVerificationDto.hoursOfUse,
      physicalState: createVerificationDto.physicalState,
    });

    return savedVerification;
  }

  async findByProduct(productId: string): Promise<Verification[]> {
    return this.verificationRepository.find({
      where: { productId },
      relations: ['verifier'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Verification> {
    const verification = await this.verificationRepository.findOne({
      where: { id },
      relations: ['product', 'verifier'],
    });

    if (!verification) {
      throw new NotFoundException('Verificación no encontrada');
    }

    return verification;
  }
}
