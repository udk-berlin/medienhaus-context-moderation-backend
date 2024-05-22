import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger('bootstrap');
  logger.log('CONFIGURATION --------');
  logger.log(`PORT: ${process.env.PORT}`);
  logger.log(`MATRIX_SERVER_URL: ${process.env.MATRIX_SERVER_URL}`);
  logger.log('----------------------');
  logger.log(`Running on http://localhost:${process.env.PORT}`);

  await app.listen(process.env.PORT);
}
bootstrap();
