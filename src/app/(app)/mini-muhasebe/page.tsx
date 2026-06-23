'use client'

import { toProxyUrl } from '@/lib/file-url'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'
import { DatePicker } from '@/components/ui/date-picker'
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Clock,
  Plus, X, Upload, Eye, Download, Filter, BarChart3,
  Car, ChevronLeft, ChevronRight, FileText, Search,
  Pencil, Trash2, Check, ChevronDown, ChevronUp, Building2, Mail, Phone, Loader2, User2
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const EXPENSE_COLORS: Record<string, string> = {
  akaryakit: '#F97316', arac_bakim: '#22C55E', personel: '#A855F7',
  ofis: '#6366F1', sigorta: '#3B82F6', vergi: '#EF4444', diger_gider: '#6B7280',
  arac_kiralama: '#22C55E', depozito: '#3B82F6', hasar_tahsilat: '#F97316', diger_gelir: '#6B7280',
}
const CATEGORY_LABELS: Record<string, string> = {
  akaryakit: 'Akaryakıt', arac_bakim: 'Araç Bakım', personel: 'Personel',
  ofis: 'Ofis', sigorta: 'Sigorta', vergi: 'Vergi', diger_gider: 'Diğer Gider',
  arac_kiralama: 'Araç Kiralama', depozito: 'Depozito', hasar_tahsilat: 'Hasar Tahsilat', diger_gelir: 'Diğer Gelir',
}

type Tab = 'ozet' | 'islemler' | 'evrak' | 'raporlar' | 'subeler'

const inputCls = "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none"

export default function MuhasebePage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('ozet')
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [overdueRentals, setOverdueRentals] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [stats, setStats] = useState({ income: 0, expense: 0, profit: 0, margin: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)

  // Şubelerim
  const [branches, setBranches] = useState<any[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [showAddBranchModal, setShowAddBranchModal] = useState(false)
  const [branchForm, setBranchForm] = useState({ branch_name: '', email: '', phone: '' })
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [branchError, setBranchError] = useState('')
  const [branchSuccess, setBranchSuccess] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<any>(null)
  const [branchDetail, setBranchDetail] = useState<{ vehicles: any[]; rentals: any[]; transactions: any[]; allTransactions: any[] } | null>(null)
  const [branchDetailLoading, setBranchDetailLoading] = useState(false)
  const [branchDetailTab, setBranchDetailTab] = useState<'ozet' | 'raporlar' | 'evrak' | 'ayarlar'>('ozet')
  const [resettingBranchPw, setResettingBranchPw] = useState(false)
  const [newBranchPassword, setNewBranchPassword] = useState('')
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null)

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addType, setAddType] = useState<'income' | 'expense'>('income')
  const [saving, setSaving] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [form, setForm] = useState({ category: 'arac_kiralama', amount: '', description: '', transaction_date: format(new Date(), 'yyyy-MM-dd'), vehicle_id: '' })

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTx, setEditingTx] = useState<any>(null)
  const [editForm, setEditForm] = useState({ category: '', amount: '', description: '', transaction_date: '', vehicle_id: '' })
  const [editFile, setEditFile] = useState<File | null>(null)

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailTx, setDetailTx] = useState<any>(null)

  // İşlemler
  const [txSearch, setTxSearch] = useState('')
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [txCatFilter, setTxCatFilter] = useState('all')
  const [txDateFrom, setTxDateFrom] = useState('')
  const [txDateTo, setTxDateTo] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Raporlar
  const [reportMonth, setReportMonth] = useState(new Date())
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [vehicleStats, setVehicleStats] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const now = new Date()
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

    const [txRes, rentalsRes, vehiclesRes, profileRes] = await Promise.all([
      supabase.from('transactions').select('*, performed_by_profile:profiles!transactions_performed_by_fkey(full_name)').order('transaction_date', { ascending: false }),
      supabase.from('rentals').select('*, vehicles(plate, brand, model), performed_by_profile:profiles!rentals_performed_by_fkey(full_name)').in('payment_status', ['pending', 'partial']).order('end_date', { ascending: true }),
      supabase.from('vehicles').select('id, plate, brand, model'),
      supabase.from('profiles').select('is_branch, branch_of_user_id, subscription_plan, company_name, extra_branch_slots').eq('id', user.id).single(),
    ])

    setProfile(profileRes.data || null)

    const txData = txRes.data || []
    const overdueData = (rentalsRes.data || []).filter(r => (Number(r.total_price || 0) - Number(r.paid_amount || 0)) > 0)
    setAllTransactions(txData)
    setOverdueRentals(overdueData)
    setVehicles(vehiclesRes.data || [])

    const monthTx = txData.filter(t => t.transaction_date >= monthStart && t.transaction_date <= monthEnd)
    const income = monthTx.filter(t => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const expense = monthTx.filter(t => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0)
    const profit = income - expense
    const margin = income > 0 ? Math.round((profit / income) * 100) : 0
    const pending = overdueData.reduce((s: number, r: any) => s + (Number(r.total_price || 0) - Number(r.paid_amount || 0)), 0)
    setStats({ income, expense, profit, margin, pending })

    const days = Array.from({ length: 10 }, (_, i) => {
      const d = subDays(now, 9 - i)
      const dateStr = format(d, 'yyyy-MM-dd')
      return {
        tarih: format(d, 'dd MMM', { locale: tr }),
        Gelir: txData.filter((t: any) => t.transaction_date === dateStr && t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0),
        Gider: txData.filter((t: any) => t.transaction_date === dateStr && t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0),
      }
    })
    setChartData(days)

    const expenseByCategory: Record<string, number> = {}
    monthTx.filter((t: any) => t.type === 'expense').forEach((t: any) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Number(t.amount)
    })
    setPieData(Object.entries(expenseByCategory).map(([key, value]) => ({ name: CATEGORY_LABELS[key] || key, value, color: EXPENSE_COLORS[key] || '#6B7280' })))
    setLoading(false)
  }, [supabase])

  const buildReportData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i)
      return { date: d, start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd'), label: format(d, 'MMM yy', { locale: tr }) }
    })
    const [txRes, rentalsRes, vehiclesRes] = await Promise.all([
      supabase.from('transactions').select('*').gte('transaction_date', months[0].start),
      supabase.from('rentals').select('*, vehicles(plate, brand, model)'),
      supabase.from('vehicles').select('*'),
    ])
    const txData = txRes.data || []
    const rentalsData = rentalsRes.data || []
    const vehiclesData = vehiclesRes.data || []

    setMonthlyData(months.map(m => {
      const monthTx = txData.filter((t: any) => t.transaction_date >= m.start && t.transaction_date <= m.end)
      const income = monthTx.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0)
      const expense = monthTx.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0)
      // Aylık kiralama sayısı (o ay başlayan kiralamalar)
      const rentals = rentalsData.filter((r: any) => r.start_date >= m.start && r.start_date <= m.end).length
      return { ay: m.label, Gelir: income, Gider: expense, 'Net Kâr': income - expense, Kiralama: rentals }
    }))

    setVehicleStats(vehiclesData.map((v: any) => ({
      plate: v.plate, brand: v.brand,
      rentals: rentalsData.filter((r: any) => r.vehicle_id === v.id).length,
      income: rentalsData.filter((r: any) => r.vehicle_id === v.id).reduce((s: number, r: any) => s + Number(r.paid_amount || 0), 0),
    })).sort((a: any, b: any) => b.rentals - a.rentals))
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (activeTab === 'raporlar') buildReportData() }, [activeTab, buildReportData])
  useEffect(() => { if (activeTab === 'subeler' && profile && !profile.is_branch) fetchBranches() }, [activeTab, profile])

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles')
      .select('id, branch_name, email, phone, created_at')
      .eq('branch_of_user_id', user.id)
      .order('created_at', { ascending: true })
    setBranches(data || [])
    setBranchesLoading(false)
  }, [supabase])

  const branchLimit = profile?.subscription_plan === 'premium' ? 2 + (profile?.extra_branch_slots || 0) : 0

  const handleCreateBranch = async () => {
    setBranchError('')
    setBranchSuccess('')
    if (!branchForm.branch_name.trim() || !branchForm.email.trim()) {
      setBranchError('Şube adı ve e-posta zorunludur.')
      return
    }
    setCreatingBranch(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreatingBranch(false); return }

    try {
      const res = await fetch('/api/sube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...branchForm, parent_user_id: user.id }),
      })
      const result = await res.json()
      if (!res.ok) {
        setBranchError(result.error || 'Şube oluşturulamadı.')
        setCreatingBranch(false)
        return
      }
      setBranchSuccess(result.message)
      setBranchForm({ branch_name: '', email: '', phone: '' })
      fetchBranches()
    } catch (e: any) {
      setBranchError('Bir hata oluştu: ' + e.message)
    }
    setCreatingBranch(false)
  }

  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm('Bu şubeyi kalıcı olarak silmek istediğinize emin misiniz? Şubenin tüm araç ve kiralama verileri de silinecek.')) return
    setDeletingBranchId(branchId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const res = await fetch('/api/sube', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: branchId, parent_user_id: user.id }),
      })
      const result = await res.json()
      if (!res.ok) {
        alert(result.error || 'Şube silinemedi.')
        setDeletingBranchId(null)
        return
      }
      setBranches(prev => prev.filter(b => b.id !== branchId))
    } catch (e: any) {
      alert('Bir hata oluştu: ' + e.message)
    }
    setDeletingBranchId(null)
  }

  const openBranchDetail = async (branch: any) => {
    setSelectedBranch(branch)
    setBranchDetailTab('ozet')
    setNewBranchPassword('')
    setBranchDetailLoading(true)
    const [vRes, rRes, tRes, allTRes] = await Promise.all([
      supabase.from('vehicles').select('*').eq('user_id', branch.id),
      supabase.from('rentals').select('*, vehicles(plate, brand, model), performed_by_profile:profiles!rentals_performed_by_fkey(full_name)').eq('user_id', branch.id).order('start_date', { ascending: false }).limit(50),
      supabase.from('transactions').select('*, performed_by_profile:profiles!transactions_performed_by_fkey(full_name)').eq('user_id', branch.id).order('transaction_date', { ascending: false }).limit(50),
      supabase.from('transactions').select('*').eq('user_id', branch.id),
    ])
    setBranchDetail({ vehicles: vRes.data || [], rentals: rRes.data || [], transactions: tRes.data || [], allTransactions: allTRes.data || [] })
    setBranchDetailLoading(false)
  }

  const handleResetBranchPassword = async () => {
    if (!selectedBranch) return
    if (!confirm(`${selectedBranch.branch_name} şubesinin şifresini sıfırlamak istediğinize emin misiniz? Şube bir dahaki girişte yeni şifreyi kullanmak zorunda kalacak.`)) return
    setResettingBranchPw(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const res = await fetch('/api/sube', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: selectedBranch.id, parent_user_id: user.id, action: 'reset_password' }),
      })
      const result = await res.json()
      if (!res.ok) {
        alert(result.error || 'Şifre sıfırlanamadı.')
        setResettingBranchPw(false)
        return
      }
      setNewBranchPassword(result.new_password)
    } catch (e: any) {
      alert('Bir hata oluştu: ' + e.message)
    }
    setResettingBranchPw(false)
  }

  // Gelir/Gider ekleme
  const handleAdd = async () => {
    if (!form.amount || !form.description || !form.category) { alert('Lütfen zorunlu alanları doldurun.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let receipt_url = null
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('receipts').upload(path, receiptFile)
      if (uploadError) {
        alert('Fiş/fatura yüklenemedi: ' + uploadError.message + '\n\nİşlem belgesiz kaydedilecek.')
        console.error('Receipt upload error:', uploadError)
      } else if (uploadData) {
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
        receipt_url = urlData?.publicUrl
      }
    }

    await supabase.from('transactions').insert({
      user_id: user.id, type: addType, category: form.category,
      amount: Number(form.amount), description: form.description,
      transaction_date: form.transaction_date,
      vehicle_id: form.vehicle_id || null, receipt_url, status: 'completed',
    })

    setShowAddModal(false)
    setForm({ category: 'arac_kiralama', amount: '', description: '', transaction_date: format(new Date(), 'yyyy-MM-dd'), vehicle_id: '' })
    setReceiptFile(null)
    fetchData()
    setSaving(false)
  }

  // İşlem düzenleme
  const openEdit = (tx: any) => {
    setEditingTx(tx)
    setEditForm({ category: tx.category, amount: String(tx.amount), description: tx.description || '', transaction_date: tx.transaction_date, vehicle_id: tx.vehicle_id || '' })
    setEditFile(null)
    setShowEditModal(true)
  }

  const handleEdit = async () => {
    if (!editingTx) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let receipt_url = editingTx.receipt_url
    if (editFile) {
      const ext = editFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('receipts').upload(path, editFile)
      if (uploadError) {
        alert('Fiş/fatura yüklenemedi: ' + uploadError.message)
        console.error('Receipt upload error:', uploadError)
      } else if (uploadData) {
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
        receipt_url = urlData?.publicUrl
      }
    }

    await supabase.from('transactions').update({
      category: editForm.category,
      amount: Number(editForm.amount),
      description: editForm.description,
      transaction_date: editForm.transaction_date,
      vehicle_id: editForm.vehicle_id || null,
      receipt_url,
    }).eq('id', editingTx.id)

    setShowEditModal(false)
    setEditingTx(null)
    fetchData()
    setSaving(false)
  }

  // İşlem silme
  const handleDelete = async (id: string) => {
    if (!confirm('Bu işlemi silmek istediğinize emin misiniz?')) return
    setDeletingId(id)
    await supabase.from('transactions').delete().eq('id', id)
    setAllTransactions(prev => prev.filter(t => t.id !== id))
    setDeletingId(null)
  }

  const filteredTx = allTransactions.filter(t => {
    if (txTypeFilter !== 'all' && t.type !== txTypeFilter) return false
    if (txCatFilter !== 'all' && t.category !== txCatFilter) return false
    if (txDateFrom && t.transaction_date < txDateFrom) return false
    if (txDateTo && t.transaction_date > txDateTo) return false
    if (txSearch) {
      const q = txSearch.toLowerCase()
      return t.description?.toLowerCase().includes(q) || (CATEGORY_LABELS[t.category] || '').toLowerCase().includes(q)
    }
    return true
  })
  const txDateFilterActive = !!(txDateFrom || txDateTo)
  const clearTxDateFilter = () => { setTxDateFrom(''); setTxDateTo('') }

  const reportMonthStart = format(startOfMonth(reportMonth), 'yyyy-MM-dd')
  const reportMonthEnd = format(endOfMonth(reportMonth), 'yyyy-MM-dd')
  const reportMonthTx = allTransactions.filter(t => t.transaction_date >= reportMonthStart && t.transaction_date <= reportMonthEnd)
  const reportMonthIncome = reportMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const reportMonthExpense = reportMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  // Seçili aydaki kiralama sayısı (raporlar için)
  const reportMonthRentals = monthlyData.find(m => m.ay === format(reportMonth, 'MMM yy', { locale: tr }))?.Kiralama ?? 0

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mini Muhasebe</h1>
          <p className="text-gray-400 text-sm mt-1">Gelir, gider, tüm kayıtlar ve aylık raporlar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setAddType('expense'); setForm(f => ({ ...f, category: 'akaryakit' })); setShowAddModal(true) }}
            className="flex items-center gap-2 bg-[#1E1E1E] border border-[#2A2A2A] text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-[#252525] transition-colors">
            <Plus size={16} /> Gider Ekle
          </button>
          <button onClick={() => { setAddType('income'); setForm(f => ({ ...f, category: 'arac_kiralama' })); setShowAddModal(true) }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Gelir Ekle
          </button>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-1 w-fit gap-1 flex-wrap">
        {([
          { key: 'ozet', label: 'Bu Ay Özeti', icon: DollarSign },
          { key: 'islemler', label: 'Tüm İşlemler', icon: Filter },
          { key: 'evrak', label: 'Evrak Arşivi', icon: FileText },
          { key: 'raporlar', label: 'Aylık Raporlar', icon: BarChart3 },
          ...(profile && !profile.is_branch ? [{ key: 'subeler' as Tab, label: 'Şubelerim', icon: Building2 }] : []),
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${activeTab === key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ===== ÖZET ===== */}
      {activeTab === 'ozet' && (
        <>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Bu Ay Gelir', value: `₺${stats.income.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'text-green-400', border: 'border-green-400/20' },
              { label: 'Bu Ay Gider', value: `₺${stats.expense.toLocaleString('tr-TR')}`, icon: TrendingDown, color: 'text-red-400', border: 'border-red-400/20' },
              { label: 'Net Kâr', value: `₺${stats.profit.toLocaleString('tr-TR')}`, icon: DollarSign, color: stats.profit >= 0 ? 'text-green-400' : 'text-red-400', border: stats.profit >= 0 ? 'border-green-400/20' : 'border-red-400/20' },
              { label: 'Kâr Marjı', value: `%${stats.margin}`, icon: TrendingUp, color: 'text-blue-400', border: 'border-blue-400/20' },
              { label: 'Bekleyen Tahsilat', value: `₺${stats.pending.toLocaleString('tr-TR')}`, icon: Clock, color: 'text-yellow-400', border: 'border-yellow-400/20' },
            ].map((s, i) => (
              <div key={i} className={`bg-[#141414] border ${s.border} rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-xs leading-tight">{s.label}</span>
                  <s.icon size={14} className={s.color} />
                </div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Son 10 Günlük Gelir / Gider</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="tarih" tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `₺${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']} />
                  <Line type="monotone" dataKey="Gelir" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 3 }} />
                  <Line type="monotone" dataKey="Gider" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Gider Dağılımı</h3>
              {pieData.length === 0
                ? <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Bu ay gider yok</div>
                : <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']} />
                      <Legend iconType="circle" iconSize={8} formatter={value => <span style={{ color: '#9CA3AF', fontSize: 11 }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Son işlemler */}
            <div className="col-span-2 bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Son İşlemler</h3>
              <div className="space-y-2">
                {allTransactions.slice(0, 8).length === 0
                  ? <p className="text-gray-500 text-sm">Henüz işlem yok</p>
                  : allTransactions.slice(0, 8).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-[#1E1E1E] rounded-lg group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-green-400' : 'bg-red-400'}`} />
                        <div className="min-w-0">
                          <div className="text-white text-sm font-medium truncate">{t.description}</div>
                          <div className="text-gray-500 text-xs">{format(new Date(t.transaction_date), 'dd MMM yyyy', { locale: tr })} · {CATEGORY_LABELS[t.category] || t.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        {t.receipt_url && (
                          <a href={toProxyUrl(t.receipt_url) || '#'} target="_blank" rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-blue-400 text-xs hover:text-blue-300 transition-all">
                            <Eye size={11} /> Fiş
                          </a>
                        )}
                        <div className={`font-semibold text-sm ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {t.type === 'income' ? '+' : '-'}₺{Number(t.amount).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    </div>
                  ))
                }
                {allTransactions.length > 8 && (
                  <button onClick={() => setActiveTab('islemler')} className="w-full text-center text-sm text-red-400 hover:text-red-300 py-2 transition-colors">
                    Tüm işlemleri gör ({allTransactions.length} kayıt) →
                  </button>
                )}
              </div>
            </div>

            {/* BEKLEyen TAHSİLATLAR — yeniden tasarlandı */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <AlertCircle size={14} className="text-yellow-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">Bekleyen Tahsilatlar</h3>
                </div>
                {overdueRentals.length > 0 && (
                  <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2.5 py-1 rounded-full border border-yellow-500/30">
                    {overdueRentals.length}
                  </span>
                )}
              </div>

              {overdueRentals.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-5">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                    <Check size={20} className="text-green-400" />
                  </div>
                  <p className="text-green-400 font-medium text-sm">Tüm tahsilatlar tamam</p>
                  <p className="text-gray-600 text-xs mt-1">Bekleyen ödeme bulunmuyor</p>
                </div>
              ) : (
                <>
                  {/* Toplam tutar */}
                  <div className="px-5 py-3 bg-yellow-500/5 border-b border-yellow-500/10 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Toplam Bekleyen</span>
                      <span className="text-yellow-400 font-bold text-base">
                        ₺{overdueRentals.reduce((s, r) => s + (Number(r.total_price || 0) - Number(r.paid_amount || 0)), 0).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-[#1E1E1E]">
                    {overdueRentals.map(r => {
                      const remaining = Number(r.total_price || 0) - Number(r.paid_amount || 0)
                      const isOverdue = new Date(r.end_date) < new Date()
                      return (
                        <div key={r.id} className="px-5 py-4 hover:bg-[#1A1A1A] transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <div className="text-white text-sm font-semibold truncate">{r.customer_name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Car size={10} className="text-gray-600 flex-shrink-0" />
                                <span className="text-gray-500 text-xs">{r.vehicles?.plate} · {r.vehicles?.brand} {r.vehicles?.model}</span>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-yellow-400 font-bold text-sm">₺{remaining.toLocaleString('tr-TR')}</div>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                                r.payment_status === 'partial' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {r.payment_status === 'partial' ? 'Kısmi' : 'Ödenmedi'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-600'}`}>
                              {isOverdue ? '⚠ ' : ''}Bitiş: {format(new Date(r.end_date), 'dd.MM.yyyy')}
                            </span>
                            {r.payment_status === 'partial' && (
                              <div className="text-xs text-gray-600">
                                Ödenen: <span className="text-green-400">₺{Number(r.paid_amount || 0).toLocaleString('tr-TR')}</span>
                              </div>
                            )}
                          </div>
                          {/* Kısmi ödeme progress bar */}
                          {r.payment_status === 'partial' && Number(r.total_price) > 0 && (
                            <div className="mt-2 h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all"
                                style={{ width: `${Math.round((Number(r.paid_amount) / Number(r.total_price)) * 100)}%` }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== TÜM İŞLEMLER ===== */}
      {activeTab === 'islemler' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Açıklama veya kategori ara..."
                className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:border-red-500 outline-none" />
            </div>
            <select value={txTypeFilter} onChange={e => setTxTypeFilter(e.target.value as any)} className="bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none">
              <option value="all">Tüm Türler</option>
              <option value="income">Gelirler</option>
              <option value="expense">Giderler</option>
            </select>
            <select value={txCatFilter} onChange={e => setTxCatFilter(e.target.value)} className="bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none">
              <option value="all">Tüm Kategoriler</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <div className="flex items-center gap-1.5">
              <DatePicker value={txDateFrom} onChange={setTxDateFrom} placeholder="Başlangıç"
                className="w-[140px] bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-2.5 py-2 text-xs focus:border-red-500 outline-none flex items-center justify-between gap-1.5 hover:border-[#3A3A3A] transition-colors" />
              <span className="text-gray-600 text-xs">–</span>
              <DatePicker value={txDateTo} onChange={setTxDateTo} placeholder="Bitiş" minDate={txDateFrom || undefined}
                className="w-[140px] bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-2.5 py-2 text-xs focus:border-red-500 outline-none flex items-center justify-between gap-1.5 hover:border-[#3A3A3A] transition-colors" />
              {txDateFilterActive && (
                <button onClick={clearTxDateFilter} title="Tarih filtresini temizle"
                  className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
            <span className="text-gray-500 text-sm ml-auto">{filteredTx.length} kayıt</span>
          </div>

          {filteredTx.length > 0 && (
            <div className="px-4 py-2 border-b border-[#2A2A2A] flex gap-6 bg-[#1A1A1A]">
              <span className="text-green-400 text-sm font-medium">Gelir: +₺{filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0).toLocaleString('tr-TR')}</span>
              <span className="text-red-400 text-sm font-medium">Gider: -₺{filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0).toLocaleString('tr-TR')}</span>
              <span className="text-gray-400 text-sm ml-auto">Net: ₺{(filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) - filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)).toLocaleString('tr-TR')}</span>
            </div>
          )}

          <div className="divide-y divide-[#1A1A1A] max-h-[600px] overflow-y-auto">
            {filteredTx.length === 0
              ? <div className="text-center text-gray-500 py-16 text-sm">Kayıt bulunamadı</div>
              : filteredTx.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#1E1E1E] transition-colors group">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{t.description}</div>
                    <div className="text-gray-500 text-xs flex items-center gap-1.5">
                      <span>{format(new Date(t.transaction_date), 'dd MMM yyyy', { locale: tr })} · {CATEGORY_LABELS[t.category] || t.category}</span>
                      {t.performed_by_profile?.full_name && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <User2 size={10} /> {t.performed_by_profile.full_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fiş/fatura göster */}
                  {t.receipt_url && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={toProxyUrl(t.receipt_url) || '#'} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs border border-blue-400/20 px-2 py-1 rounded-lg transition-colors">
                        <Eye size={10} /> Fiş
                      </a>
                      <button type="button" onClick={async () => {
                        try {
                          const res = await fetch(toProxyUrl(t.receipt_url) || t.receipt_url)
                          const blob = await res.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.download = t.receipt_url.split('/').pop() ?? 'fis'; a.click()
                          URL.revokeObjectURL(url)
                        } catch { window.open(t.receipt_url, '_blank') }
                      }} className="flex items-center gap-1 text-gray-400 hover:text-white text-xs border border-[#2A2A2A] px-2 py-1 rounded-lg transition-colors">
                        <Download size={10} /> İndir
                      </button>
                    </div>
                  )}

                  <div className={`font-semibold text-sm flex-shrink-0 ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}₺{Number(t.amount).toLocaleString('tr-TR')}
                  </div>

                  {/* Düzenle / Sil butonları */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => openEdit(t)} title="Düzenle"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#2A2A2A] transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} title="Sil"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ===== EVRAK ARŞİVİ ===== */}
      {activeTab === 'evrak' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Açıklama veya kategori ara..."
                className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:border-red-500 outline-none" />
            </div>
            <select value={txTypeFilter} onChange={e => setTxTypeFilter(e.target.value as any)} className="bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none">
              <option value="all">Tüm Türler</option>
              <option value="income">Gelirler</option>
              <option value="expense">Giderler</option>
            </select>
            <select value={txCatFilter} onChange={e => setTxCatFilter(e.target.value)} className="bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none">
              <option value="all">Tüm Kategoriler</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <div className="flex items-center gap-1.5">
              <DatePicker value={txDateFrom} onChange={setTxDateFrom} placeholder="Başlangıç"
                className="w-[140px] bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-2.5 py-2 text-xs focus:border-red-500 outline-none flex items-center justify-between gap-1.5 hover:border-[#3A3A3A] transition-colors" />
              <span className="text-gray-600 text-xs">–</span>
              <DatePicker value={txDateTo} onChange={setTxDateTo} placeholder="Bitiş" minDate={txDateFrom || undefined}
                className="w-[140px] bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-2.5 py-2 text-xs focus:border-red-500 outline-none flex items-center justify-between gap-1.5 hover:border-[#3A3A3A] transition-colors" />
              {txDateFilterActive && (
                <button onClick={clearTxDateFilter} title="Tarih filtresini temizle"
                  className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
            <span className="text-gray-500 text-sm ml-auto">
              {filteredTx.filter(t => t.receipt_url).length} belge
            </span>
          </div>

          <div className="divide-y divide-[#1A1A1A] max-h-[600px] overflow-y-auto">
            {filteredTx.filter(t => t.receipt_url).length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <FileText size={32} className="mx-auto mb-3 text-gray-600" />
                <p className="text-sm">Belge eklenmiş işlem bulunamadı</p>
                <p className="text-xs text-gray-600 mt-1">Gelir/gider eklerken fiş veya fatura yüklediğinizde burada görünecek</p>
              </div>
            ) : filteredTx.filter(t => t.receipt_url).map(t => {
              const isPdf = t.receipt_url.toLowerCase().includes('.pdf')
              return (
                <div key={t.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#1E1E1E] transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                    <FileText size={16} className={isPdf ? 'text-red-400' : 'text-blue-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-white text-sm font-medium truncate">{t.description}</span>
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {format(new Date(t.transaction_date), 'dd MMM yyyy', { locale: tr })} · {CATEGORY_LABELS[t.category] || t.category}
                    </div>
                  </div>
                  <div className={`font-semibold text-sm flex-shrink-0 ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}₺{Number(t.amount).toLocaleString('tr-TR')}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={toProxyUrl(t.receipt_url) || '#'} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs border border-blue-400/20 px-2.5 py-1.5 rounded-lg transition-colors">
                      <Eye size={11} /> Görüntüle
                    </a>
                    <button type="button" onClick={async () => {
                      try {
                        const res = await fetch(toProxyUrl(t.receipt_url) || t.receipt_url)
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = t.receipt_url.split('/').pop() ?? 'belge'; a.click()
                        URL.revokeObjectURL(url)
                      } catch { window.open(t.receipt_url, '_blank') }
                    }} className="flex items-center gap-1 text-gray-400 hover:text-white text-xs border border-[#2A2A2A] px-2.5 py-1.5 rounded-lg transition-colors">
                      <Download size={11} /> İndir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== RAPORLAR ===== */}
      {activeTab === 'raporlar' && (
        <>
          {/* Ay seçici */}
          <div className="flex items-center gap-4">
            <button onClick={() => setReportMonth(m => subMonths(m, 1))}
              className="p-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-white font-semibold text-lg min-w-[180px] text-center">{format(reportMonth, 'MMMM yyyy', { locale: tr })}</h2>
            <button onClick={() => setReportMonth(m => { const next = new Date(m.getFullYear(), m.getMonth() + 1, 1); return next > new Date() ? m : next })}
              className="p-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Seçili ay özet kartları */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: `${format(reportMonth, 'MMMM', { locale: tr })} Geliri`, value: `₺${reportMonthIncome.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
              { label: `${format(reportMonth, 'MMMM', { locale: tr })} Gideri`, value: `₺${reportMonthExpense.toLocaleString('tr-TR')}`, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10' },
              { label: 'Net Kâr', value: `₺${(reportMonthIncome - reportMonthExpense).toLocaleString('tr-TR')}`, icon: DollarSign, color: (reportMonthIncome - reportMonthExpense) >= 0 ? 'text-green-400' : 'text-red-400', bg: 'bg-blue-400/10' },
              // Aylık kiralama sayısı düzeltildi
              { label: `${format(reportMonth, 'MMMM', { locale: tr })} Kiralamalar`, value: `${reportMonthRentals} kiralama`, icon: Car, color: 'text-purple-400', bg: 'bg-purple-400/10' },
            ].map((s, i) => (
              <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">{s.label}</span>
                  <div className={`${s.bg} p-2 rounded-lg`}><s.icon size={14} className={s.color} /></div>
                </div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Seçili ay işlem listesi */}
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <h3 className="text-white font-semibold">{format(reportMonth, 'MMMM yyyy', { locale: tr })} İşlemleri</h3>
              <span className="text-gray-500 text-sm">{reportMonthTx.length} kayıt</span>
            </div>
            <div className="divide-y divide-[#1A1A1A] max-h-60 overflow-y-auto">
              {reportMonthTx.length === 0
                ? <div className="text-center text-gray-500 py-8 text-sm">Bu ay işlem yok</div>
                : reportMonthTx.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#1E1E1E] transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div>
                        <div className="text-white text-sm">{t.description}</div>
                        <div className="text-gray-500 text-xs">{format(new Date(t.transaction_date), 'dd MMM', { locale: tr })} · {CATEGORY_LABELS[t.category] || t.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {t.receipt_url && (
                        <a href={toProxyUrl(t.receipt_url) || '#'} target="_blank" rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-blue-400 text-xs hover:text-blue-300 transition-all">
                          <Eye size={11} /> Fiş
                        </a>
                      )}
                      <div className={`font-semibold text-sm ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {t.type === 'income' ? '+' : '-'}₺{Number(t.amount).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* 6 aylık grafikler */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Son 6 Ay Gelir / Gider</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="ay" tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `₺${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']} />
                  <Legend formatter={v => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{v}</span>} />
                  <Bar dataKey="Gelir" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gider" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Son 6 Ay Net Kâr</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="ay" tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `₺${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']} />
                  <Bar dataKey="Net Kâr" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Araç bazlı performans */}
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#2A2A2A]">
              <h3 className="text-white font-semibold">Araç Bazlı Performans</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {['Plaka', 'Marka', 'Toplam Kiralama', 'Toplam Gelir'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicleStats.length === 0
                  ? <tr><td colSpan={4} className="text-center text-gray-500 py-8 text-sm">Henüz veri yok</td></tr>
                  : vehicleStats.map((v, i) => (
                    <tr key={i} className="border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors">
                      <td className="px-5 py-3 text-white font-bold">{v.plate}</td>
                      <td className="px-5 py-3 text-gray-400">{v.brand}</td>
                      <td className="px-5 py-3"><span className="text-blue-400 font-semibold">{v.rentals}</span> <span className="text-gray-500 text-xs">kez</span></td>
                      <td className="px-5 py-3 text-green-400 font-semibold">₺{v.income.toLocaleString('tr-TR')}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== ŞUBELERİM SEKMESİ ===== */}
      {activeTab === 'subeler' && (
        <>
          {branchLimit === 0 ? (
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
              <Building2 size={36} className="text-gray-600 mx-auto mb-3" />
              <div className="text-white font-semibold">Şube özelliği Premium plana özeldir</div>
              <div className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
                Şube açıp her şubenin araç, kiralama ve muhasebe verisini buradan tek yerden takip edebilmek için Premium plana geçebilirsiniz.
              </div>
              <a href="/abonelik" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl mt-4 transition-colors">
                Premium'a Geç
              </a>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-white font-semibold">Şubelerim</h3>
                  <p className="text-gray-500 text-sm mt-0.5">{branches.length} / {branchLimit} şube kullanılıyor</p>
                </div>
                <button onClick={() => { setShowAddBranchModal(true); setBranchError(''); setBranchSuccess('') }}
                  disabled={branches.length >= branchLimit}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
                  <Plus size={16} /> Şube Ekle
                </button>
              </div>

              {branchesLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={24} className="text-red-500 animate-spin" /></div>
              ) : branches.length === 0 ? (
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
                  <Building2 size={36} className="text-gray-600 mx-auto mb-3" />
                  <div className="text-white font-semibold">Henüz şubeniz yok</div>
                  <div className="text-gray-500 text-sm mt-1">İlk şubenizi ekleyerek başlayın.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {branches.map(b => (
                    <div key={b.id} className="bg-[#141414] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-xl p-4 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <button onClick={() => openBranchDetail(b)} className="flex items-start gap-3 text-left flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Building2 size={16} className="text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-white text-sm font-medium truncate">{b.branch_name}</div>
                            <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5 truncate"><Mail size={10} /> {b.email}</div>
                            {b.phone && <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5"><Phone size={10} /> {b.phone}</div>}
                          </div>
                        </button>
                        <button onClick={() => handleDeleteBranch(b.id)} disabled={deletingBranchId === b.id}
                          className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50">
                          {deletingBranchId === b.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                      <button onClick={() => openBranchDetail(b)} className="w-full text-center text-xs text-blue-400 hover:text-blue-300 mt-3 py-1.5 border-t border-[#1A1A1A] transition-colors">
                        Verileri Görüntüle
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
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
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                  {addType === 'income' ? (
                    <><option value="arac_kiralama">Araç Kiralama</option><option value="depozito">Depozito</option><option value="hasar_tahsilat">Hasar Tahsilat</option><option value="diger_gelir">Diğer Gelir</option></>
                  ) : (
                    <><option value="akaryakit">Akaryakıt</option><option value="arac_bakim">Araç Bakım</option><option value="personel">Personel</option><option value="ofis">Ofis Giderleri</option><option value="sigorta">Sigorta</option><option value="vergi">Vergi</option><option value="diger_gider">Diğer</option></>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Tutar (₺) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Tarih *</label>
                  <DatePicker value={form.transaction_date} onChange={d => setForm(f => ({ ...f, transaction_date: d }))} />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Açıklama *</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Kısa açıklama" className={inputCls} />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">İlgili Araç (opsiyonel)</label>
                <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} className={inputCls}>
                  <option value="">Araç seçin</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Fatura / Fiş (opsiyonel)</label>
                <label className={`flex items-center gap-3 w-full bg-[#1E1E1E] border border-dashed rounded-lg px-4 py-3 cursor-pointer transition-colors ${receiptFile ? 'border-green-500/50 bg-green-500/5' : 'border-[#3A3A3A] hover:border-red-500/50'}`}>
                  <Upload size={16} className={receiptFile ? 'text-green-400' : 'text-gray-500'} />
                  <span className={`text-sm ${receiptFile ? 'text-green-400' : 'text-gray-400'}`}>{receiptFile ? receiptFile.name : 'Dosya seç (PDF, JPG, PNG)'}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { if (e.target.files?.[0]) setReceiptFile(e.target.files[0]) }} />
                </label>
                {receiptFile && (
                  <button onClick={() => setReceiptFile(null)} className="text-xs text-gray-500 hover:text-red-400 mt-1 transition-colors">Dosyayı kaldır</button>
                )}
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

      {/* ===== DÜZENLE MODALİ ===== */}
      {showEditModal && editingTx && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold">İşlemi Düzenle</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Kategori *</label>
                <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                  {editingTx.type === 'income' ? (
                    <><option value="arac_kiralama">Araç Kiralama</option><option value="depozito">Depozito</option><option value="hasar_tahsilat">Hasar Tahsilat</option><option value="diger_gelir">Diğer Gelir</option></>
                  ) : (
                    <><option value="akaryakit">Akaryakıt</option><option value="arac_bakim">Araç Bakım</option><option value="personel">Personel</option><option value="ofis">Ofis Giderleri</option><option value="sigorta">Sigorta</option><option value="vergi">Vergi</option><option value="diger_gider">Diğer</option></>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Tutar (₺) *</label>
                  <input type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Tarih *</label>
                  <DatePicker value={editForm.transaction_date} onChange={d => setEditForm(f => ({ ...f, transaction_date: d }))} />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Açıklama *</label>
                <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">İlgili Araç</label>
                <select value={editForm.vehicle_id} onChange={e => setEditForm(f => ({ ...f, vehicle_id: e.target.value }))} className={inputCls}>
                  <option value="">Araç seçin</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Fatura / Fiş</label>
                {editingTx.receipt_url && !editFile && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-[#1E1E1E] rounded-lg border border-[#2A2A2A]">
                    <FileText size={13} className="text-blue-400" />
                    <span className="text-gray-400 text-xs flex-1">Mevcut dosya yüklü</span>
                    <a href={toProxyUrl(editingTx.receipt_url) || '#'} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1"><Eye size={11} /> Gör</a>
                  </div>
                )}
                <label className={`flex items-center gap-3 w-full bg-[#1E1E1E] border border-dashed rounded-lg px-4 py-3 cursor-pointer transition-colors ${editFile ? 'border-green-500/50 bg-green-500/5' : 'border-[#3A3A3A] hover:border-red-500/50'}`}>
                  <Upload size={16} className={editFile ? 'text-green-400' : 'text-gray-500'} />
                  <span className={`text-sm ${editFile ? 'text-green-400' : 'text-gray-400'}`}>{editFile ? editFile.name : editingTx.receipt_url ? 'Yeni dosya seç (değiştirmek için)' : 'Dosya seç'}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { if (e.target.files?.[0]) setEditFile(e.target.files[0]) }} />
                </label>
                {editFile && <button onClick={() => setEditFile(null)} className="text-xs text-gray-500 hover:text-red-400 mt-1 transition-colors">Seçimi iptal et</button>}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#2A2A2A]">
              <button onClick={() => setShowEditModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleEdit} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ŞUBE EKLE MODALİ ===== */}
      {showAddBranchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddBranchModal(false)}>
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold">Yeni Şube Ekle</h2>
              <button onClick={() => setShowAddBranchModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {branchError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">{branchError}</div>}
              {branchSuccess && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg p-3">{branchSuccess}</div>}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Şube Adı *</label>
                <input value={branchForm.branch_name} onChange={e => setBranchForm(f => ({ ...f, branch_name: e.target.value }))}
                  placeholder="Örn: Kadıköy Şubesi" className={inputCls} />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Şube E-posta *</label>
                <input type="email" value={branchForm.email} onChange={e => setBranchForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="sube@firma.com" className={inputCls} />
                <p className="text-gray-600 text-xs mt-1">Şube bu e-posta ile giriş yapacak, geçici şifre size gösterilecek.</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Telefon</label>
                <input value={branchForm.phone} onChange={e => setBranchForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="0555 555 55 55" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#2A2A2A]">
              <button onClick={() => setShowAddBranchModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleCreateBranch} disabled={creatingBranch} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {creatingBranch ? 'Oluşturuluyor...' : 'Şube Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ŞUBE DETAY MODALİ ===== */}
      {selectedBranch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedBranch(null); setBranchDetail(null) }}>
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Building2 size={16} className="text-blue-400" /></div>
                <div>
                  <h2 className="text-white font-semibold">{selectedBranch.branch_name}</h2>
                  <p className="text-gray-500 text-xs">{selectedBranch.email}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedBranch(null); setBranchDetail(null) }} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="flex border-b border-[#2A2A2A] px-5 flex-shrink-0 overflow-x-auto">
              {([
                { key: 'ozet', label: 'Özet' },
                { key: 'raporlar', label: 'Aylık Raporlar' },
                { key: 'evrak', label: 'Evrak Arşivi' },
                { key: 'ayarlar', label: 'Ayarlar' },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setBranchDetailTab(t.key)}
                  className={`px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${branchDetailTab === t.key ? 'border-red-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-5 space-y-5 flex-1">
              {branchDetailLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={24} className="text-red-500 animate-spin" /></div>
              ) : branchDetail && branchDetailTab === 'ozet' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#1E1E1E] rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Araç Sayısı</div>
                      <div className="text-white font-bold text-lg mt-1">{branchDetail.vehicles.length}</div>
                    </div>
                    <div className="bg-[#1E1E1E] rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Toplam Gelir</div>
                      <div className="text-green-400 font-bold text-lg mt-1">
                        ₺{branchDetail.transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0).toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <div className="bg-[#1E1E1E] rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Toplam Gider</div>
                      <div className="text-red-400 font-bold text-lg mt-1">
                        ₺{branchDetail.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white text-sm font-semibold mb-2">Son Kiralamalar</h3>
                    <div className="bg-[#1E1E1E] rounded-lg overflow-hidden">
                      {branchDetail.rentals.length === 0 ? (
                        <div className="text-center text-gray-500 text-sm py-6">Henüz kiralama yok</div>
                      ) : branchDetail.rentals.slice(0, 8).map(r => (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2.5 border-b border-[#2A2A2A] last:border-0 text-sm">
                          <div className="min-w-0">
                            <div className="text-white truncate">{r.customer_name}</div>
                            <div className="text-gray-500 text-xs flex items-center gap-1.5">
                              <span>{r.vehicles?.plate} · {format(new Date(r.start_date), 'd MMM', { locale: tr })} – {format(new Date(r.end_date), 'd MMM yyyy', { locale: tr })}</span>
                              {r.performed_by_profile?.full_name && (
                                <span className="flex items-center gap-1 text-gray-600"><User2 size={10} /> {r.performed_by_profile.full_name}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-green-400 font-medium flex-shrink-0">₺{Number(r.total_price || 0).toLocaleString('tr-TR')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white text-sm font-semibold mb-2">Son İşlemler</h3>
                    <div className="bg-[#1E1E1E] rounded-lg overflow-hidden">
                      {branchDetail.transactions.length === 0 ? (
                        <div className="text-center text-gray-500 text-sm py-6">Henüz işlem yok</div>
                      ) : branchDetail.transactions.slice(0, 8).map(t => (
                        <div key={t.id} className="flex items-center justify-between px-3 py-2.5 border-b border-[#2A2A2A] last:border-0 text-sm">
                          <div className="min-w-0">
                            <div className="text-white truncate">{t.description}</div>
                            <div className="text-gray-500 text-xs flex items-center gap-1.5">
                              <span>{CATEGORY_LABELS[t.category] || t.category} · {format(new Date(t.transaction_date), 'd MMM yyyy', { locale: tr })}</span>
                              {t.performed_by_profile?.full_name && (
                                <span className="flex items-center gap-1 text-gray-600"><User2 size={10} /> {t.performed_by_profile.full_name}</span>
                              )}
                            </div>
                          </div>
                          <span className={`font-medium flex-shrink-0 ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                            {t.type === 'income' ? '+' : '-'}₺{Number(t.amount).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* AYLIK RAPORLAR SEKMESİ */}
              {!branchDetailLoading && branchDetail && branchDetailTab === 'raporlar' && (() => {
                const months = Array.from({ length: 12 }, (_, i) => {
                  const d = subMonths(new Date(), 11 - i)
                  return { label: format(d, 'MMM yyyy', { locale: tr }), start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd') }
                })
                const rows = months.map(m => {
                  const monthTx = branchDetail.allTransactions.filter(t => t.transaction_date >= m.start && t.transaction_date <= m.end)
                  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
                  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
                  return { ...m, income, expense, profit: income - expense }
                })
                return (
                  <div className="bg-[#1E1E1E] rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2A2A2A] text-gray-500 text-xs">
                          <th className="text-left px-3 py-2.5">Ay</th>
                          <th className="text-right px-3 py-2.5">Gelir</th>
                          <th className="text-right px-3 py-2.5">Gider</th>
                          <th className="text-right px-3 py-2.5">Kâr/Zarar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className="border-b border-[#2A2A2A] last:border-0">
                            <td className="px-3 py-2.5 text-gray-300">{r.label}</td>
                            <td className="px-3 py-2.5 text-right text-green-400">₺{r.income.toLocaleString('tr-TR')}</td>
                            <td className="px-3 py-2.5 text-right text-red-400">₺{r.expense.toLocaleString('tr-TR')}</td>
                            <td className={`px-3 py-2.5 text-right font-medium ${r.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>₺{r.profit.toLocaleString('tr-TR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}

              {/* EVRAK ARŞİVİ SEKMESİ */}
              {!branchDetailLoading && branchDetail && branchDetailTab === 'evrak' && (
                <div className="bg-[#1E1E1E] rounded-lg overflow-hidden">
                  {branchDetail.allTransactions.filter(t => t.receipt_url).length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-12">Bu şubeye ait belge bulunmuyor</div>
                  ) : branchDetail.allTransactions.filter(t => t.receipt_url).map(t => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2.5 border-b border-[#2A2A2A] last:border-0 text-sm">
                      <div className="min-w-0">
                        <div className="text-white truncate">{t.description}</div>
                        <div className="text-gray-500 text-xs">{CATEGORY_LABELS[t.category] || t.category} · {format(new Date(t.transaction_date), 'd MMM yyyy', { locale: tr })}</div>
                      </div>
                      <a href={toProxyUrl(t.receipt_url) || undefined} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs flex-shrink-0">
                        <Eye size={13} /> Görüntüle
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* AYARLAR SEKMESİ */}
              {!branchDetailLoading && branchDetail && branchDetailTab === 'ayarlar' && (
                <div className="space-y-4">
                  <div className="bg-[#1E1E1E] rounded-lg p-4">
                    <div className="text-white text-sm font-medium mb-1">Şube Şifresini Sıfırla</div>
                    <p className="text-gray-500 text-xs mb-3">
                      Güvenlik nedeniyle mevcut şifre görüntülenemez. Şube şifresini unuttuysa, buradan yeni bir
                      geçici şifre oluşturup şubeyle paylaşabilirsiniz.
                    </p>
                    {newBranchPassword ? (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-green-400 text-xs">Yeni şifre oluşturuldu:</div>
                          <div className="text-white font-mono text-sm mt-0.5">{newBranchPassword}</div>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(newBranchPassword) }}
                          className="text-xs text-green-400 hover:text-green-300 border border-green-500/30 px-2.5 py-1.5 rounded-lg flex-shrink-0">
                          Kopyala
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleResetBranchPassword} disabled={resettingBranchPw}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                        {resettingBranchPw ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
                      </button>
                    )}
                  </div>
                  <div className="bg-[#1E1E1E] rounded-lg p-4">
                    <div className="text-white text-sm font-medium mb-1">Şube Bilgileri</div>
                    <div className="text-gray-500 text-xs space-y-1 mt-2">
                      <div>E-posta: <span className="text-gray-300">{selectedBranch.email}</span></div>
                      {selectedBranch.phone && <div>Telefon: <span className="text-gray-300">{selectedBranch.phone}</span></div>}
                      <div>Oluşturulma: <span className="text-gray-300">{format(new Date(selectedBranch.created_at), 'd MMMM yyyy', { locale: tr })}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}