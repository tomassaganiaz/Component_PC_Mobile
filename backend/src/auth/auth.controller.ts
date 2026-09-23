import { Controller, Post, Body, Get, Patch, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../users/dto';
import { CreateUserDto } from '../users/dto';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequestOtpDto, VerifyOtpDto } from './dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión (devuelve challenge OTP si el usuario lo tiene activo)' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('otp/request')
  @ApiOperation({ summary: 'Solicitar código OTP para el segundo factor' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.otpToken);
  }

  @Post('otp/verify')
  @ApiOperation({ summary: 'Verificar código OTP y completar el login' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.otpToken, dto.code);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  getProfile(@Request() req: ExpressRequest) {
    return this.authService.getProfile((req.user as any).id);
  }

  @Patch('verify-phone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar teléfono como verificado (KYC ligero)' })
  verifyPhone(@Request() req: ExpressRequest) {
    return this.usersService.verifyPhone((req.user as any).id);
  }

  @Patch('verify-identity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar identidad/documento como verificado (KYC ligero, demo)' })
  verifyIdentity(@Request() req: ExpressRequest) {
    return this.usersService.verifyIdentity((req.user as any).id);
  }
}