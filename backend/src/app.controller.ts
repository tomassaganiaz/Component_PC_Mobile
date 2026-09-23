import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Información general de la API' })
  root() {
    return {
      name: 'ERS API',
      description: 'API para plataforma de compra y venta de componentes PC y móviles',
      status: 'online',
      endpoints: {
        docs: '/api/docs',
        login: '/api/auth/login',
        register: '/api/auth/register',
        products: '/api/products',
      },
    };
  }
}