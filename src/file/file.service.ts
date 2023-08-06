import * as fs from 'fs';
import * as util from 'util';
import { exec } from 'child_process';
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
            let hasAPackageJson = false
            let zip = await JsZip.loadAsync(data)
            console.log(zip)

            let filesPromises = []

            zip.forEach(async (relativePath: string, zipEntry) => {
              console.log(relativePath)
              if(relativePath.endsWith('/')) {
                filesPromises.push(fs.promises.mkdir(`public/repos/${username}/${relativePath}`, { recursive: true }))
              } else {
                if(relativePath.endsWith('package.json') && relativePath.split('/').length === 2) hasAPackageJson = true
                let content = await zipEntry.async('nodebuffer')
                filesPromises.push(fs.promises.writeFile(`public/repos/${username}/${relativePath}`, content))
              }
            })
            
            await Promise.all(filesPromises)
            fs.unlink('downloads/' + zipName, () => {})
            
            let buildFolderName = '';
            if(hasAPackageJson) {
              console.log('has a package.json, running npm install ...')
              try {
                {
                  const { stdout, stderr } = await util.promisify(exec)(`cd public/repos/${username}/${repo}-${branch} && npm install`)
                  console.log(stdout, stderr)
                }
                const folderBeforeBuild = (await fs.promises.readdir(`public/repos/${username}/${repo}-${branch}`, { withFileTypes: true })).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)
                {
                  const { stdout, stderr } = await util.promisify(exec)(`cd public/repos/${username}/${repo}-${branch} && npm run build`)
                  console.log(stdout, stderr)
                }

                const currentFolders = (await fs.promises.readdir(`public/repos/${username}/${repo}-${branch}`, { withFileTypes: true })).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)
                buildFolderName = currentFolders.find(folder => folderBeforeBuild.indexOf(folder) === -1)

              } catch (error) {
                console.log("Failed to run npm install")
                console.log(error)
              }
            }
            resolve(`/repos/${username}/${repo}-${branch}/${buildFolderName}`)
          });
        })
        writer.on('error', reject)
      })
  }
}
