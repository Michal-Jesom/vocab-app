import https from 'node:https'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, 'dist')

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function serve(req, res) {
  let filePath = path.join(dist, req.url === '/' ? 'index.html' : req.url.split('?')[0])

  // SPA fallback
  if (!fs.existsSync(filePath)) {
    filePath = path.join(dist, 'index.html')
  }

  const ext = path.extname(filePath)
  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const data = fs.readFileSync(filePath)
    res.writeHead(200)
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Not Found')
  }
}

// HTTP fallback (for browsers that block self-signed HTTPS)
http.createServer(serve).listen(8080, '0.0.0.0', () => {
  console.log('HTTP  server running at http://172.30.202.160:8080/')
})

// HTTPS (required for PWA install + offline)
https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, 'cert.key')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.crt')),
  },
  serve
).listen(8443, '0.0.0.0', () => {
  console.log('HTTPS server running at https://172.30.202.160:8443/')
})
