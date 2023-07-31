import { Controller, Get, Render } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  root() {
    let users = [] as { user: string, repos: string[] }[]

    fs.readdirSync('public/repos').forEach(user => {
      console.log(user);
      users.push({ 
        user: user,
        repos: []
      });

      fs.readdirSync(`public/repos/${user}`).forEach(repo => {
        users[users.length - 1].repos.push(repo);
      });
    });

    console.log(JSON.stringify(users));
    return { 
      message: 'Hello world! rendered',
      users: users
    };
  }
}
