import { Body, Controller, Post, Req } from '@nestjs/common';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
    constructor(private readonly fileService: FileService) {}

    @Post('clone')
    async downloadZip(@Body('url') url: string, @Req() req): Promise<{ url: string; }>  {
        const publicUrl = await this.fileService.downloadFile(url)
        return {
            url: publicUrl
        };
    }
}
