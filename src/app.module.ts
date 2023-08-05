import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ApiController } from './api.controller';
import { FileModule } from './file/file.module';
import { DlWsModule } from './dl-ws/dl-ws.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    FileModule,
    DlWsModule,
  ],
  controllers: [AppController, ApiController],
  providers: [
    AppService,
  ],
})
export class AppModule {}
