import CryptoJS from 'crypto-js'

const SECRET =
  process.env.NEXT_PUBLIC_ENCRYPTION_SECRET ||
  'bilgiortagim-default-key-2024'

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET).toString()
}

export function decrypt(cipher: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, SECRET)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch {
    return ''
  }
}

export function hashSHA256(text: string): string {
  return CryptoJS.SHA256(text.trim()).toString()
}

export function hashTC(tc: string): string {
  return hashSHA256(tc)
}

export function maskTC(tc: string): string {
  if (!tc || tc.length < 11) return '***'
  return tc.slice(0, 3) + '****' + tc.slice(7)
}

export function maskPhone(phone: string): string {
  if (!phone) return '***'

  const clean = phone.replace(/\D/g, '')

  return clean.length >= 10
    ? clean.slice(0, 3) + ' *** ** ' + clean.slice(-2)
    : '***'
}