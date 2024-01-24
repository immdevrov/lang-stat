import { argv } from 'node:process'
import https from 'node:https'

const [_nodePath, _scriptPath, GITHUB_API_TOKEN] = argv
let requestsNumber = 0
/**
 * @param {https.RequestOptions} options
 */
async function makeRequest(options) {
  requestsNumber++
  if (requestsNumber > 5000) {
    throw new Error('Exceed api rate limit!')
  }
  return new Promise((resolve, reject) => {
    let data = ''
    https
      .get(options, (res) => {
        res.setEncoding('utf8')

        res.on('data', (d) => {
          data += d
        })

        res.on('end', () => {
          resolve(data)
        })

        res.on('error', (e) => {
          reject(e)
        })

      })
  })
}

const HEADERS = {
    Authorization: `Bearer ${GITHUB_API_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'lang-stat-app',
    'X-GitHub-Api-Version': '2022-11-28',
}

async function getOrgs() {
  const data = await makeRequest({
    host: 'api.github.com',
    path: '/organizations?per_page=100',
    method: 'GET',
    headers: HEADERS,
  })

  const orgs = JSON.parse(data)
  return orgs.map(({ login, id, repos_url }) => ({ login, id, repos_url }))
}

async function getUsers() {
  const data = await makeRequest({
    host: 'api.github.com',
    path: '/users?per_page=100',
    method: 'GET',
    headers: HEADERS,
  })

  const users = JSON.parse(data)
  return users.map(({ login, id, repos_url }) => ({ login, id, repos_url }))
}

async function getRepositories(users, orgs) {
  const urlList = [
    ...users.map(i => i.repos_url),
    ...orgs.map(i => i.repos_url),
  ]
  const promises = urlList.map(url => makeRequest({
    host: 'api.github.com',
    path: `${url.replace('https://api.github.com', '')}?per_page=100`,
    method: 'GET',
    headers: HEADERS,
  }))
  const dataList = await Promise.all(promises)
  return dataList.map(d => JSON.parse(d)).flat()
}

async function getLanguages(urlList) {
  const dataList = await Promise.all(urlList.map(url => makeRequest({
    host: 'api.github.com',
    path: `${url.replace('https://api.github.com', '')}?per_page=100`,
    method: 'GET',
    headers: HEADERS,
  })))

  return dataList.map(d => JSON.parse(d))
}

async function doStuff() {
  const orgs = await getOrgs()
  const users = await getUsers()
  const repos = await getRepositories(users, orgs)
  const languages = await getLanguages(repos.map(r => r.languages_url))
  const langStat = {}
  languages.forEach(r => {
    Object.entries(r).forEach(([language, size]) => {
      if (!language || !size) { return }

      if (langStat[language]) {
        langStat[language] += size
      } else {
        langStat[language] = size
      }
    })
  })
  console.log(Object.entries(langStat).sort((a, b) => b[1] - a[1]))
}

class Queue {
  state = []

  constructor(initialState = []) {
    this.state = initialState
  }

  push(item) {
    this.state.push(item)
  }

  process = function* () {
    while (this.state.length) {
      const [head, ...tail] = this.state
      this.state = tail ?? []
      yield head
    }
  }
}

const q = new Queue(GITHUB_API_TOKEN.split(''))

for (const item of q.process()) {
  console.log(item)
}

