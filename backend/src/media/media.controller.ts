import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('image')
  @ApiOperation({ summary: 'Optimiza y sirve una imagen remota (resize + WebP + caché)' })
  async image(
    @Query('url') url: string,
    @Query('w') w: string,
    @Query('q') q: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.mediaService.getOptimized(
      url,
      Number(w) || 400,
      Number(q) || 72,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}