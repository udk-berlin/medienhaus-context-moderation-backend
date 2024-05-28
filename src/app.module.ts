import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email/email.service';
import { MatrixService } from './matrix/matrix.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, EmailService, MatrixService],
})
export class AppModule {
  constructor(
    private readonly emailService: EmailService,
    private readonly matrixService: MatrixService,
  ) {
    this.emailService.init().catch(() => {
      process.exit(1);
    });
    this.matrixService.startClient().catch(() => {
      process.exit(1);
    });
  }
}
