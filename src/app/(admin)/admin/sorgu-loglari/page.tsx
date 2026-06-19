'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subDays, startOfDay } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  Search, Shield, AlertTriangle, FileText, Download, Eye,
  Activity, Users, TrendingUp, Ban, RefreshCw, X, Image as ImageIcon,
  Calendar, UserX, UserCheck
} from 'lucide-react'

type Tab = 'sorgu' | 'dosya' | 'ratelimit' | 'ozet'

const ACTION_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  file_view: { label: 'Dosya Görüntüleme', color: 'text-blue-400', icon: Eye },
  file_download: { label: 'Dosya İndirme', color: 'text-green-400', icon: Download },
  file_access_rate_limited: { label: 'Rate Limit Aşıldı', color: 'text-red-400', icon: Ban },
}

const BUCKET_LABELS: Record<string, string> = {
  receipts: 'Fatura/Fiş', contracts: 'Sözleşme', 'customer-attachments': 'Müşteri Belgesi',
  'tax-documents': 'Vergi Belgesi', 'vergi-levhalari': 'Vergi Levhası',
}

export default function SorguLoglariPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('ozet')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  const [queryLogs, setQueryLogs] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [rateLimitWarnings, setRateLimitWarnings] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any[]>([])
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set())
  const [ozet, setOzet] = useState({ todayQueries: 0, weekQueries: 0, todayFileAccess: 0, rateLimitHits: 0, topUser: '', uniqueUsers: 0 })

  // Dosya önizleme modal
  const [previewFile, setPreviewFile] = useState<{ bucket: string; path: string; filename: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const today = startOfDay(new Date()).toISOString()
    const weekAgo = subDays(new Date(), 7).toISOString()

    const [queryRes, auditRes, rateLimitRes, profilesRes] = await Promise.all([
      supabase.from('query_logs')
        .select('*, profiles(company_name, full_name, subscription_plan, status)')
        .order('queried_at', { ascending: false })
        .limit(300),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('audit_logs').select('*').eq('action', 'file_access_rate_limited').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('id, status').eq('status', 'blocked'),
    ])

    const queries = queryRes.data || []
    const audits = auditRes.data || []
    const rateLimits = rateLimitRes.data || []

    setQueryLogs(queries)
    setAuditLogs(audits)
    setRateLimitWarnings(rateLimits)
    setBlockedUsers(new Set((profilesRes.data || []).map(p => p.id)))

    const todayQueries = queries.filter(q => q.queried_at >= today).length
    const weekQueries = queries.filter(q => q.queried_at >= weekAgo).length
    const todayFileAccess = audits.filter(a => a.created_at >= today && (a.action === 'file_view' || a.action === 'file_download')).length
    const uniqueUsers = new Set(queries.map(q => q.user_id)).size

    const userQueryCounts: Record<string, { name: string; count: number; status: string }> = {}
    queries.forEach(q => {
      if (!userQueryCounts[q.user_id]) {
        userQueryCounts[q.user_id] = { name: q.profiles?.company_name || '—', count: 0, status: q.profiles?.status || '' }
      }
      userQueryCounts[q.user_id].count++
    })
    const topUserEntry = Object.entries(userQueryCounts).sort((a, b) => b[1].count - a[1].count)[0]

    setOzet({ todayQueries, weekQueries, todayFileAccess, rateLimitHits: rateLimits.length, topUser: topUserEntry?.[1]?.name || '—', uniqueUsers })

    const statsArr = Object.entries(userQueryCounts).map(([id, v]) => ({
      id, name: v.name, status: v.status, totalQueries: v.count,
      todayQueries: queries.filter(q => q.user_id === id && q.queried_at >= today).length,
      fileAccess: audits.filter(a => a.user_id === id && (a.action === 'file_view' || a.action === 'file_download')).length,
      rateLimitHits: rateLimits.filter(r => r.user_id === id).length,
      plan: queries.find(q => q.user_id === id)?.profiles?.subscription_plan || '—',
    })).sort((a, b) => b.totalQueries - a.totalQueries)
    setUserStats(statsArr)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleBlock = async (userId: string, currentlyBlocked: boolean) => {
    if (!confirm(currentlyBlocked ? 'Bu kullanıcının engelini kaldırmak istiyor musunuz?' : 'Bu kullanıcıyı engellemek istediğinize emin misiniz? Hesabı askıya alınacak.')) return
    await supabase.from('profiles').update({ status: currentlyBlocked ? 'approved' : 'blocked' }).eq('id', userId)
    fetchData()
  }

  // Tarih filtresi yardımcı fonksiyonu
  const inDateRange = (dateStr: string) => {
    if (dateFrom && dateStr < dateFrom) return false
    if (dateTo && dateStr > dateTo + 'T23:59:59') return false
    return true
  }

  const filteredQueries = queryLogs.filter(l =>
    (!search || (l.profiles?.company_name + '').toLowerCase().includes(search.toLowerCase())) &&
    inDateRange(l.queried_at)
  )
  const filteredAudits = auditLogs.filter(l =>
    (!search || (l.company_name + '').toLowerCase().includes(search.toLowerCase())) &&
    inDateRange(l.created_at) &&
    (actionFilter === 'all' || l.action === actionFilter)
  )
  const filteredRateLimits = rateLimitWarnings.filter(l =>
    (!search || (l.company_name + '').toLowerCase().includes(search.toLowerCase())) &&
    inDateRange(l.created_at)
  )

  const isImageFile = (filename: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)
  const isPdfFile = (filename: string) => /\.pdf$/i.test(filename)

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Güvenlik & Log Takibi</h1>
          <p className="text-gray-400 text-sm mt-1">Sorgu logları, dosya erişimleri ve rate limit uyarıları</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 px-3 py-2 rounded-lg text-sm hover:text-white transition-colors">
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      <div className="grid grid-cols-6 gap-4">
        {[
          { label: 'Bugün Sorgu', value: ozet.todayQueries, icon: Search, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: '7 Günlük Sorgu', value: ozet.weekQueries, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: 'Bugün Dosya Erişim', value: ozet.todayFileAccess, icon: FileText, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Rate Limit Uyarısı', value: ozet.rateLimitHits, icon: Ban, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'Aktif Firma', value: ozet.uniqueUsers, icon: Users, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'En Aktif Firma', value: ozet.topUser, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10', isText: true },
        ].map((s, i) => (
          <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-xs">{s.label}</span>
              <div className={`${s.bg} p-1.5 rounded-lg`}><s.icon size={12} className={s.color} /></div>
            </div>
            <div className={`font-bold ${(s as any).isText ? 'text-sm' : 'text-xl'} ${s.color} truncate`}>{s.value}</div>
          </div>
        ))}
      </div>

      {ozet.rateLimitHits > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <div>
            <div className="text-red-400 font-semibold text-sm">Rate Limit Uyarısı</div>
            <div className="text-gray-400 text-xs mt-0.5">{ozet.rateLimitHits} adet rate limit ihlali tespit edildi.</div>
          </div>
        </div>
      )}

      <div className="flex bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-1 w-fit gap-1">
        {([
          { key: 'ozet', label: 'Firma Özeti', icon: Users },
          { key: 'sorgu', label: `Sorgu Logları (${filteredQueries.length})`, icon: Search },
          { key: 'dosya', label: `Dosya Erişimleri (${filteredAudits.filter(a => a.action === 'file_view' || a.action === 'file_download').length})`, icon: FileText },
          { key: 'ratelimit', label: `Rate Limit (${filteredRateLimits.length})`, icon: Ban },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key as Tab)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${activeTab === key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Detaylı filtreler */}
      <div className="flex flex-wrap items-center gap-3 bg-[#141414] border border-[#2A2A2A] rounded-xl p-3">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Firma ara..."
            className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:border-red-500 outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-gray-500" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-2 py-2 text-xs focus:border-red-500 outline-none" />
          <span className="text-gray-600 text-xs">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-2 py-2 text-xs focus:border-red-500 outline-none" />
        </div>
        {activeTab === 'dosya' && (
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            className="bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-xs focus:border-red-500 outline-none">
            <option value="all">Tüm Aksiyonlar</option>
            <option value="file_view">Görüntüleme</option>
            <option value="file_download">İndirme</option>
          </select>
        )}
        {(search || dateFrom || dateTo || actionFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setActionFilter('all') }}
            className="text-gray-500 hover:text-white text-xs flex items-center gap-1 transition-colors">
            <X size={12} /> Filtreleri Temizle
          </button>
        )}
      </div>

      {/* ===== FİRMA ÖZETİ ===== */}
      {activeTab === 'ozet' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A]"><h3 className="text-white font-semibold">Firma Bazlı Aktivite ve Müdahale</h3></div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {['Firma', 'Plan', 'Toplam Sorgu', 'Bugün Sorgu', 'Dosya Erişim', 'Rate Limit', 'İşlem'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userStats.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase())).map((u, i) => {
                const isBlocked = blockedUsers.has(u.id)
                return (
                  <tr key={i} className={`border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors ${isBlocked ? 'bg-red-500/5' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium text-sm">{u.name}</div>
                      {isBlocked && <span className="text-red-400 text-xs">🚫 Engellendi</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.plan === 'premium' ? 'bg-purple-500/20 text-purple-400' : u.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>{u.plan}</span>
                    </td>
                    <td className="px-4 py-3 text-white font-bold">{u.totalQueries}</td>
                    <td className="px-4 py-3 text-blue-400">{u.todayQueries}</td>
                    <td className="px-4 py-3 text-green-400">{u.fileAccess}</td>
                    <td className="px-4 py-3">
                      {u.rateLimitHits > 0 ? <span className="text-red-400 font-bold flex items-center gap-1"><AlertTriangle size={12} />{u.rateLimitHits}</span> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleBlock(u.id, isBlocked)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${isBlocked ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>
                        {isBlocked ? <><UserCheck size={12} /> Engeli Kaldır</> : <><UserX size={12} /> Engelle</>}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== SORGU LOGLARI ===== */}
      {activeTab === 'sorgu' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
            <h3 className="text-white font-semibold">Müşteri Sorgu Logları</h3>
            <span className="text-gray-500 text-sm">{filteredQueries.length} kayıt</span>
          </div>
          <div className="divide-y divide-[#1A1A1A] max-h-[600px] overflow-y-auto">
            {filteredQueries.length === 0 ? <div className="text-center text-gray-500 py-10 text-sm">Kayıt bulunamadı</div> : filteredQueries.map(l => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#1E1E1E] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0"><Search size={12} className="text-purple-400" /></div>
                  <div>
                    <div className="text-white text-sm font-medium">{l.profiles?.company_name || '—'}</div>
                    <div className="text-gray-500 text-xs">
                      {l.profiles?.subscription_plan && <span className="mr-2 text-blue-400">[{l.profiles.subscription_plan}]</span>}
                      {l.customer_name ? `Müşteri: ${l.customer_name}` : `TC: ${l.tc_hash ? l.tc_hash.slice(0, 8) + '...' : '—'}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${l.result_found ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{l.result_found ? 'Bulundu' : 'Bulunamadı'}</span>
                  {l.ip_address && <span className="text-gray-600 text-xs font-mono">{l.ip_address}</span>}
                  <span className="text-gray-500 text-xs">{l.queried_at ? format(new Date(l.queried_at), 'dd MMM HH:mm', { locale: tr }) : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== DOSYA ERİŞİMLERİ ===== */}
      {activeTab === 'dosya' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
            <h3 className="text-white font-semibold">Dosya Erişim Logları</h3>
            <span className="text-gray-500 text-sm">{filteredAudits.filter(a => a.action === 'file_view' || a.action === 'file_download').length} kayıt</span>
          </div>
          <div className="divide-y divide-[#1A1A1A] max-h-[600px] overflow-y-auto">
            {filteredAudits.filter(a => a.action === 'file_view' || a.action === 'file_download').length === 0
              ? <div className="text-center text-gray-500 py-10 text-sm">Kayıt bulunamadı</div>
              : filteredAudits.filter(a => a.action === 'file_view' || a.action === 'file_download').map(a => {
                  const cfg = ACTION_LABELS[a.action] || { label: a.action, color: 'text-gray-400', icon: FileText }
                  const filename = a.metadata?.filename || a.resource_id?.split('/').pop() || '—'
                  return (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#1E1E1E] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${a.action === 'file_download' ? 'bg-green-500/10' : 'bg-blue-500/10'}`}><cfg.icon size={12} className={cfg.color} /></div>
                        <div>
                          <div className="text-white text-sm font-medium">{a.company_name || '—'}</div>
                          <div className="text-gray-500 text-xs">{BUCKET_LABELS[a.resource_type] || a.resource_type} · {filename}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                        {a.ip_address && <span className="text-gray-600 text-xs font-mono">{a.ip_address}</span>}
                        <span className="text-gray-500 text-xs">{format(new Date(a.created_at), 'dd MMM HH:mm', { locale: tr })}</span>
                        <button onClick={() => setPreviewFile({ bucket: a.resource_type, path: a.resource_id, filename })}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs border border-blue-400/30 px-2 py-1 rounded-lg transition-colors">
                          <Eye size={11} /> İçeriği Gör
                        </button>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>
      )}

      {/* ===== RATE LİMİT ===== */}
      {activeTab === 'ratelimit' && (
        <div className="space-y-4">
          {filteredRateLimits.length === 0 ? (
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-16 text-center">
              <Shield size={40} className="text-green-400 mx-auto mb-3" />
              <div className="text-white font-semibold">Rate Limit İhlali Yok</div>
              <div className="text-gray-400 text-sm mt-1">Sistem normal çalışıyor</div>
            </div>
          ) : (
            <div className="bg-[#141414] border border-red-500/20 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                <h3 className="text-red-400 font-semibold">Rate Limit İhlalleri</h3>
                <span className="text-gray-500 text-sm ml-auto">{filteredRateLimits.length} kayıt</span>
              </div>
              <div className="divide-y divide-[#1A1A1A] max-h-[600px] overflow-y-auto">
                {filteredRateLimits.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#1E1E1E] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0"><Ban size={12} className="text-red-400" /></div>
                      <div>
                        <div className="text-white text-sm font-medium">{a.company_name || '—'}</div>
                        <div className="text-gray-500 text-xs">{BUCKET_LABELS[a.resource_type] || a.resource_type || '—'} · {a.metadata?.count || '?'} istek</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {a.ip_address && <span className="text-gray-600 text-xs font-mono bg-[#1E1E1E] px-2 py-0.5 rounded">{a.ip_address}</span>}
                      <span className="text-gray-500 text-xs">{format(new Date(a.created_at), 'dd MMM HH:mm', { locale: tr })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DOSYA ÖNİZLEME MODAL */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewFile(null)}>
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A] flex-shrink-0">
              <div className="flex items-center gap-2">
                {isImageFile(previewFile.filename) ? <ImageIcon size={16} className="text-blue-400" /> : <FileText size={16} className="text-blue-400" />}
                <span className="text-white font-medium text-sm">{previewFile.filename}</span>
              </div>
              <button onClick={() => setPreviewFile(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#0A0A0A]">
              {isImageFile(previewFile.filename) ? (
                <img src={`/api/file?bucket=${encodeURIComponent(previewFile.bucket)}&path=${encodeURIComponent(previewFile.path)}`}
                  alt={previewFile.filename} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
              ) : isPdfFile(previewFile.filename) ? (
                <iframe src={`/api/file?bucket=${encodeURIComponent(previewFile.bucket)}&path=${encodeURIComponent(previewFile.path)}`}
                  className="w-full h-[60vh] rounded-lg bg-white" />
              ) : (
                <div className="text-center text-gray-500 text-sm py-12">Bu dosya türü önizlenemiyor.</div>
              )}
            </div>
            <div className="p-4 border-t border-[#2A2A2A] flex-shrink-0">
              <a href={`/api/file?bucket=${encodeURIComponent(previewFile.bucket)}&path=${encodeURIComponent(previewFile.path)}&download=1`}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                <Download size={14} /> Dosyayı İndir
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}