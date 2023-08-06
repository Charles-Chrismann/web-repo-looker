import { Controller, Get, Render } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  async root() {
    let users = [] as { user: string, repos: string[] }[]
    const repos = (await fs.promises.readdir('public/repos')).filter(user => user !== '.gitkeep')
    await Promise.all(repos.map(async user => {
      const userData = JSON.parse((await fs.promises.readFile(`public/repos/${user}/manifest.json`)).toString())
      users.push({
        user,
        repos: userData.repos.map(repo => `${repo.name}-${repo.branch}`)
      });
    }))

    return { 
      message: 'Hello world! rendered',
      users
    };
  }
}
