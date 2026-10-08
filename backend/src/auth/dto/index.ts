import { IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ description: 'Token OTP emitido por el login en dos pasos' })
  @IsString()
  otpToken: string;
}

export class VerifyOtpDto {
  @ApiProperty({ description: 'Token OTP emitido por el login en dos pasos' })
  @IsString()
  otpToken: string;

  @ApiProperty({ description: 'Código de 6 dígitos', example: '482913' })
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token emitido al iniciar sesión' })
  @IsString()
  @MinLength(20)
  @MaxLength(500)
  refreshToken: string;
}