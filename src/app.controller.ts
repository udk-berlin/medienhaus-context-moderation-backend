import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { EmailService } from './email/email.service';
import EmailTestDto from './dtos/EmailTestDto';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // TODO: remove
  @Post('test/email')
  testEmail(@Body() emailTestDto: EmailTestDto): string {
    try {
      this.emailService.sendEmail(
        emailTestDto.to,
        emailTestDto.subject || 'subject',
        emailTestDto.text || 'content',
      );
      return 'success';
    } catch (err) {
      return err.toString();
    }
  }
}
