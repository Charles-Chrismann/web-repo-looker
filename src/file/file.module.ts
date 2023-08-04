import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { DlWsGateway } from 'src/dl-ws/dl-ws.gateway';

@Module({
  controllers: [FileController],
  providers: [FileService, DlWsGateway]
})
export class FileModule {}
