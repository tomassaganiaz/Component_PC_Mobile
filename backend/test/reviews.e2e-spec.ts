import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('Reviews (e2e)', () => {
  let app: INestApplication;
  let buyerToken: string;
  let sellerToken: string;
  let adminToken: string;
  let productId: string;
  let orderId: string;

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
        name: 'Buyer User',
        email: 'buyer@example.com',
        password: 'password123',
        role: 'buyer',
      });

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Seller User',
        email: 'seller@example.com',
        password: 'password123',
        role: 'seller',
      });

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      });

    const buyerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'buyer@example.com', password: 'password123' });
    buyerToken = buyerLogin.body.access_token;

    const sellerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'seller@example.com', password: 'password123' });
    sellerToken = sellerLogin.body.access_token;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = adminLogin.body.access_token;

    const createProductResponse = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Product for Review',
        description: 'Test product for reviews',
        price: 200,
        condition: 'used',
        category: 'gpu',
      });
    productId = createProductResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/reviews', () => {
    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/reviews')
        .send({
          productId,
          orderId: 'nonexistent-order',
          rating: 5,
          type: 'positive',
        })
        .expect(401);
    });

    it('should return 400 for invalid review data', () => {
      return request(app.getHttpServer())
        .post('/api/reviews')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId,
          orderId: 'nonexistent-order',
          rating: 5,
          type: 'positive',
        })
        .expect(400);
    });
  });

  describe('GET /api/reviews', () => {
    it('should return reviews list', () => {
      return request(app.getHttpServer())
        .get('/api/reviews')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });
  });

  describe('GET /api/reviews/product/:productId', () => {
    it('should return reviews for a product', () => {
      return request(app.getHttpServer())
        .get(`/api/reviews/product/${productId}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });
  });

  describe('GET /api/reviews/seller/:sellerId', () => {
    it('should return reviews for a seller', () => {
      return request(app.getHttpServer())
        .get('/api/reviews/seller/seller@example.com')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });
  });

  describe('GET /api/reviews/trust-badge/:sellerId', () => {
    it('should return trust badge for a seller', () => {
      return request(app.getHttpServer())
        .get('/api/reviews/trust-badge/seller@example.com')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('badge');
        });
    });
  });

  describe('GET /api/reviews/stats/:sellerId', () => {
    it('should return seller stats', () => {
      return request(app.getHttpServer())
        .get('/api/reviews/stats/seller@example.com')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalSales');
        });
    });
  });

  describe('GET /api/reviews/:id', () => {
    it('should return 404 for non-existent review', () => {
      return request(app.getHttpServer())
        .get('/api/reviews/nonexistent-id')
        .expect(404);
    });
  });
});
