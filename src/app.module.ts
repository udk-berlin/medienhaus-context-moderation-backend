import { Module, OnApplicationShutdown } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email/email.service';
import { MatrixService } from './matrix/matrix.service';
import { FileLoggerService } from './file-logger/file-logger.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, EmailService, MatrixService],
})
export class AppModule implements OnApplicationShutdown {
  private readonly logger = new FileLoggerService(MatrixService.name);

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

  onApplicationShutdown(signal?: string) {
    this.logger.log(
      `app shutting down (signal: ${signal}) $$$$$$$$$$$$$$$$$$$`,
    );
  }
}
