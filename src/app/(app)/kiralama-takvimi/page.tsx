'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInDays, addMonths, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Upload, Eye, Car, Clock, TrendingUp, AlertCircle, List, Calendar, Search, Download, Edit2, Trash2, CalendarDays, AlertTriangle } from 'lucide-react'
import { hashTC } from '@/lib/crypto'

const VEHICLE_COLORS = ['#E02424','#3B82F6','#22C55E','#F59E0B','#A855F7','#EC4899','#14B8A6','#F97316','#6366F1','#84CC16']

function maskTC(tc: string) {
  if (!tc || tc.length < 11) return '***'
  return tc.slice(0, 3) + '****' + tc.slice(7)
}
function maskPhone(phone: string) {
  if (!phone) return '***'
  const clean = phone.replace(/\D/g, '')
  return clean.length >= 10 ? clean.slice(0, 3) + ' *** ** ' + clean.slice(-2) : '***'
}

// Date picker bileşeni
function DatePicker({ value, onChange, label, min }: { value: string, onChange: (v: string) => void, label: string, min?: string }) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => value ? new Date(value) : new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })
  const firstDay = (startOfMonth(viewMonth).getDay() + 6) % 7

  return (
    <div className="relative" ref={ref}>
      <label className="text-gray-400 text-sm mb-1.5 block">{label}</label>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-left rounded-lg px-3 py-2.5 text-sm flex items-center justify-between hover:border-red-500/50 outline-none focus:border-red-500 transition-colors">
        <span className={value ? 'text-white' : 'text-gray-600'}>{value ? format(new Date(value), 'dd MMMM yyyy', { locale: tr }) : 'Tarih seçin'}</span>
        <CalendarDays size={14} className="text-gray-500" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-[100] bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 shadow-2xl w-72">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-1 hover:bg-[#2A2A2A] rounded text-gray-400"><ChevronLeft size={14} /></button>
            <span className="text-white text-sm font-medium">{format(viewMonth, 'MMMM yyyy', { locale: tr })}</span>
            <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1 hover:bg-[#2A2A2A] rounded text-gray-400"><ChevronRight size={14} /></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => (
              <div key={d} className="text-center text-[10px] text-gray-600 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const isSelected = value === dateStr
              const isToday = isSameDay(day, new Date())
              const isDisabled = min ? dateStr < min : false
              return (
                <button key={dateStr} type="button" disabled={isDisabled}
                  onClick={() => { onChange(dateStr); setOpen(false) }}
                  className={`text-center text-xs py-1.5 rounded-lg transition-colors ${isDisabled ? 'text-gray-700 cursor-not-allowed' : isSelected ? 'bg-red-600 text-white font-bold' : isToday ? 'text-red-400 font-bold hover:bg-[#2A2A2A]' : 'text-gray-300 hover:bg-[#2A2A2A]'}`}>
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function KiralamaTakvimiPage() {
  const supabase = createClient()
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [rentals, setRentals] = useState<any[]>([])
  const [allRentals, setAllRentals] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ active: 0, monthlyIncome: 0, pending: 0, avgDays: 0 })
  const [overdueRentals, setOverdueRentals] = useState<any[]>([])

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const [selectedRental, setSelectedRental] = useState<any>(null)
  const [returnKm, setReturnKm] = useState('')
  const [extendDate, setExtendDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'nakit' })

  // Müsait araç hesaplama için tarihler
  const [selectedStartDate, setSelectedStartDate] = useState('')
  const [selectedEndDate, setSelectedEndDate] = useState('')
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([])

  const emptyForm = {
    vehicle_id: '', customer_name: '', customer_tc: '', customer_phone: '',
    start_date: '', end_date: '', pickup_km: '', daily_price: '',
    deposit: '', payment_status: 'pending', payment_method: 'nakit',
    paid_amount: '', notes: ''
  }
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState<any>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const today = format(new Date(), 'yyyy-MM-dd')

    const [profileRes, allRentalsRes, vehiclesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('rentals').select('*, vehicles(plate, brand, model, color)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*').eq('user_id', user.id),
    ])

    const allRentalsData = allRentalsRes.data || []
    const vehiclesData = vehiclesRes.data || []
    setProfile(profileRes.data)
    setAllRentals(allRentalsData)
    setVehicles(vehiclesData)

    // Araçların status'unu kiralama tablosuna göre güncelle (status'u kaldırıp tarih bazlı yap)
    // Araç sadece aktif kiralama varsa "Kirada" göster, yoksa "Müsait"
    const activeRentalVehicleIds = allRentalsData
      .filter(r => r.status === 'active')
      .map(r => r.vehicle_id)

    const vehiclesWithStatus = vehiclesData.map(v => ({
      ...v,
      computedStatus: activeRentalVehicleIds.includes(v.id) ? 'rented' : v.status
    }))
    setVehicles(vehiclesWithStatus)

    const calendarRentals = allRentalsData.filter(r => r.start_date <= end && r.end_date >= start)
    setRentals(calendarRentals)

    // GECİKMİŞ TESLİMATLAR
    const overdue = allRentalsData.filter(r =>
      r.status === 'active' && r.end_date < today
    )
    setOverdueRentals(overdue)

    const active = allRentalsData.filter(r => r.status === 'active').length
    const monthlyIncome = allRentalsData
      .filter(r => r.start_date >= start && r.start_date <= end && r.payment_status !== 'pending')
      .reduce((s: number, r: any) => s + (Number(r.paid_amount) || 0), 0)
    const pending = allRentalsData
      .filter(r => r.payment_status === 'pending' || r.payment_status === 'partial')
      .reduce((s: number, r: any) => s + ((Number(r.total_price) || 0) - (Number(r.paid_amount) || 0)), 0)
    const completed = allRentalsData.filter(r => r.status === 'completed')
    const avgDays = completed.length > 0
      ? Math.round(completed.reduce((s: number, r: any) => s + differenceInDays(new Date(r.end_date), new Date(r.start_date)), 0) / completed.length)
      : 0
    setStats({ active, monthlyIncome, pending, avgDays })
    setLoading(false)
  }, [currentMonth, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Tarih seçilince müsait araçları hesapla
  useEffect(() => {
    if (!selectedStartDate || !selectedEndDate) {
      // Tarih seçilmemişse tüm aktif olmayan araçları göster
      setAvailableVehicles(vehicles.filter(v => v.computedStatus !== 'rented' || v.status === 'available'))
      return
    }

    // Seçilen tarih aralığında kiralama olmayan araçlar
    const busyVehicleIds = allRentals
      .filter(r => {
        if (r.status !== 'active') return false
        // Çakışma kontrolü: mevcut kiralama ile seçilen tarih aralığı örtüşüyor mu?
        // Teslim günü (end_date) aynı gün yeni kiralama başlayabilir
        return r.start_date < selectedEndDate && r.end_date > selectedStartDate
      })
      .map(r => r.vehicle_id)

    const available = vehicles.filter(v => !busyVehicleIds.includes(v.id) && v.status !== 'maintenance' && v.status !== 'inactive')
    setAvailableVehicles(available)
  }, [selectedStartDate, selectedEndDate, vehicles, allRentals])

  // Form tarih değişince available vehicles güncelle
  useEffect(() => {
    setSelectedStartDate(form.start_date)
    setSelectedEndDate(form.end_date)
  }, [form.start_date, form.end_date])

  const totalPrice = form.start_date && form.end_date && form.daily_price
    ? differenceInDays(new Date(form.end_date), new Date(form.start_date)) * Number(form.daily_price)
    : 0

  const handleSubmit = async () => {
    if (!form.vehicle_id || !form.customer_name || !form.start_date || !form.end_date || !form.daily_price) {
      alert('Lütfen zorunlu alanları doldurun.'); return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let contract_url = null
    if (contractFile) {
      const ext = contractFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: uploadData } = await supabase.storage.from('contracts').upload(path, contractFile)
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(path)
        contract_url = urlData?.publicUrl
      }
    }

    let tc_hash = null
    if (form.customer_tc && form.customer_tc.length === 11) {
      tc_hash = hashTC(form.customer_tc)
      const { data: existingCustomer } = await supabase.from('customer_records').select('*').eq('tc_hash', tc_hash).single()
      if (existingCustomer) {
        await supabase.from('customer_records').update({
          rental_count: (existingCustomer.rental_count || 0) + 1,
          last_rental_company: profile?.company_name,
          last_rental_date: form.start_date,
          last_queried_at: new Date().toISOString(),
        }).eq('tc_hash', tc_hash)
      }
    }

    const paidAmount = form.paid_amount ? Number(form.paid_amount) : (form.payment_status === 'paid' ? totalPrice : 0)

    const { error } = await supabase.from('rentals').insert({
      user_id: user.id, vehicle_id: form.vehicle_id,
      customer_name: form.customer_name, customer_tc_hash: tc_hash,
      customer_phone_encrypted: form.customer_phone,
      start_date: form.start_date, end_date: form.end_date,
      pickup_km: form.pickup_km ? Number(form.pickup_km) : null,
      daily_price: Number(form.daily_price), total_price: totalPrice,
      deposit: form.deposit ? Number(form.deposit) : 0,
      payment_status: form.payment_status, payment_method: form.payment_method,
      paid_amount: paidAmount, notes: form.notes, contract_url, status: 'active'
    })

    if (!error) {
      // Araç status'unu güncelle
      await supabase.from('vehicles').update({ status: 'rented' }).eq('id', form.vehicle_id)
      setShowAddModal(false)
      setForm(emptyForm)
      setContractFile(null)
      fetchData()
    } else {
      alert('Hata: ' + error.message)
    }
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedRental) return
    setSaving(true)
    const newTotal = differenceInDays(new Date(editForm.end_date), new Date(editForm.start_date)) * Number(editForm.daily_price)
    await supabase.from('rentals').update({
      customer_name: editForm.customer_name,
      customer_phone_encrypted: editForm.customer_phone,
      start_date: editForm.start_date, end_date: editForm.end_date,
      daily_price: Number(editForm.daily_price), total_price: newTotal,
      deposit: Number(editForm.deposit || 0),
      payment_method: editForm.payment_method, notes: editForm.notes,
    }).eq('id', selectedRental.id)
    setShowEditModal(false)
    setShowDetailModal(false)
    fetchData()
    setSaving(false)
  }

  const handleExtend = async () => {
    if (!extendDate || !selectedRental) return
    setSaving(true)
    const newTotal = differenceInDays(new Date(extendDate), new Date(selectedRental.start_date)) * Number(selectedRental.daily_price)
    await supabase.from('rentals').update({ end_date: extendDate, total_price: newTotal }).eq('id', selectedRental.id)
    setShowExtendModal(false)
    setShowDetailModal(false)
    setExtendDate('')
    fetchData()
    setSaving(false)
  }

  const handleDelete = async (rentalId: string, vehicleId: string) => {
    if (!confirm('Bu kiralama kaydını silmek istediğinize emin misiniz?')) return
    await supabase.from('rentals').delete().eq('id', rentalId)
    // Başka aktif kiralaması yoksa müsait yap
    const { data: otherRentals } = await supabase.from('rentals')
      .select('id').eq('vehicle_id', vehicleId).eq('status', 'active').neq('id', rentalId)
    if (!otherRentals || otherRentals.length === 0) {
      await supabase.from('vehicles').update({ status: 'available' }).eq('id', vehicleId)
    }
    setShowDetailModal(false)
    fetchData()
  }

  const handleReturn = async () => {
    if (!returnKm || !selectedRental) return
    setSaving(true)
    const km = Number(returnKm)
    await supabase.from('rentals').update({ return_km: km, status: 'completed' }).eq('id', selectedRental.id)

    // Başka aktif kiralaması yoksa müsait yap
    const { data: otherRentals } = await supabase.from('rentals')
      .select('id').eq('vehicle_id', selectedRental.vehicle_id).eq('status', 'active').neq('id', selectedRental.id)
    if (!otherRentals || otherRentals.length === 0) {
      await supabase.from('vehicles').update({ status: 'available', current_km: km }).eq('id', selectedRental.vehicle_id)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('vehicle_km_logs').insert({
        vehicle_id: selectedRental.vehicle_id, user_id: user.id,
        km_value: km, km_difference: km - (selectedRental.pickup_km || 0),
        logged_date: format(new Date(), 'yyyy-MM-dd'),
        note: `${selectedRental.customer_name} kiralama iadesi`
      })
    }
    setShowReturnModal(false)
    setShowDetailModal(false)
    setReturnKm('')
    fetchData()
    setSaving(false)
  }

  const handlePayment = async () => {
    if (!paymentForm.amount || !selectedRental) return
    setSavingPayment(true)
    const newPaid = Number(selectedRental.paid_amount || 0) + Number(paymentForm.amount)
    const total = Number(selectedRental.total_price || 0)
    const newStatus = newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'pending'
    await supabase.from('rentals').update({
      paid_amount: newPaid, payment_status: newStatus, payment_method: paymentForm.method,
    }).eq('id', selectedRental.id)
    setSelectedRental((r: any) => ({ ...r, paid_amount: newPaid, payment_status: newStatus }))
    setPaymentForm({ amount: '', method: 'nakit' })
    setShowPaymentModal(false)
    fetchData()
    setSavingPayment(false)
  }

  const openEdit = (r: any) => {
    setEditForm({
      customer_name: r.customer_name, customer_phone: r.customer_phone_encrypted || '',
      start_date: r.start_date, end_date: r.end_date,
      daily_price: String(r.daily_price || ''), deposit: String(r.deposit || ''),
      payment_method: r.payment_method || 'nakit', notes: r.notes || '',
    })
    setShowEditModal(true)
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7

  const getRentalsForDay = (day: Date) =>
    rentals.filter(r => day >= new Date(r.start_date) && day <= new Date(r.end_date))

  const getVehicleColor = (vehicleId: string) => {
    const idx = vehicles.findIndex(v => v.id === vehicleId)
    return VEHICLE_COLORS[idx % VEHICLE_COLORS.length]
  }

  const upcomingReturns = allRentals
    .filter(r => r.status === 'active' && new Date(r.end_date) >= new Date())
    .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
    .slice(0, 6)

  const filteredRentals = allRentals.filter(r => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return r.customer_name?.toLowerCase().includes(q) ||
      r.vehicles?.plate?.toLowerCase().includes(q) ||
      r.vehicles?.brand?.toLowerCase().includes(q)
  })

  const statusBadge = (r: any) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    if (r.status === 'active' && r.end_date < today) return <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={9} /> Gecikti</span>
    if (r.status === 'completed') return <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">Tamamlandı</span>
    if (r.payment_status === 'pending') return <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">Ödeme Bekliyor</span>
    if (r.payment_status === 'partial') return <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">Kısmi Ödeme</span>
    return <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">Aktif</span>
  }

  const remainingAmount = selectedRental
    ? Number(selectedRental.total_price || 0) - Number(selectedRental.paid_amount || 0)
    : 0

  const inputCls = "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none"

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kiralama Takvimi</h1>
          <p className="text-gray-400 text-sm mt-1">Kiralamalarınızı yönetin ve arşivleyin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg p-1">
            <button onClick={() => setView('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${view === 'calendar' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Calendar size={14} /> Takvim
            </button>
            <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${view === 'list' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <List size={14} /> Liste / Arşiv
            </button>
          </div>
          <button onClick={() => { setForm(emptyForm); setShowAddModal(true) }} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus size={16} /> Kiralama Ekle
          </button>
        </div>
      </div>

      {/* GECİKMİŞ TESLİMAT UYARISI */}
      {overdueRentals.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-400" />
            <span className="text-red-400 font-semibold">{overdueRentals.length} araç için teslimat gecikmesi var!</span>
          </div>
          <div className="space-y-2">
            {overdueRentals.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-red-500/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-red-500/15 transition-colors"
                onClick={() => { setSelectedRental(r); setShowDetailModal(true) }}>
                <div className="flex items-center gap-3">
                  <Car size={14} className="text-red-400" />
                  <div>
                    <span className="text-white text-sm font-medium">{r.vehicles?.plate}</span>
                    <span className="text-gray-400 text-xs ml-2">{r.customer_name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 text-xs font-semibold">
                    {differenceInDays(new Date(), new Date(r.end_date))} gün gecikti
                  </div>
                  <div className="text-gray-500 text-xs">Bitiş: {format(new Date(r.end_date), 'dd MMM yyyy', { locale: tr })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Aktif Kiralamalar', value: stats.active, icon: Car, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Bu Ay Tahsilat', value: `₺${stats.monthlyIncome.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Bekleyen Tahsilat', value: `₺${stats.pending.toLocaleString('tr-TR')}`, icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Ort. Kiralama Süresi', value: `${stats.avgDays} gün`, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map((s, i) => (
          <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{s.label}</span>
              <div className={`${s.bg} p-2 rounded-lg`}><s.icon size={16} className={s.color} /></div>
            </div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-[#2A2A2A] rounded-lg text-gray-400 transition-colors"><ChevronLeft size={18} /></button>
              <h2 className="text-white font-semibold text-lg">{format(currentMonth, 'MMMM yyyy', { locale: tr })}</h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-[#2A2A2A] rounded-lg text-gray-400 transition-colors"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
              {days.map(day => {
                const dayRentals = getRentalsForDay(day)
                const isToday = isSameDay(day, new Date())
                const today = format(new Date(), 'yyyy-MM-dd')
                const dayStr = format(day, 'yyyy-MM-dd')
                return (
                  <div key={day.toISOString()} className={`min-h-[72px] p-1 rounded-lg border ${isToday ? 'border-red-500/50 bg-red-500/5' : 'border-transparent hover:border-[#2A2A2A]'}`}>
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-red-600 text-white' : 'text-gray-400'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayRentals.slice(0, 2).map(r => {
                        const isOverdue = r.status === 'active' && r.end_date < today && dayStr === r.end_date
                        return (
                          <div key={r.id} onClick={() => { setSelectedRental(r); setShowDetailModal(true) }}
                            className="text-[10px] px-1 py-0.5 rounded cursor-pointer truncate font-medium"
                            style={{
                              backgroundColor: isOverdue ? '#EF444433' : getVehicleColor(r.vehicle_id) + '33',
                              color: isOverdue ? '#EF4444' : getVehicleColor(r.vehicle_id),
                              border: `1px solid ${isOverdue ? '#EF444455' : getVehicleColor(r.vehicle_id) + '44'}`
                            }}>
                            {isOverdue ? '⚠ ' : ''}{r.vehicles?.plate}
                          </div>
                        )
                      })}
                      {dayRentals.length > 2 && <div className="text-[10px] text-gray-500">+{dayRentals.length - 2}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
            {vehicles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#2A2A2A]">
                {vehicles.map((v, i) => (
                  <div key={v.id} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VEHICLE_COLORS[i % VEHICLE_COLORS.length] }} />
                    <span className="text-xs text-gray-400">{v.plate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Yaklaşan Teslimler</h3>
            <div className="space-y-3">
              {upcomingReturns.length === 0 ? <p className="text-gray-500 text-sm">Yaklaşan teslimat yok</p>
                : upcomingReturns.map(r => {
                  const daysLeft = differenceInDays(new Date(r.end_date), new Date())
                  return (
                    <div key={r.id} onClick={() => { setSelectedRental(r); setShowDetailModal(true) }}
                      className="flex items-start gap-3 p-3 bg-[#1E1E1E] rounded-lg cursor-pointer hover:bg-[#252525] transition-colors">
                      <div className={`text-center min-w-[40px] p-1 rounded-lg ${daysLeft <= 1 ? 'bg-red-500/20' : daysLeft <= 3 ? 'bg-yellow-500/20' : 'bg-blue-500/20'}`}>
                        <div className={`text-lg font-bold leading-none ${daysLeft <= 1 ? 'text-red-400' : daysLeft <= 3 ? 'text-yellow-400' : 'text-blue-400'}`}>{format(new Date(r.end_date), 'd')}</div>
                        <div className="text-[10px] text-gray-500">{format(new Date(r.end_date), 'MMM', { locale: tr })}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{r.vehicles?.plate}</div>
                        <div className="text-gray-400 text-xs truncate">{r.customer_name}</div>
                        <div className={`text-xs mt-1 ${daysLeft <= 1 ? 'text-red-400' : daysLeft <= 3 ? 'text-yellow-400' : 'text-gray-500'}`}>
                          {daysLeft === 0 ? 'Bugün' : daysLeft < 0 ? `${Math.abs(daysLeft)} gün geçti` : `${daysLeft} gün kaldı`}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Müşteri adı, araç plakası veya marka ara..."
                className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:border-red-500 outline-none" />
            </div>
            <span className="text-gray-500 text-sm">{filteredRentals.length} kayıt</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {['Araç', 'Müşteri', 'TC', 'Tarihler', 'Toplam', 'Tahsilat', 'Durum', 'Sözleşme', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRentals.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-500 text-sm py-12">Kayıt bulunamadı</td></tr>
              ) : filteredRentals.map(r => (
                <tr key={r.id} className={`border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors ${r.status === 'active' && r.end_date < format(new Date(), 'yyyy-MM-dd') ? 'bg-red-500/5' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="text-white text-sm font-bold">{r.vehicles?.plate}</div>
                    <div className="text-gray-500 text-xs">{r.vehicles?.brand} {r.vehicles?.model}</div>
                  </td>
                  <td className="px-4 py-3 text-white text-sm">{r.customer_name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{r.customer_tc_hash ? maskTC('12345678901') : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-400 text-xs">{format(new Date(r.start_date), 'dd.MM.yy')}</div>
                    <div className="text-gray-400 text-xs">{format(new Date(r.end_date), 'dd.MM.yy')}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white text-sm font-medium">₺{Number(r.total_price || 0).toLocaleString('tr-TR')}</div>
                    <div className="text-gray-500 text-xs">₺{Number(r.daily_price || 0).toLocaleString()}/gün</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm font-medium ${r.payment_status === 'paid' ? 'text-green-400' : r.payment_status === 'partial' ? 'text-yellow-400' : 'text-red-400'}`}>
                      ₺{Number(r.paid_amount || 0).toLocaleString('tr-TR')}
                    </div>
                    {r.payment_status !== 'paid' && (
                      <div className="text-gray-600 text-xs">Kalan: ₺{(Number(r.total_price || 0) - Number(r.paid_amount || 0)).toLocaleString('tr-TR')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(r)}</td>
                  <td className="px-4 py-3">
                    {r.contract_url ? (
                      <div className="flex items-center gap-1.5">
                        <a href={r.contract_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"><Eye size={11} /> Gör</a>
                        <a href={r.contract_url} download
                          className="flex items-center gap-1 text-gray-400 hover:text-white text-xs"><Download size={11} /> İndir</a>
                      </div>
                    ) : <span className="text-gray-600 text-xs">Yok</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedRental(r); setShowDetailModal(true) }}
                      className="text-xs bg-[#2A2A2A] text-gray-400 hover:text-white px-2 py-1 rounded-lg transition-colors">Detay</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold text-lg">Kiralama Ekle</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Önce tarih seç — araç listesi buna göre filtrele */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-blue-400 text-xs">Müsait araçları görmek için önce başlangıç ve bitiş tarihlerini seçin.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DatePicker label="Başlangıç Tarihi *" value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v, vehicle_id: '' }))} />
                <DatePicker label="Bitiş Tarihi *" value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v, vehicle_id: '' }))} min={form.start_date} />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">
                  Araç Seç * {form.start_date && form.end_date ? `(${availableVehicles.length} araç müsait)` : '(Tarih seçin)'}
                </label>
                <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} className={inputCls}
                  disabled={!form.start_date || !form.end_date}>
                  <option value="">{!form.start_date || !form.end_date ? 'Önce tarih seçin' : availableVehicles.length === 0 ? 'Bu tarihlerde müsait araç yok' : 'Araç seçin'}</option>
                  {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-gray-400 text-sm mb-1.5 block">Müşteri Adı Soyadı *</label>
                  <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Ad Soyad" className={inputCls} /></div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">TC Kimlik No</label>
                  <input value={form.customer_tc} onChange={e => setForm(f => ({ ...f, customer_tc: e.target.value.replace(/\D/g, '').slice(0, 11) }))} placeholder="11 haneli TC" maxLength={11} className={inputCls} /></div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">Telefon</label>
                  <input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="+90 5XX XXX XX XX" className={inputCls} /></div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">Teslim KM</label>
                  <input type="number" value={form.pickup_km} onChange={e => setForm(f => ({ ...f, pickup_km: e.target.value }))} placeholder="Araç teslim km" className={inputCls} /></div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">Günlük Fiyat (₺) *</label>
                  <input type="number" value={form.daily_price} onChange={e => setForm(f => ({ ...f, daily_price: e.target.value }))} placeholder="0" className={inputCls} />
                  {totalPrice > 0 && <p className="text-green-400 text-xs mt-1">Toplam: ₺{totalPrice.toLocaleString('tr-TR')}</p>}</div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">Depozito (₺)</label>
                  <input type="number" value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))} placeholder="0" className={inputCls} /></div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">Ödeme Durumu</label>
                  <select value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))} className={inputCls}>
                    <option value="pending">Bekliyor</option>
                    <option value="paid">Ödendi</option>
                    <option value="partial">Kısmi Ödeme</option>
                  </select></div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">Tahsil Edilen (₺)</label>
                  <input type="number" value={form.paid_amount} onChange={e => setForm(f => ({ ...f, paid_amount: e.target.value }))} placeholder="0" className={inputCls} /></div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">Ödeme Yöntemi</label>
                  <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className={inputCls}>
                    <option value="nakit">Nakit</option>
                    <option value="kredi_karti">Kredi Kartı</option>
                    <option value="havale">Havale / EFT</option>
                  </select></div>
              </div>
              <div><label className="text-gray-400 text-sm mb-1.5 block">Kira Sözleşmesi (PDF/Görsel, max 20MB)</label>
                <label className="flex items-center gap-3 w-full bg-[#1E1E1E] border border-dashed border-[#3A3A3A] text-gray-400 rounded-lg px-4 py-3 cursor-pointer hover:border-red-500/50 transition-colors">
                  <Upload size={16} />
                  <span className="text-sm">{contractFile ? contractFile.name : 'Dosya seç veya sürükle'}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { if (e.target.files?.[0]) setContractFile(e.target.files[0]) }} />
                </label></div>
              <div><label className="text-gray-400 text-sm mb-1.5 block">Notlar</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ek notlar..." className={inputCls + ' resize-none'} /></div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#2A2A2A]">
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleSubmit} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && selectedRental && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold text-lg">Kiralama Detayı</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            {/* Gecikme uyarısı */}
            {selectedRental.status === 'active' && selectedRental.end_date < format(new Date(), 'yyyy-MM-dd') && (
              <div className="mx-5 mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
                <div>
                  <div className="text-red-400 font-semibold text-sm">Teslimat Gecikti!</div>
                  <div className="text-red-400/70 text-xs">{differenceInDays(new Date(), new Date(selectedRental.end_date))} gün önce teslim edilmesi gerekiyordu</div>
                </div>
              </div>
            )}

            <div className="p-5 space-y-3">
              {/* Ödeme özeti */}
              <div className={`rounded-xl p-4 flex items-center justify-between ${selectedRental.payment_status === 'paid' ? 'bg-green-500/10 border border-green-500/20' : selectedRental.payment_status === 'partial' ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Ödeme Durumu</div>
                  <div className={`font-bold ${selectedRental.payment_status === 'paid' ? 'text-green-400' : selectedRental.payment_status === 'partial' ? 'text-yellow-400' : 'text-red-400'}`}>
                    {selectedRental.payment_status === 'paid' ? '✅ Tam Ödendi' : selectedRental.payment_status === 'partial' ? '🟡 Kısmi Ödeme' : '⏳ Ödeme Bekliyor'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Tahsil / Toplam</div>
                  <div className="text-white font-bold">₺{Number(selectedRental.paid_amount || 0).toLocaleString('tr-TR')} / ₺{Number(selectedRental.total_price || 0).toLocaleString('tr-TR')}</div>
                  {selectedRental.payment_status !== 'paid' && <div className="text-red-400 text-xs">Kalan: ₺{remainingAmount.toLocaleString('tr-TR')}</div>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Araç', value: `${selectedRental.vehicles?.plate} — ${selectedRental.vehicles?.brand} ${selectedRental.vehicles?.model}` },
                  { label: 'Müşteri', value: selectedRental.customer_name },
                  { label: 'TC Kimlik', value: selectedRental.customer_tc_hash ? maskTC('12345678901') : '—' },
                  { label: 'Telefon', value: selectedRental.customer_phone_encrypted ? maskPhone(selectedRental.customer_phone_encrypted) : '—' },
                  { label: 'Başlangıç', value: format(new Date(selectedRental.start_date), 'dd.MM.yyyy') },
                  { label: 'Bitiş', value: format(new Date(selectedRental.end_date), 'dd.MM.yyyy') },
                  { label: 'Teslim KM', value: selectedRental.pickup_km ? `${selectedRental.pickup_km.toLocaleString()} km` : '—' },
                  { label: 'İade KM', value: selectedRental.return_km ? `${selectedRental.return_km.toLocaleString()} km` : '—' },
                  { label: 'Günlük Fiyat', value: `₺${Number(selectedRental.daily_price || 0).toLocaleString('tr-TR')}` },
                  { label: 'Depozito', value: `₺${Number(selectedRental.deposit || 0).toLocaleString('tr-TR')}` },
                  { label: 'Süre', value: `${differenceInDays(new Date(selectedRental.end_date), new Date(selectedRental.start_date))} gün` },
                  { label: 'Ödeme Yöntemi', value: selectedRental.payment_method || '—' },
                ].map((item, i) => (
                  <div key={i} className="bg-[#1E1E1E] rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1">{item.label}</div>
                    <div className="text-white text-sm font-medium">{item.value}</div>
                  </div>
                ))}
              </div>

              {selectedRental.notes && (
                <div className="bg-[#1E1E1E] rounded-lg p-3">
                  <div className="text-gray-500 text-xs mb-1">Notlar</div>
                  <div className="text-white text-sm">{selectedRental.notes}</div>
                </div>
              )}

              {/* SÖZLEŞME */}
              {selectedRental.contract_url && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <div className="text-blue-400 text-xs font-semibold mb-3 flex items-center gap-1.5">
                    📄 Kira Sözleşmesi
                  </div>
                  <div className="flex gap-2">
                    <a href={selectedRental.contract_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-blue-600/20 border border-blue-600/30 text-blue-400 px-3 py-2 rounded-lg text-sm hover:bg-blue-600/30 transition-colors">
                      <Eye size={14} /> Görüntüle
                    </a>
                    <a href={selectedRental.contract_url} download
                      className="flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 text-blue-300 px-3 py-2 rounded-lg text-sm hover:bg-blue-600/20 transition-colors">
                      <Download size={14} /> İndir
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 p-5 border-t border-[#2A2A2A]">
              {selectedRental.status === 'active' && (
                <>
                  <button onClick={() => setShowReturnModal(true)}
                    className="flex items-center gap-1.5 bg-green-600/20 border border-green-600/30 text-green-400 px-3 py-2 rounded-lg text-sm hover:bg-green-600/30 transition-colors">
                    <Car size={13} /> Teslim Al
                  </button>
                  <button onClick={() => { setExtendDate(selectedRental.end_date); setShowExtendModal(true) }}
                    className="flex items-center gap-1.5 bg-purple-600/20 border border-purple-600/30 text-purple-400 px-3 py-2 rounded-lg text-sm hover:bg-purple-600/30 transition-colors">
                    <CalendarDays size={13} /> Süre Uzat
                  </button>
                </>
              )}
              {selectedRental.payment_status !== 'paid' && (
                <button onClick={() => { setPaymentForm({ amount: '', method: selectedRental.payment_method || 'nakit' }); setShowPaymentModal(true) }}
                  className="flex items-center gap-1.5 bg-yellow-600/20 border border-yellow-600/30 text-yellow-400 px-3 py-2 rounded-lg text-sm hover:bg-yellow-600/30 transition-colors">
                  💰 Ödeme Al
                </button>
              )}
              <button onClick={() => { openEdit(selectedRental) }}
                className="flex items-center gap-1.5 bg-[#2A2A2A] text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">
                <Edit2 size={13} /> Düzenle
              </button>
              <button onClick={() => handleDelete(selectedRental.id, selectedRental.vehicle_id)}
                className="flex items-center gap-1.5 bg-red-600/10 border border-red-600/20 text-red-400 px-3 py-2 rounded-lg text-sm hover:bg-red-600/20 transition-colors">
                <Trash2 size={13} /> Sil
              </button>
              <button onClick={() => setShowDetailModal(false)}
                className="flex items-center gap-1.5 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 px-3 py-2 rounded-lg text-sm hover:bg-[#252525] transition-colors ml-auto">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedRental && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h3 className="text-white font-semibold">Kiralama Düzenle</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-gray-400 text-sm mb-1.5 block">Müşteri Adı *</label>
                  <input value={editForm.customer_name || ''} onChange={e => setEditForm((f: any) => ({ ...f, customer_name: e.target.value }))} className={inputCls} /></div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">Telefon</label>
                  <input value={editForm.customer_phone || ''} onChange={e => setEditForm((f: any) => ({ ...f, customer_phone: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DatePicker label="Başlangıç Tarihi" value={editForm.start_date || ''} onChange={v => setEditForm((f: any) => ({ ...f, start_date: v }))} />
                <DatePicker label="Bitiş Tarihi" value={editForm.end_date || ''} onChange={v => setEditForm((f: any) => ({ ...f, end_date: v }))} min={editForm.start_date} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-gray-400 text-sm mb-1.5 block">Günlük Fiyat (₺)</label>
                  <input type="number" value={editForm.daily_price || ''} onChange={e => setEditForm((f: any) => ({ ...f, daily_price: e.target.value }))} className={inputCls} />
                  {editForm.start_date && editForm.end_date && editForm.daily_price && (
                    <p className="text-green-400 text-xs mt-1">Toplam: ₺{(differenceInDays(new Date(editForm.end_date), new Date(editForm.start_date)) * Number(editForm.daily_price)).toLocaleString('tr-TR')}</p>
                  )}</div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">Depozito (₺)</label>
                  <input type="number" value={editForm.deposit || ''} onChange={e => setEditForm((f: any) => ({ ...f, deposit: e.target.value }))} className={inputCls} /></div>
                <div><label className="text-gray-400 text-sm mb-1.5 block">Ödeme Yöntemi</label>
                  <select value={editForm.payment_method || 'nakit'} onChange={e => setEditForm((f: any) => ({ ...f, payment_method: e.target.value }))} className={inputCls}>
                    <option value="nakit">Nakit</option>
                    <option value="kredi_karti">Kredi Kartı</option>
                    <option value="havale">Havale / EFT</option>
                  </select></div>
              </div>
              <div><label className="text-gray-400 text-sm mb-1.5 block">Notlar</label>
                <textarea value={editForm.notes || ''} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + ' resize-none'} /></div>
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

      {/* EXTEND MODAL */}
      {showExtendModal && selectedRental && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Süre Uzat</h3>
              <button onClick={() => setShowExtendModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="bg-[#1E1E1E] rounded-lg p-3 mb-4">
              <div className="text-gray-500 text-xs mb-1">Mevcut Bitiş Tarihi</div>
              <div className="text-white font-medium">{format(new Date(selectedRental.end_date), 'dd MMMM yyyy', { locale: tr })}</div>
            </div>
            <DatePicker label="Yeni Bitiş Tarihi *" value={extendDate} onChange={setExtendDate} min={selectedRental.end_date} />
            {extendDate && extendDate > selectedRental.end_date && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mt-3">
                <div className="text-purple-400 text-xs">+{differenceInDays(new Date(extendDate), new Date(selectedRental.end_date))} gün uzatılıyor</div>
                <div className="text-purple-400 text-sm font-bold mt-0.5">+₺{(differenceInDays(new Date(extendDate), new Date(selectedRental.end_date)) * Number(selectedRental.daily_price || 0)).toLocaleString('tr-TR')} ek ücret</div>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowExtendModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleExtend} disabled={saving || !extendDate || extendDate <= selectedRental.end_date}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Uzat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETURN MODAL */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-sm p-6">
            <h3 className="text-white font-semibold text-lg mb-4">Araç İade KM</h3>
            <p className="text-gray-400 text-sm mb-4">Teslim KM: <span className="text-white font-medium">{selectedRental?.pickup_km?.toLocaleString() || '—'}</span></p>
            <label className="text-gray-400 text-sm mb-1.5 block">İade KM *</label>
            <input type="number" value={returnKm} onChange={e => setReturnKm(e.target.value)} placeholder="Örn: 45250" className={inputCls + ' mb-2'} />
            {returnKm && selectedRental?.pickup_km && (
              <p className="text-blue-400 text-xs mb-4">Kullanılan: {(Number(returnKm) - selectedRental.pickup_km).toLocaleString()} km</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowReturnModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleReturn} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && selectedRental && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">Ödeme Al</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-[#1E1E1E] rounded-lg p-3 text-center">
                <div className="text-gray-500 text-[10px] mb-1">Toplam</div>
                <div className="text-white font-bold text-sm">₺{Number(selectedRental.total_price || 0).toLocaleString('tr-TR')}</div>
              </div>
              <div className="bg-[#1E1E1E] rounded-lg p-3 text-center">
                <div className="text-gray-500 text-[10px] mb-1">Tahsil</div>
                <div className="text-green-400 font-bold text-sm">₺{Number(selectedRental.paid_amount || 0).toLocaleString('tr-TR')}</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                <div className="text-gray-500 text-[10px] mb-1">Kalan</div>
                <div className="text-yellow-400 font-bold text-sm">₺{remainingAmount.toLocaleString('tr-TR')}</div>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Alınan Tutar (₺) *</label>
                <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className={inputCls} />
                <button onClick={() => setPaymentForm(f => ({ ...f, amount: String(remainingAmount) }))}
                  className="text-xs text-red-400 hover:text-red-300 mt-1.5 transition-colors">
                  Tamamını gir (₺{remainingAmount.toLocaleString('tr-TR')})
                </button>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Ödeme Yöntemi</label>
                <select value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))} className={inputCls}>
                  <option value="nakit">Nakit</option>
                  <option value="kredi_karti">Kredi Kartı</option>
                  <option value="havale">Havale / EFT</option>
                </select>
              </div>
            </div>
            {paymentForm.amount && Number(paymentForm.amount) > 0 && (
              <div className="bg-[#1E1E1E] rounded-lg p-3 mb-4">
                <div className="text-gray-500 text-xs mb-1">Bu ödeme sonrası</div>
                <div className={`text-sm font-semibold ${(Number(selectedRental.paid_amount || 0) + Number(paymentForm.amount)) >= Number(selectedRental.total_price || 0) ? 'text-green-400' : 'text-yellow-400'}`}>
                  {(Number(selectedRental.paid_amount || 0) + Number(paymentForm.amount)) >= Number(selectedRental.total_price || 0)
                    ? '✅ Tam Ödendi'
                    : `🟡 Kalan: ₺${(remainingAmount - Number(paymentForm.amount)).toLocaleString('tr-TR')}`}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handlePayment} disabled={savingPayment || !paymentForm.amount || Number(paymentForm.amount) <= 0}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {savingPayment ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}