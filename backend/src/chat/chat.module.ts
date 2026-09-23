import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatSafetyService } from './chat-safety.service';

@Module({
  controllers: [ChatController],
  providers: [ChatSafetyService],
})
export class ChatModule {}