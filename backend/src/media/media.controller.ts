import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { MediaService } from "./media.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Media")
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("upload")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Subir imagen de producto (multipart)" })
  upload(@UploadedFile() file: any) {
    return this.mediaService.saveUpload(file);
  }

  @Get("image")
  @ApiOperation({
    summary: "Optimiza y sirve una imagen remota (resize + WebP + caché)",
  })
  async image(
    @Query("url") url: string,
    @Query("w") w: string,
    @Query("q") q: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.mediaService.getOptimized(
      url,
      Number(w) || 400,
      Number(q) || 72,
    );
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  }
}
