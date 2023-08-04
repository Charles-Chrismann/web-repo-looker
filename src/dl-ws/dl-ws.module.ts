import { Module } from '@nestjs/common';
import { DlWsGateway } from './dl-ws.gateway';

@Module({
  providers: [DlWsGateway]
})
export class DlWsModule {}
