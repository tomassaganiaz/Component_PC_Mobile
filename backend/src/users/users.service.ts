import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    delete (savedUser as any).password;
    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'name',
        'role',
        'acceptsTesting',
        'phoneVerified',
        'documentVerified',
        'otpEnabled',
        'otpCode',
        'otpExpiresAt',
      ],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async setOtpCode(id: string, code: string, expiresAt: Date): Promise<User> {
    const user = await this.findOne(id);
    user.otpCode = code;
    user.otpExpiresAt = expiresAt;
    return this.userRepository.save(user);
  }

  async clearOtpCode(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.otpCode = null;
    user.otpExpiresAt = null;
    return this.userRepository.save(user);
  }

  async verifyPhone(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.phoneVerified = true;
    return this.userRepository.save(user);
  }

  async verifyIdentity(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.documentVerified = true;
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.softRemove(user);
  }
}
