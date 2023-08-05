import * as fs from 'fs';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
const JsZip = require("jszip")
import { v4 as uuidv4 } from 'uuid';

import { CustomHttpException } from 'src/Custom/custom-http.exception';
import { DlWsGateway } from 'src/dl-ws/dl-ws.gateway';

@Injectable()
export class FileService {

  constructor(private readonly dlWsGateway: DlWsGateway) {}

  async downloadFile(url: string, socketId: string): Promise<string> {

    const acceptedPaterns = [
      /^https:\/\/github\.com\/[a-zA-Z0-9\-]{1,39}\/[a-zA-Z0-9-_]+\/archive\/refs\/heads\/.+\.zip\/?$/,
      /^https:\/\/github\.com\/[a-zA-Z0-9\-]{1,39}\/[a-zA-Z0-9-_]+\/?$/,
      /^https:\/\/github\.com\/[a-zA-Z0-9\-]{1,39}\/[a-zA-Z0-9-_]+\/tree\/[a-zA-Z0-9\-]+\/?$/
    ]

    if(!acceptedPaterns.some(patern => patern.test(url))) throw new CustomHttpException({
      statusCode: 400,
      message: 'Invalid url',
      error: 'Bad Request',
    })

    const [username, repo] = url.split('/').slice(3, 5)

    let branch: string
    if(url.includes('.zip')) {
      branch = url.split('/').at(-2).split('.zip')[0]
    } else if (url.includes('tree')) {
      branch = url.split('/').at(-1)
    } else {
      branch = 'main' // master check needed
    }

    console.log(username, repo, branch)

    const repoData = await axios({
      url: `https://api.github.com/repos/${username}/${repo}`,
      method: 'GET',
    });
    console.log(repoData.data)
    
      return new Promise(async (resolve, reject) => {
        
        let response: any
        try {
          response = await axios({
            url: `https://github.com/${username}/${repo}/archive/refs/heads/${branch}.zip`,
            method: 'GET',
            responseType: 'stream',
          });
        } catch (error) {
          return reject(error)
        }
  
        const zipName = `repo-${uuidv4()}.zip`
        const writer = fs.createWriteStream('downloads/' + zipName)
  
        response.data.pipe(writer)

        let downloadedSize = 0
        let lastpercentage = 0
        response.data.on('data', (chunk) => {
          if(!socketId) return
          downloadedSize += (chunk.length / 1024) / repoData.data.size * 100
          const percentage = Math.trunc(downloadedSize)
          if(percentage === lastpercentage) return
          lastpercentage = percentage
          this.dlWsGateway.server.sockets.sockets.get(socketId).emit('progress', { step: 'cloning', progress: percentage})
        })
  
        writer.on('finish', () => {
          fs.readFile('downloads/' + zipName, async (err, data) => {
            if(err) throw err;
            let zip = await JsZip.loadAsync(data)
            zip.forEach(async (relativePath, zipEntry) => {
              let content = await zipEntry.async('nodebuffer')
              if(relativePath.endsWith('/')) await fs.promises.mkdir(`public/repos/${username}/${relativePath}`, { recursive: true })
              else await fs.promises.writeFile(`public/repos/${username}/${relativePath}`, content,)
            });
            fs.unlink('downloads/' + zipName, () => {})
            resolve(`/repos/${username}/${repo}-${branch}`)
          });
        })
        writer.on('error', reject)
      })
  }
}
