import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomHttpException extends HttpException {
  constructor(response: ErrorResponse) {
    super(response, response.statusCode);
  }
}

export interface ErrorResponse {
    statusCode: number;
    message: string;
    error: string;
}