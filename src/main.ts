import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT;

  const logger = new Logger('bootstrap');
  logger.log(`http://localhost:${port}`);

  await app.listen(port);
}
bootstrap();
