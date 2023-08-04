import { Body, Controller, HttpStatus, Post, Req } from '@nestjs/common';
import { FileService } from './file.service';
import { AxiosError } from 'axios';
import { CustomHttpException } from 'src/Custom/custom-http.exception';

@Controller('file')
export class FileController {
    constructor(private readonly fileService: FileService) {}

    @Post('clone')
    async downloadZip(@Body('url') url: string, @Body('socketId') socketId: string): Promise<{ url: string; user: string; repo: string }>  {
        try {
            const publicUrl = await this.fileService.downloadFile(url, socketId)
            const [user, repo] = url.split('/').slice(3, 5)
            return {
                url: publicUrl,
                user,
                repo
            };
        } catch (error) {
            if(error instanceof AxiosError && error.response.status === 404) {
                throw new CustomHttpException({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'Repository not found',
                    error: 'Not Found',
                });
            }
            throw error
        }
    }
}
