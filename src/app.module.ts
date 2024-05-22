import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email/email.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, EmailService],
})
export class AppModule {
  constructor(private readonly emailService: EmailService) {
    this.emailService.init().catch(() => {
      process.exit(1);
    });
  }
}
