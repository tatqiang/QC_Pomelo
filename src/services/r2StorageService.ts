/**
 * R2 File Storage Service for POMELO
 * Uploads files directly to Cloudflare R2 using the S3-compatible API with AWS Sig V4.
 * Requires the R2 bucket to have a CORS policy allowing PUT from localhost / production origins.
 */

export class R2StorageService {
    private accountId: string
    private accessKeyId: string
    private secretAccessKey: string
    private bucketName: string
    private publicUrl: string
    private folderPrefix: string

    constructor() {
        this.accountId       = import.meta.env.VITE_R2_ACCOUNT_ID || ''
        this.accessKeyId     = import.meta.env.VITE_R2_ACCESS_KEY_ID || ''
        this.secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || ''
        this.bucketName      = import.meta.env.VITE_R2_BUCKET_NAME || ''
        this.publicUrl       = import.meta.env.VITE_R2_PUBLIC_URL || ''
        this.folderPrefix    = import.meta.env.VITE_R2_FOLDER_PREFIX || 'pomelo'
    }

    private get isConfigured(): boolean {
        return !!(this.accountId && this.accessKeyId && this.secretAccessKey && this.bucketName && this.publicUrl)
    }

    /**
     * Upload a file to R2 storage.
     * @param file    - File to upload
     * @param subPath - Path within the folder prefix (e.g. "itrs/{projectId}/{itrId}/drawings")
     * @returns Public URL of the uploaded file
     */
    async uploadFile(file: File, subPath: string): Promise<string> {
        if (!this.isConfigured) {
            throw new Error('R2 configuration is missing. Please check environment variables.')
        }

        const sanitizedName = this.sanitizeFileName(file.name)
        const filePath = `${this.folderPrefix}/${subPath}/${sanitizedName}`

        return this.uploadToR2(file, filePath)
    }

    private sanitizeFileName(fileName: string): string {
        const lastDot = fileName.lastIndexOf('.')
        const name = lastDot > 0 ? fileName.substring(0, lastDot) : fileName
        const ext  = lastDot > 0 ? fileName.substring(lastDot) : ''

        const sanitized = name
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')

        return `${sanitized}_${Date.now()}${ext}`
    }

    private async uploadToR2(file: File, filePath: string): Promise<string> {
        const endpoint = `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}/${filePath}`

        const arrayBuffer = await file.arrayBuffer()
        const timestamp   = new Date().toISOString()
        const region      = 'auto'
        const service     = 's3'
        const dateStamp   = (timestamp.split('T')[0] || '').replace(/-/g, '')
        const amzDate     = timestamp.replace(/[-:]/g, '').split('.')[0] + 'Z'

        const payloadHash     = await this.sha256(arrayBuffer)
        const canonicalHeaders = `host:${this.accountId}.r2.cloudflarestorage.com\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
        const signedHeaders   = 'host;x-amz-content-sha256;x-amz-date'
        const canonicalRequest = `PUT\n/${this.bucketName}/${filePath}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`

        const algorithm           = 'AWS4-HMAC-SHA256'
        const credentialScope     = `${dateStamp}/${region}/${service}/aws4_request`
        const canonicalRequestHash = await this.sha256(new TextEncoder().encode(canonicalRequest))
        const stringToSign        = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`

        const signingKey  = await this.getSignatureKey(this.secretAccessKey, dateStamp, region, service)
        const signature   = await this.hmac(signingKey, new TextEncoder().encode(stringToSign))
        const authorization = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Authorization': authorization,
                'x-amz-content-sha256': payloadHash,
                'x-amz-date': amzDate,
                'Content-Type': file.type || 'application/octet-stream',
            },
            body: arrayBuffer,
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('R2 upload error:', errorText)
            throw new Error(`Failed to upload to R2: ${response.status} ${response.statusText}`)
        }

        return `${this.publicUrl}/${filePath}`
    }

    // ── Crypto helpers ────────────────────────────────────────────────────────

    private async sha256(data: ArrayBuffer | Uint8Array): Promise<string> {
        const ab = data instanceof Uint8Array ? data.buffer.slice(0) as ArrayBuffer : data
        const hashBuffer = await crypto.subtle.digest('SHA-256', ab)
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
    }

    private async hmac(key: ArrayBuffer, data: Uint8Array): Promise<string> {
        const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        const ab = data.buffer.slice(0) as ArrayBuffer
        const sig = await crypto.subtle.sign('HMAC', cryptoKey, ab)
        return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    }

    private async hmacBuffer(key: ArrayBuffer, data: Uint8Array): Promise<ArrayBuffer> {
        const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        return crypto.subtle.sign('HMAC', cryptoKey, data.buffer.slice(0) as ArrayBuffer)
    }

    private async getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
        const kDate    = await this.hmacBuffer(new TextEncoder().encode(`AWS4${key}`).buffer as ArrayBuffer, new TextEncoder().encode(dateStamp))
        const kRegion  = await this.hmacBuffer(kDate, new TextEncoder().encode(region))
        const kService = await this.hmacBuffer(kRegion, new TextEncoder().encode(service))
        return this.hmacBuffer(kService, new TextEncoder().encode('aws4_request'))
    }
}

export const r2StorageService = new R2StorageService()

