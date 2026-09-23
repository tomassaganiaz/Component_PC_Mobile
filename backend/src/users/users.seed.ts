import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

const SEED_EMAIL = 'owner22@gmail.com';
const SEED_PASSWORD = 'owner123';

@Injectable()
export class UsersSeed implements OnModuleInit {
  private readonly logger = new Logger(UsersSeed.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    const exists = await this.userRepository.findOne({ where: { email: SEED_EMAIL } });
    if (exists) {
      if (!exists.otpEnabled) {
        exists.otpEnabled = true;
        await this.userRepository.save(exists);
        this.logger.log(`OTP habilitado para la cuenta de prueba: ${SEED_EMAIL}`);
      } else {
        this.logger.log(`Cuenta de prueba ya existente: ${SEED_EMAIL}`);
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
    await this.userRepository.save(
      this.userRepository.create({
        email: SEED_EMAIL,
        name: 'Owner Test',
        password: hashedPassword,
        role: UserRole.ADMIN,
        acceptsTesting: true,
        otpEnabled: true,
      }),
    );
    this.logger.log(`Cuenta de prueba creada: ${SEED_EMAIL} (owner / admin)`);
  }
}