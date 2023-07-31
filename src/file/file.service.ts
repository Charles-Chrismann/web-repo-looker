import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
const JsZip = require("jszip")

@Injectable()
export class FileService {

  async downloadFile(url: string): Promise<string> {
    const acceptedPaterns = [
      /^https:\/\/github\.com\/[a-zA-Z0-9\-]{1,39}\/[a-zA-Z0-9-_]+\/archive\/refs\/heads\/.+\.zip\/?$/,
      /^https:\/\/github\.com\/[a-zA-Z0-9\-]{1,39}\/[a-zA-Z0-9-_]+\/?$/,
      /^https:\/\/github\.com\/[a-zA-Z0-9\-]{1,39}\/[a-zA-Z0-9-_]+\/tree\/[a-zA-Z0-9\-]+\/?$/
    ]

    if(!acceptedPaterns.some(patern => patern.test(url))) return

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
  
        const writer = fs.createWriteStream('downloads/test.zip')
  
        response.data.pipe(writer)
  
        writer.on('finish', () => {
          fs.readFile('downloads/test.zip', async (err, data) => {
            if(err) throw err;
            console.log(data)
            let zip = await JsZip.loadAsync(data)
            zip.forEach(async (relativePath, zipEntry) => {
              let content = await zipEntry.async('nodebuffer')
              if(relativePath.endsWith('/')) fs.mkdirSync(`public/repos/${username}/${relativePath}`, { recursive: true })
              else fs.writeFileSync(`public/repos/${username}/${relativePath}`, content)
            });
            resolve(`/repos/${username}/${repo}-${branch}`)
          });
        })
        writer.on('error', reject)
      })
  }
}
