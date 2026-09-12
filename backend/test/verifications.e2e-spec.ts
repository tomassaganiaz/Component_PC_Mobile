import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('Verifications (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let sellerToken: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(TypeOrmModule)
      .useModule(
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      });

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Seller User',
        email: 'seller@example.com',
        password: 'password123',
        role: 'seller',
      });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = adminLogin.body.access_token;

    const sellerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'seller@example.com', password: 'password123' });
    sellerToken = sellerLogin.body.access_token;

    const createProductResponse = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Used GPU for Verification',
        description: 'GPU used for testing',
        price: 300,
        condition: 'used',
        category: 'gpu',
      });
    productId = createProductResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/verifications', () => {
    it('should create a verification as admin', () => {
      return request(app.getHttpServer())
        .post('/api/verifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId,
          result: 'pass',
          notes: 'Product verified successfully',
          hoursOfUse: 500,
          physicalState: 'Good',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.result).toEqual('pass');
          expect(res.body.verifiedBy).toEqual('admin@example.com');
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/verifications')
        .send({
          productId,
          result: 'pass',
          notes: 'Test',
        })
        .expect(401);
    });

    it('should fail with non-admin role', () => {
      return request(app.getHttpServer())
        .post('/api/verifications')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          productId,
          result: 'pass',
          notes: 'Test',
        })
        .expect(403);
    });
  });

  describe('GET /api/verifications/product/:productId', () => {
    it('should return verifications for a product', () => {
      return request(app.getHttpServer())
        .get(`/api/verifications/product/${productId}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });
  });

  describe('GET /api/verifications/:id', () => {
    it('should return verification by id', () => {
      return request(app.getHttpServer())
        .get(`/api/verifications/${productId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
        });
    });
  });
});
