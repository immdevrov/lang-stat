import { argv } from 'node:process'
import https from 'node:https'

const [_nodePath, _scriptPath, GITHUB_API_TOKEN] = argv

/**
 * @param {https.RequestOptions} options
 */
async function makeRequest(options) {
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

const data = await makeRequest({
  host: 'api.github.com',
  path: '/octocat',
  method: 'GET',
  headers: {
    Authorization: `Bearer ${GITHUB_API_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'lang-stat-app',
    'X-GitHub-Api-Version': '2022-11-28',
  },
})

console.log(data)
