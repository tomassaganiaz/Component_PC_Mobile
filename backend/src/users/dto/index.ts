import {
  IsString,
  IsEmail,
  IsOptional,
  IsIn,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "../user.entity";

export class CreateUserDto {
  @ApiProperty({ example: "Juan PǸrez" })
  @IsString()
  name: string;

  @ApiProperty({ example: "juan@email.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: "+54 11 1234-5678" })
  @IsOptional()
  @IsString()
  phone?: string;

  // El registro público solo permite comprador/vendedor: los admins se crean
  // por otro camino (evita la escalada de rol al registrarse).
  @ApiPropertyOptional({
    enum: [UserRole.BUYER, UserRole.SELLER],
    default: UserRole.BUYER,
  })
  @IsOptional()
  @IsIn([UserRole.BUYER, UserRole.SELLER])
  role?: UserRole;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class LoginDto {
  @ApiProperty({ example: "juan@email.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  password: string;
}
