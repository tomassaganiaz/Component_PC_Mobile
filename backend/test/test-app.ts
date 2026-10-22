import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

/** Crea la app Nest real contra la base de datos de test (ver setup-env.ts). */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api", {
    exclude: [{ path: "/", method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

export interface TestUser {
  token: string;
  id: string;
}

/** Registra (si hace falta) e inicia sesión, resolviendo el flujo de OTP. */
export async function registerAndLogin(
  app: INestApplication,
  opts: {
    name: string;
    email: string;
    password?: string;
    role?: "buyer" | "seller" | "admin";
  },
): Promise<TestUser> {
  const password = opts.password ?? "password123";
  const reg = await request(app.getHttpServer())
    .post("/api/auth/register")
    .send({ name: opts.name, email: opts.email, password, role: opts.role });

  const login = await request(app.getHttpServer())
    .post("/api/auth/login")
    .send({ email: opts.email, password });

  if (login.body?.requiresOtp) {
    const otp = await request(app.getHttpServer())
      .post("/api/auth/otp/request")
      .send({ otpToken: login.body.otpToken });
    const verify = await request(app.getHttpServer())
      .post("/api/auth/otp/verify")
      .send({ otpToken: login.body.otpToken, code: otp.body.code });
    return { token: verify.body.access_token, id: reg.body?.id };
  }

  return { token: login.body.access_token, id: reg.body?.id };
}
