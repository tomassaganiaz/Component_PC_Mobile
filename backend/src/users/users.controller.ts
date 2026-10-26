import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto, UpdateUserDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { User, UserRole } from "./user.entity";

type AuthedRequest = ExpressRequest & { user: { id: string; role: string } };

/** Nunca se exponen datos sensibles del usuario en respuestas HTTP. */
function sanitizeUser(
  user: User,
): Omit<User, "password" | "otpCode" | "otpExpiresAt" | "pushToken"> {
  const safe: Partial<User> = { ...user };
  delete safe.password;
  delete safe.otpCode;
  delete safe.otpExpiresAt;
  delete safe.pushToken;
  return safe as Omit<
    User,
    "password" | "otpCode" | "otpExpiresAt" | "pushToken"
  >;
}

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Crear usuario (solo admin)" })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener todos los usuarios (solo admin)" })
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map(sanitizeUser);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtener usuario por ID (dueño o admin)" })
  async findOne(@Param("id") id: string, @Request() req: AuthedRequest) {
    this.assertSelfOrAdmin(id, req);
    const user = await this.usersService.findOne(id);
    return sanitizeUser(user);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Actualizar usuario (dueño o admin)" })
  async update(
    @Param("id") id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: AuthedRequest,
  ) {
    this.assertSelfOrAdmin(id, req);
    const user = await this.usersService.update(id, updateUserDto);
    return sanitizeUser(user);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Eliminar usuario (dueño o admin)" })
  async remove(@Param("id") id: string, @Request() req: AuthedRequest) {
    this.assertSelfOrAdmin(id, req);
    await this.usersService.remove(id);
    return { success: true };
  }

  private assertSelfOrAdmin(id: string, req: AuthedRequest): void {
    const user = req.user;
    if (!user || (user.role !== UserRole.ADMIN && user.id !== id)) {
      throw new ForbiddenException("No podés acceder a datos de otro usuario");
    }
  }
}
