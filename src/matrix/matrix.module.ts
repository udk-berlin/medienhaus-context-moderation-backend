import { Module } from '@nestjs/common';
import { MatrixService } from './matrix.service';
import { MatrixController } from './matrix.controller';

@Module({
  controllers: [MatrixController],
  providers: [MatrixService],
})
export class MatrixModule {}
