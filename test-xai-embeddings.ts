const https = require('https')

const data = JSON.stringify({
  model: 'v1',
  input: ['The quick brown fox jumped over the lazy dog'],
})

const req = https.request(
  {
    hostname: 'api.x.ai',
    port: 443,
    path: '/v1/embeddings',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + (process.env.XAI_API_KEY || 'test'),
    },
  },
  (res) => {
    let body = ''
    res.on('data', (d) => (body += d))
    res.on('end', () => console.log('Status:', res.statusCode, '\nBody:', body))
  }
)

req.on('error', (e) => console.error(e))
req.write(data)
req.end()
