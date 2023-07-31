import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class ApiController {
    constructor(private readonly appService: AppService) {}
    
  @Get('')
  getHello(): string {
    return 'rien'
  }
}
