export default function RewriteUrlMiddleware(req, res, next) {
  // console.log(req)
  console.log('url', req.url)
  console.log('referer', req.headers.referer)
  if(
    // brak on http://localhost:3000/todo_react_app/build/favicon.ico
    !(
      req.url.endsWith('.html')
      || req.url.endsWith('/')
      || req.url.startsWith('/api')
      || req.url.startsWith('/repos')
      || req.url.startsWith('/socket.io')
      || req.url.startsWith('/scripts')
      || req.url.startsWith('/styles')
      || req.url.startsWith('/favicon.svg')
      ) && req.headers.referer && req.headers.referer.includes('/repos/')
    ) {
    const splitedReferer = req.headers.referer.split('/')
    const repoIndex = splitedReferer.findIndex((e) => e === 'repos')
    const username = splitedReferer[repoIndex + 1]
    const repo = splitedReferer[repoIndex + 2]

    // Will break if branch name contains '-'
    const branch = repo.split('-').at(-1)

    // prevent url like /{repoName}/build/...
    const splitedUrl = req.url.split('/')
    let repoNameIndexInUrl = splitedUrl.findIndex((e) => e === repo.split('-' + branch)[0]) // can break if repo name contains branch name
    console.log(repoNameIndexInUrl, repo + '-' + branch)
    if(repoNameIndexInUrl !== -1) splitedUrl.splice(repoNameIndexInUrl, 1)
    console.log(splitedUrl)

    let startFinalUrlSplited = req.headers.referer.split('/').slice(3)
    console.log(startFinalUrlSplited)
    if(startFinalUrlSplited.at(-1) !== '') startFinalUrlSplited.pop()
    startFinalUrlSplited = startFinalUrlSplited.join('/')

    req.url = `/${startFinalUrlSplited}${splitedUrl.join('/')}`
    console.log('final url', req.url)
  }
  next()
}