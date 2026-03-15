/**
 * upload_template.mjs
 * One-time script: uploads itr_template_FORM.pdf to Cloudflare R2
 * Run: node upload_template.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { createHmac, createHash } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Config (read from QC_JEC_V2/.env) ────────────────────────────────────────
import { readFileSync as rf } from 'fs'

function loadEnv(envPath) {
  const env = {}
  if (!existsSync(envPath)) return env
  rf(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  })
  return env
}

const envPath = join(__dir, '..', '.env')
const env = loadEnv(envPath)

const ACCOUNT_ID  = env.VITE_R2_ACCOUNT_ID
const ACCESS_KEY  = env.VITE_R2_ACCESS_KEY_ID
const SECRET_KEY  = env.VITE_R2_SECRET_ACCESS_KEY
const BUCKET      = env.VITE_R2_BUCKET_NAME
const PUBLIC_URL  = env.VITE_R2_PUBLIC_URL
const PREFIX      = env.VITE_R2_FOLDER_PREFIX || 'pomelo'

const PDF_FILE    = join(__dir, 'itr_template_FORM.pdf')
const R2_KEY      = `${PREFIX}/templates/itr_template_FORM.pdf`

// ── AWS Sig V4 helpers ────────────────────────────────────────────────────────
function sha256hex(data) {
  return createHash('sha256').update(data).digest('hex')
}
function hmacSha256(key, data) {
  return createHmac('sha256', key).update(data).digest()
}
function getSigningKey(secret, date, region, service) {
  const kDate    = hmacSha256('AWS4' + secret, date)
  const kRegion  = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, service)
  return hmacSha256(kService, 'aws4_request')
}

// ── Upload ────────────────────────────────────────────────────────────────────
async function upload() {
  if (!existsSync(PDF_FILE)) {
    console.error(`File not found: ${PDF_FILE}`)
    console.error('Run pdf_to_form.py first to generate itr_template_FORM.pdf')
    process.exit(1)
  }

  const body        = readFileSync(PDF_FILE)
  const now         = new Date()
  const amzDate     = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const dateStamp   = amzDate.slice(0, 8)
  const region      = 'auto'
  const service     = 's3'
  const host        = `${ACCOUNT_ID}.r2.cloudflarestorage.com`
  const endpoint    = `https://${host}/${BUCKET}/${R2_KEY}`
  const payloadHash = sha256hex(body)

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders    = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalReq     = `PUT\n/${BUCKET}/${R2_KEY}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
  const credScope        = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign     = `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n${sha256hex(canonicalReq)}`
  const signingKey       = getSigningKey(SECRET_KEY, dateStamp, region, service)
  const signature        = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
  const authHeader       = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Host'                 : host,
      'Content-Type'         : 'application/pdf',
      'Content-Length'       : String(body.length),
      'x-amz-date'           : amzDate,
      'x-amz-content-sha256' : payloadHash,
      'Authorization'        : authHeader,
    },
    body,
  })

  if (res.ok) {
    const publicUrl = `${PUBLIC_URL}/${R2_KEY}`
    console.log('✓  Uploaded successfully!')
    console.log(`   R2 key  : ${R2_KEY}`)
    console.log(`   Public  : ${publicUrl}`)
  } else {
    const text = await res.text()
    console.error(`✗  Upload failed: ${res.status} ${res.statusText}`)
    console.error(text)
    process.exit(1)
  }
}

upload()
