import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
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

    // Register and login to get token
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Product Seller',
        email: 'seller@example.com',
        password: 'password123',
        role: 'seller',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'seller@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/products', () => {
    it('should create a product', () => {
      return request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'RTX 3080 Ti',
          description: 'Tarjeta gráfica en excelente estado para gaming',
          price: 450.0,
          condition: 'used',
          category: 'gpu',
          brand: 'NVIDIA',
          model: 'RTX 3080 Ti',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toEqual('RTX 3080 Ti');
          expect(res.body.price).toEqual(450);
          productId = res.body.id;
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/products')
        .send({
          title: 'Test Product',
          description: 'Test description for product',
          price: 100,
          condition: 'new',
          category: 'cpu',
        })
        .expect(401);
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          price: -10,
        })
        .expect(400);
    });
  });

  describe('GET /api/products', () => {
    it('should return products list', () => {
      return request(app.getHttpServer())
        .get('/api/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    it('should filter by category', () => {
      return request(app.getHttpServer())
        .get('/api/products?category=gpu')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    it('should filter by price range', () => {
      return request(app.getHttpServer())
        .get('/api/products?minPrice=100&maxPrice=500')
        .expect(200);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a product by id', () => {
      return request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(productId);
          expect(res.body.title).toEqual('RTX 3080 Ti');
        });
    });

    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .get('/api/products/nonexistent-id')
        .expect(404);
    });
  });

  describe('PATCH /api/products/:id', () => {
    it('should update a product', () => {
      return request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'RTX 3080 Ti Updated',
          price: 500,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toEqual('RTX 3080 Ti Updated');
          expect(res.body.price).toEqual(500);
        });
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product', () => {
      return request(app.getHttpServer())
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 404 after deletion', () => {
      return request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .expect(404);
    });
  });
});
