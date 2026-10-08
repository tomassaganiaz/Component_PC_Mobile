import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const nodeEnv = configService.get('NODE_ENV', 'development');
  const jwtSecret = configService.get('JWT_SECRET');
  if (nodeEnv === 'production') {
    const weak =
      !jwtSecret ||
      jwtSecret === 'default_secret' ||
      jwtSecret.includes('your_super_secret') ||
      jwtSecret.length < 32;
    if (weak) {
      logger.error(
        'JWT_SECRET inválido para producción: usá un secreto aleatorio de al menos 32 caracteres.',
      );
      process.exit(1);
    }
  }

  // Global prefix
  app.setGlobalPrefix('api', { exclude: [{ path: '/', method: RequestMethod.GET }] });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ERS API')
    .setDescription('API para plataforma de compra y venta de componentes PC y móviles')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Autenticación y registro')
    .addTag('Users', 'Gestión de usuarios')
    .addTag('Products', 'Productos (nuevos y usados)')
    .addTag('Orders', 'Órdenes de compra')
    .addTag('Verifications', 'Verificación de productos usados')
    .addTag('Reviews', 'Reseñas y quejas')
    .addTag('Analytics', 'Eventos de analytics')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  logger.log(`Application running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
