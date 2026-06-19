/**
 * Supabase storage URL'sini gizleyip kendi domain'imiz üzerinden proxy'e çevirir.
 * Örnek:
 *   https://bmajlpvszigfrcuysjwl.supabase.co/storage/v1/object/public/receipts/user123/foto.jpg
 *   → /api/file?bucket=receipts&path=user123/foto.jpg
 */
export function toProxyUrl(supabaseUrl: string | null | undefined): string | null {
    if (!supabaseUrl) return null
  
    try {
      const url = new URL(supabaseUrl)
      // /storage/v1/object/public/{bucket}/{path} formatını parse et
      const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/)
      if (!match) return supabaseUrl // Parse edilemezse orijinali döndür
  
      const bucket = match[1]
      const path = match[2]
      return `/api/file?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
    } catch {
      return supabaseUrl
    }
  }
  
  /**
   * Dosyayı indirme fonksiyonu — proxy URL üzerinden fetch edip blob olarak indirir
   */
  export async function downloadFile(proxyUrl: string, filename?: string) {
    try {
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error('Dosya alınamadı')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'dosya'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Dosya indirilemedi.')
    }
  }