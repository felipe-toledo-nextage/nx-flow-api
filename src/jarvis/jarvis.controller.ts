import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JarvisService } from './jarvis.service';

@Controller('jarvis')
@UseGuards(JwtAuthGuard)
export class JarvisController {
  constructor(private readonly jarvisService: JarvisService) {}

  @Post('ask')
  async askJarvis(
    @Body() body: { message: string; projectId: string; projectContext: any },
    @CurrentUser() user: any
  ) {
    try {
      const response = await this.jarvisService.processMessage({
        message: body.message,
        projectId: body.projectId,
        projectContext: body.projectContext,
        user
      });

      return {
        message: response,
        success: true
      };
    } catch (error) {
      console.error('Erro no Jarvis Controller:', error);
      return {
        message: 'Desculpe, não consegui processar sua solicitação no momento.',
        success: false
      };
    }
  }
}