import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FileLoggerService } from './file-logger/file-logger.service';

async function bootstrap() {
  const logger = new FileLoggerService('bootstrap');
  logger.log('#####################################################');

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  logger.log('CONFIGURATION --------');
  logger.log(`PORT: ${process.env.PORT}`);
  logger.log(`TEST_MODE: ${process.env.TEST_MODE}`);
  logger.log(`TEST_EMAIL_RECIPIENT: ${process.env.TEST_EMAIL_RECIPIENT}`);
  logger.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
  logger.log(`MATRIX_SERVER_URL: ${process.env.MATRIX_SERVER_URL}`);
  logger.log(
    `EMAIL_DIGEST_INTERVAL_MINUTES: ${process.env.EMAIL_DIGEST_INTERVAL_MINUTES}`,
  );
  logger.log(`LAST_DIGEST_TS_FILE: ${process.env.LAST_DIGEST_TS_FILE}`);
  logger.log('----------------------');
  logger.log(`Running on http://localhost:${process.env.PORT}`);

  await app.listen(process.env.PORT);
}

bootstrap();
