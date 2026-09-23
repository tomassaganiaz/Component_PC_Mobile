import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { LoginDto } from '../users/dto';
import * as bcrypt from 'bcrypt';

const OTP_TTL_MS = 5 * 60 * 1000;

export interface LoginSuccess {
  access_token: string;
  user: { id: string; name: string; email: string; role: string };
}

export interface OtpChallenge {
  requiresOtp: true;
  otpToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    delete (user as any).password;
    delete (user as any).otpCode;
    delete (user as any).otpExpiresAt;
    return user;
  }

  private buildSuccess(user: User): LoginSuccess {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<LoginSuccess | OtpChallenge> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (user.otpEnabled) {
      const otpToken = this.jwtService.sign(
        { sub: user.id, purpose: 'otp' },
        { expiresIn: '5m' },
      );
      return { requiresOtp: true, otpToken };
    }

    return this.buildSuccess(user);
  }

  async requestOtp(otpToken: string): Promise<{ otpSent: boolean; code: string }> {
    const payload = this.jwtService.verify(otpToken);
    if (payload.purpose !== 'otp') {
      throw new BadRequestException('Token inválido');
    }

    const user = await this.usersService.findOne(payload.sub);
    const code = String(Math.floor(100000 + Math.random() * 900000));

    await this.usersService.setOtpCode(user.id, code, new Date(Date.now() + OTP_TTL_MS));

    // Demo: no hay SMS/email, se devuelve el código para poder probar el flujo
    return { otpSent: true, code };
  }

  async verifyOtp(otpToken: string, code: string): Promise<LoginSuccess> {
    const payload = this.jwtService.verify(otpToken);
    if (payload.purpose !== 'otp') {
      throw new BadRequestException('Token inválido');
    }

    const user = await this.usersService.findOne(payload.sub);

    if (!user.otpCode || user.otpCode !== code) {
      throw new UnauthorizedException('Código OTP incorrecto');
    }

    if (!user.otpExpiresAt || new Date(user.otpExpiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('El código OTP expiró');
    }

    await this.usersService.clearOtpCode(user.id);

    return this.buildSuccess(user);
  }

  async getProfile(userId: string) {
    return this.usersService.findOne(userId);
  }
}