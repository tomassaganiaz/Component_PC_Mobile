import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository, MoreThan } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from '../users/dto';
import * as bcrypt from 'bcrypt';

const OTP_TTL_MS = 5 * 60 * 1000;

export interface LoginSuccess {
  access_token: string;
  refresh_token: string;
  user: { id: string; name: string; email: string; role: string };
}

export interface OtpChallenge {
  requiresOtp: true;
  otpToken: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
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

  private accessPayload(user: User) {
    return { sub: user.id, email: user.email, role: user.role };
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const refreshExp = this.configService.get('JWT_REFRESH_EXPIRATION', '30d');
    const refresh = this.jwtService.sign(
      { sub: userId, purpose: 'refresh', jti: randomUUID() },
      { expiresIn: refreshExp },
    );
    const payload = this.jwtService.decode(refresh) as { exp: number };
    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId,
        tokenHash: hashToken(refresh),
        expiresAt: new Date(payload.exp * 1000),
        revoked: false,
      }),
    );
    return refresh;
  }

  async buildSuccess(user: User): Promise<LoginSuccess> {
    const access_token = this.jwtService.sign(this.accessPayload(user));
    const refresh_token = await this.issueRefreshToken(user.id);
    return {
      access_token,
      refresh_token,
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

  private async revokeToken(refresh: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { tokenHash: hashToken(refresh) },
      { revoked: true },
    );
  }

  async refresh(refreshToken: string): Promise<LoginSuccess> {
    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload.purpose !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const stored = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash: hashToken(refreshToken),
        revoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });
    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido o revocado');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Rotación: se revoca el usado y se emite un par nuevo
    await this.revokeToken(refreshToken);
    return this.buildSuccess(user);
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    await this.revokeToken(refreshToken);
    return { success: true };
  }

  async getProfile(userId: string) {
    return this.usersService.findOne(userId);
  }

  /** Verifica que un usuario siga activo (para JwtStrategy). */
  async assertActiveUser(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user || user.isActive === false || user.deletedAt) {
      throw new UnauthorizedException('Usuario inactivo o no encontrado');
    }
    return user;
  }
}