import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FileLoggerService } from './file-logger/file-logger.service';

async function bootstrap() {
  const logger = new FileLoggerService('bootstrap');
  logger.log('#####################################################');

  const app = await NestFactory.create(AppModule);

  logger.log('CONFIGURATION --------');
  logger.log(`PORT: ${process.env.PORT}`);
  logger.log(`MATRIX_SERVER_URL: ${process.env.MATRIX_SERVER_URL}`);
  logger.log('----------------------');
  logger.log(`Running on http://localhost:${process.env.PORT}`);

  await app.listen(process.env.PORT);
}
bootstrap();
