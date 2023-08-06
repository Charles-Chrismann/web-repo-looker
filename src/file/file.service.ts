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

    let [username, repo] = url.split('/').slice(3, 5)

    const repoData = await axios({
      url: `https://api.github.com/repos/${username}/${repo}`,
      method: 'GET',
    });

    [username, repo] = repoData.data.full_name.split('/')

    let branch: string
    if(url.includes('.zip')) {
      branch = url.split('/').at(-2).split('.zip')[0]
    } else if (url.includes('tree')) {
      branch = url.split('/').at(-1)
    } else {
      branch = repoData.data.default_branch
    }

    console.log(username, repo, branch)
    // console.log(repoData.data)
    
    let response: any
    try {
      response = await axios({
        url: `https://github.com/${username}/${repo}/archive/refs/heads/${branch}.zip`,
        method: 'GET',
        responseType: 'stream',
      });
    } catch (error) {
      throw new CustomHttpException({
        statusCode: 404,
        message: 'Repo not found',
        error: 'Not Found',
      })
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
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    const data = await fs.promises.readFile('downloads/' + zipName);
    console.log('file downloaded', data)

    let userManifest: { username: string, repos: { name: string, branch: string }[] }
    try {
      userManifest = JSON.parse((await fs.promises.readFile(`public/repos/${username}/manifest.json`)).toString())
    } catch (error) {
      await fs.promises.mkdir(`public/repos/${username}`, { recursive: true })
      userManifest = {
        username,
        repos: []
      }
    }
    if(!userManifest.repos.some(r => r.name === repo && r.branch === branch)) {
      userManifest.repos.push({
        name: repo,
        branch,
      })
      await fs.promises.writeFile(`public/repos/${username}/manifest.json`, JSON.stringify(userManifest))
    }

    let foldersPromises: Promise<any>[] = []
    let filesPromises: Promise<any>[] = []
    let hasAPackageJson = false

    let zip = await JsZip.loadAsync(data)

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if(relativePath.endsWith('/')) {
        foldersPromises.push(fs.promises.mkdir(`public/repos/${username}/${relativePath}`, { recursive: true }))
      } else {
        if(relativePath.endsWith('package.json') && relativePath.split('/').length === 2) hasAPackageJson = true
        filesPromises.push((async () => {
          let content = await (zipEntry as any).async('nodebuffer')
          fs.promises.writeFile(`public/repos/${username}/${relativePath}`, content)
        })()
        )
      }
    }
    
    await Promise.all(foldersPromises)
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

    return `/repos/${username}/${repo}-${branch}/${buildFolderName}`
  }
}
