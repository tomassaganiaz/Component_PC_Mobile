import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatSafetyService } from './chat-safety.service';
import { ChatCheckDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatSafetyService: ChatSafetyService) {}

  @Post('safety-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analizar mensaje del chat por seguridad (links, contactos, pago fuera de custodia)' })
  safetyCheck(@Body() dto: ChatCheckDto) {
    return this.chatSafetyService.check(dto.text);
  }
}