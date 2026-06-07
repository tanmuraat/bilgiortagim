'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Clock, Plus, X, Upload } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const EXPENSE_COLORS: Record<string, string> = {
  akaryakit: '#F97316',
  arac_bakim: '#22C55E',
  personel: '#A855F7',
  ofis: '#6366F1',
  sigorta: '#3B82F6',
  vergi: '#EF4444',
  diger_gider: '#6B7280',
}

const EXPENSE_LABELS: Record<string, string> = {
  akaryakit: 'Akaryakıt',
  arac_bakim: 'Araç Bakım',
  personel: 'Personel',
  ofis: 'Ofis',
  sigorta: 'Sigorta',
  vergi: 'Vergi',
  diger_gider: 'Diğer',
}

export default function MuhasebePage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<any[]>([])
  const [overdueRentals, setOverdueRentals] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [stats, setStats] = useState({ income: 0, expense: 0, profit: 0, margin: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addType, setAddType] = useState<'income' | 'expense'>('income')
  const [saving, setSaving] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [form, setForm] = useState({
    type: 'income',
    category: 'arac_kiralama',
    amount: '',
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    vehicle_id: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
    const last10 = format(subDays(now, 10), 'yyyy-MM-dd')

    const [txRes, rentalsRes, vehiclesRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }),
      supabase.from('rentals').select('*, vehicles(plate)').eq('user_id', user.id).eq('payment_status', 'pending').lt('end_date', format(now, 'yyyy-MM-dd')).eq('status', 'active'),
      supabase.from('vehicles').select('id, plate, brand, model').eq('user_id', user.id),
    ])

    const txData = txRes.data || []
    setTransactions(txData.slice(0, 20))
    setOverdueRentals(rentalsRes.data || [])
    setVehicles(vehiclesRes.data || [])

    // Monthly stats
    const monthTx = txData.filter(t => t.transaction_date >= monthStart && t.transaction_date <= monthEnd)
    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const profit = income - expense
    const margin = income > 0 ? Math.round((profit / income) * 100) : 0
    const pending = (rentalsRes.data || []).reduce((s, r) => s + ((r.total_price || 0) - (r.paid_amount || 0)), 0)
    setStats({ income, expense, profit, margin, pending })

    // Chart: last 10 days
    const days = Array.from({ length: 10 }, (_, i) => {
      const d = subDays(now, 9 - i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const dayIncome = txData.filter(t => t.transaction_date === dateStr && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const dayExpense = txData.filter(t => t.transaction_date === dateStr && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      return { tarih: format(d, 'dd MMM', { locale: tr }), Gelir: dayIncome, Gider: dayExpense }
    })
    setChartData(days)

    // Pie: expense categories this month
    const expenseByCategory: Record<string, number> = {}
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Number(t.amount)
    })
    setPieData(Object.entries(expenseByCategory).map(([key, value]) => ({
      name: EXPENSE_LABELS[key] || key,
      value,
      color: EXPENSE_COLORS[key] || '#6B7280',
    })))

    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = async () => {
    if (!form.amount || !form.description || !form.category) {
      alert('Lütfen zorunlu alanları doldurun.')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let receipt_url = null
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: uploadData } = await supabase.storage.from('receipts').upload(path, receiptFile)
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
        receipt_url = urlData?.publicUrl
      }
    }

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: addType,
      category: form.category,
      amount: Number(form.amount),
      description: form.description,
      transaction_date: form.transaction_date,
      vehicle_id: form.vehicle_id || null,
      receipt_url,
      status: 'completed',
    })

    setShowAddModal(false)
    setForm({ type: 'income', category: 'arac_kiralama', amount: '', description: '', transaction_date: format(new Date(), 'yyyy-MM-dd'), vehicle_id: '' })
    setReceiptFile(null)
    fetchData()
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mini Muhasebe</h1>
          <p className="text-gray-400 text-sm mt-1">Bu ay gelir, gider ve kâr durumunuz</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setAddType('expense'); setForm(f => ({ ...f, type: 'expense', category: 'akaryakit' })); setShowAddModal(true) }}
            className="flex items-center gap-2 bg-[#1E1E1E] border border-[#2A2A2A] text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-[#252525] transition-colors">
            <Plus size={16} /> Gider Ekle
          </button>
          <button onClick={() => { setAddType('income'); setForm(f => ({ ...f, type: 'income', category: 'arac_kiralama' })); setShowAddModal(true) }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Gelir Ekle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Bu Ay Gelir', value: `₺${stats.income.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
          { label: 'Bu Ay Gider', value: `₺${stats.expense.toLocaleString('tr-TR')}`, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
          { label: 'Net Kâr', value: `₺${stats.profit.toLocaleString('tr-TR')}`, icon: DollarSign, color: stats.profit >= 0 ? 'text-green-400' : 'text-red-400', bg: stats.profit >= 0 ? 'bg-green-400/10' : 'bg-red-400/10', border: stats.profit >= 0 ? 'border-green-400/20' : 'border-red-400/20' },
          { label: 'Kâr Marjı', value: `%${stats.margin}`, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
          { label: 'Bekleyen Tahsilat', value: `₺${stats.pending.toLocaleString('tr-TR')}`, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
        ].map((s, i) => (
          <div key={i} className={`bg-[#141414] border ${s.border} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs">{s.label}</span>
              <div className={`${s.bg} p-1.5 rounded-lg`}><s.icon size={14} className={s.color} /></div>
            </div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="col-span-2 bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Son 10 Günlük Gelir / Gider</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="tarih" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `₺${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} labelStyle={{ color: '#F5F5F5' }} formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']} />
              <Line type="monotone" dataKey="Gelir" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 3 }} />
              <Line type="monotone" dataKey="Gider" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Gider Dağılımı</h3>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Bu ay gider yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#9CA3AF', fontSize: 11 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Son İşlemler + Vadesi Geçenler */}
      <div className="grid grid-cols-3 gap-6">
        {/* Son İşlemler */}
        <div className="col-span-2 bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Son İşlemler</h3>
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-sm">Henüz işlem yok</p>
            ) : transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-[#1E1E1E] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <div>
                    <div className="text-white text-sm font-medium">{t.description}</div>
                    <div className="text-gray-500 text-xs">{format(new Date(t.transaction_date), 'dd MMM yyyy', { locale: tr })} · {EXPENSE_LABELS[t.category] || t.category}</div>
                  </div>
                </div>
                <div className={`font-semibold text-sm ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}₺{Number(t.amount).toLocaleString('tr-TR')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vadesi Geçenler */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-yellow-400" />
            <h3 className="text-white font-semibold">Vadesi Geçen Tahsilatlar</h3>
          </div>
          <div className="space-y-3">
            {overdueRentals.length === 0 ? (
              <p className="text-gray-500 text-sm">Vadesi geçen tahsilat yok 🎉</p>
            ) : overdueRentals.map(r => (
              <div key={r.id} className="bg-[#1E1E1E] border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium">{r.customer_name}</span>
                  <span className="text-yellow-400 text-sm font-bold">₺{((r.total_price || 0) - (r.paid_amount || 0)).toLocaleString('tr-TR')}</span>
                </div>
                <div className="text-gray-500 text-xs">{r.vehicles?.plate} · Bitiş: {format(new Date(r.end_date), 'dd.MM.yyyy')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold">{addType === 'income' ? 'Gelir Ekle' : 'Gider Ekle'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Kategori *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
                  {addType === 'income' ? (
                    <>
                      <option value="arac_kiralama">Araç Kiralama</option>
                      <option value="depozito">Depozito</option>
                      <option value="hasar_tahsilat">Hasar Tahsilat</option>
                      <option value="diger_gelir">Diğer Gelir</option>
                    </>
                  ) : (
                    <>
                      <option value="akaryakit">Akaryakıt</option>
                      <option value="arac_bakim">Araç Bakım</option>
                      <option value="personel">Personel</option>
                      <option value="ofis">Ofis Giderleri</option>
                      <option value="sigorta">Sigorta</option>
                      <option value="vergi">Vergi</option>
                      <option value="diger_gider">Diğer</option>
                    </>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Tutar (₺) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Tarih *</label>
                  <input type="date" value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Açıklama *</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Kısa açıklama" className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">İlgili Araç (opsiyonel)</label>
                <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none">
                  <option value="">Araç seçin (opsiyonel)</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Fatura / Fiş (opsiyonel)</label>
                <label className="flex items-center gap-3 w-full bg-[#1E1E1E] border border-dashed border-[#3A3A3A] text-gray-400 rounded-lg px-4 py-3 cursor-pointer hover:border-red-500/50 transition-colors">
                  <Upload size={16} />
                  <span className="text-sm">{receiptFile ? receiptFile.name : 'Fatura görseli yükle'}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { if (e.target.files?.[0]) setReceiptFile(e.target.files[0]) }} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#2A2A2A]">
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}