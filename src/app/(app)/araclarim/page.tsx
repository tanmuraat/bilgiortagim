'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Car, Plus, X, Edit2, Trash2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Sayfa atlamayan date picker — controlled input, state dışarıda
function DatePickerInput({ value, onChange, label, placeholder }: {
  value: string, onChange: (v: string) => void, label: string, placeholder?: string
}) {
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
      <label className="text-gray-400 text-xs mb-1.5 block">{label}</label>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full bg-[#1E1E1E] border border-[#2A2A2A] text-left rounded-lg px-3 py-2.5 text-sm flex items-center justify-between hover:border-red-500/50 transition-colors outline-none focus:border-red-500">
        <span className={value ? 'text-white' : 'text-gray-600'}>{value ? format(new Date(value), 'dd MMMM yyyy', { locale: tr }) : placeholder || 'Tarih seçin'}</span>
        <CalendarDays size={14} className="text-gray-500 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 shadow-2xl w-72">
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
              return (
                <button key={dateStr} type="button"
                  onClick={() => { onChange(dateStr); setOpen(false) }}
                  className={`text-center text-xs py-1.5 rounded-lg transition-colors ${isSelected ? 'bg-red-600 text-white font-bold' : isToday ? 'text-red-400 font-bold hover:bg-[#2A2A2A]' : 'text-gray-300 hover:bg-[#2A2A2A]'}`}>
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

export default function AraclarimPage() {
  const supabase = createClient()
  const [vehicles, setVehicles] = useState<any[]>([])
  const [kmLogs, setKmLogs] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showKmModal, setShowKmModal] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [kmValue, setKmValue] = useState('')
  const [kmNote, setKmNote] = useState('')
  const [selectedVehicleForChart, setSelectedVehicleForChart] = useState<string>('')

  const emptyForm = {
    plate: '', brand: '', model: '', year: '', color: '',
    fuel_type: 'benzin', transmission: 'manuel',
    current_km: '', insurance_expiry: '', inspection_expiry: '', notes: ''
  }
  const [form, setForm] = useState(emptyForm)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [profileRes, vehiclesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('vehicles').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setProfile(profileRes.data)
    const vData = vehiclesRes.data || []
    setVehicles(vData)
    if (vData.length > 0) {
      setSelectedVehicleForChart(vData[0].id)
      const { data: logs } = await supabase.from('vehicle_km_logs').select('*')
        .in('vehicle_id', vData.map((v: any) => v.id))
        .order('logged_date', { ascending: true })
      setKmLogs(logs || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Form handler — sayfayı yeniden render ettirmiyor, sadece state günceller
  const setF = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleAddVehicle = async () => {
    if (!form.plate || !form.brand || !form.model) { alert('Plaka, marka ve model zorunludur.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (profile?.subscription_plan === 'pro' && vehicles.length >= 5) { alert('Pro planda maksimum 5 araç ekleyebilirsiniz.'); return }
    setSaving(true)
    await supabase.from('vehicles').insert({
      user_id: user.id, plate: form.plate.toUpperCase(),
      brand: form.brand, model: form.model,
      year: form.year ? Number(form.year) : null,
      color: form.color, fuel_type: form.fuel_type, transmission: form.transmission,
      current_km: form.current_km ? Number(form.current_km) : 0,
      insurance_expiry: form.insurance_expiry || null,
      inspection_expiry: form.inspection_expiry || null,
      notes: form.notes, status: 'available'
    })
    setShowAddModal(false)
    setForm(emptyForm)
    fetchData()
    setSaving(false)
  }

  const handleEditVehicle = async () => {
    if (!selectedVehicle) return
    setSaving(true)
    await supabase.from('vehicles').update({
      plate: form.plate.toUpperCase(), brand: form.brand, model: form.model,
      year: form.year ? Number(form.year) : null,
      color: form.color, fuel_type: form.fuel_type, transmission: form.transmission,
      current_km: form.current_km ? Number(form.current_km) : 0,
      insurance_expiry: form.insurance_expiry || null,
      inspection_expiry: form.inspection_expiry || null,
      notes: form.notes,
    }).eq('id', selectedVehicle.id)
    setShowEditModal(false)
    setSelectedVehicle(null)
    setForm(emptyForm)
    fetchData()
    setSaving(false)
  }

  const openEdit = (v: any) => {
    setSelectedVehicle(v)
    setForm({
      plate: v.plate || '', brand: v.brand || '', model: v.model || '',
      year: v.year ? String(v.year) : '', color: v.color || '',
      fuel_type: v.fuel_type || 'benzin', transmission: v.transmission || 'manuel',
      current_km: v.current_km ? String(v.current_km) : '',
      insurance_expiry: v.insurance_expiry || '', inspection_expiry: v.inspection_expiry || '',
      notes: v.notes || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateKm = async () => {
    if (!kmValue || !selectedVehicle) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const newKm = Number(kmValue)
    const diff = newKm - (selectedVehicle.current_km || 0)
    await supabase.from('vehicles').update({ current_km: newKm }).eq('id', selectedVehicle.id)
    await supabase.from('vehicle_km_logs').insert({
      vehicle_id: selectedVehicle.id, user_id: user.id,
      km_value: newKm, km_difference: diff,
      logged_date: format(new Date(), 'yyyy-MM-dd'), note: kmNote
    })
    setShowKmModal(false)
    setKmValue(''); setKmNote('')
    fetchData()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu aracı silmek istediğinize emin misiniz?')) return
    await supabase.from('vehicles').delete().eq('id', id)
    fetchData()
  }

  const statusConfig: Record<string, any> = {
    available: { label: 'Müsait', color: 'text-green-400', bg: 'bg-green-400/10' },
    rented: { label: 'Kirada', color: 'text-blue-400', bg: 'bg-blue-400/10' },
    maintenance: { label: 'Bakımda', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  }

  const isExpiringSoon = (date: string) => {
    if (!date) return false
    const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff <= 30 && diff >= 0
  }
  const isExpired = (date: string) => date && new Date(date) < new Date()

  const chartData = kmLogs
    .filter(l => l.vehicle_id === selectedVehicleForChart)
    .map(l => ({ tarih: format(new Date(l.logged_date), 'dd MMM', { locale: tr }), KM: l.km_value }))

  const inputCls = "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none"

  // Form içindeki alan — sayfa atlamasını önlemek için onChange'de setState kullan
  const Field = ({ label, fkey, type = 'text', placeholder = '' }: { label: string, fkey: string, type?: string, placeholder?: string }) => (
    <div>
      <label className="text-gray-400 text-xs mb-1.5 block">{label}</label>
      <input
        type={type}
        value={(form as any)[fkey]}
        onChange={e => setF(fkey, e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  )

  const VehicleFormFields = () => (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Plaka *" fkey="plate" placeholder="34 ABC 123" />
        <Field label="Marka *" fkey="brand" placeholder="Renault" />
        <Field label="Model *" fkey="model" placeholder="Clio" />
        <Field label="Yıl" fkey="year" type="number" placeholder="2021" />
        <Field label="Renk" fkey="color" placeholder="Beyaz" />
        <Field label="Güncel KM" fkey="current_km" type="number" placeholder="0" />
        <div>
          <label className="text-gray-400 text-xs mb-1.5 block">Yakıt Tipi</label>
          <select value={form.fuel_type} onChange={e => setF('fuel_type', e.target.value)} className={inputCls}>
            {['benzin', 'dizel', 'lpg', 'elektrik', 'hibrit'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs mb-1.5 block">Vites</label>
          <select value={form.transmission} onChange={e => setF('transmission', e.target.value)} className={inputCls}>
            <option value="manuel">Manuel</option>
            <option value="otomatik">Otomatik</option>
          </select>
        </div>
      </div>
      {/* Tarih alanları — DatePickerInput kullan */}
      <div className="grid grid-cols-2 gap-4">
        <DatePickerInput
          label="Sigorta Bitiş"
          value={form.insurance_expiry}
          onChange={v => setF('insurance_expiry', v)}
          placeholder="Tarih seçin"
        />
        <DatePickerInput
          label="Muayene Bitiş"
          value={form.inspection_expiry}
          onChange={v => setF('inspection_expiry', v)}
          placeholder="Tarih seçin"
        />
      </div>
      <div>
        <label className="text-gray-400 text-xs mb-1.5 block">Notlar</label>
        <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2}
          className={inputCls + ' resize-none'} placeholder="Ek notlar..." />
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Araçlarım</h1>
          <p className="text-gray-400 text-sm mt-1">Araç filonuzu yönetin ve KM takibi yapın</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setShowAddModal(true) }} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus size={16} /> Araç Ekle
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Araç', value: vehicles.length, color: 'text-white' },
          { label: 'Kirada', value: vehicles.filter(v => v.status === 'rented').length, color: 'text-blue-400' },
          { label: 'Müsait', value: vehicles.filter(v => v.status === 'available').length, color: 'text-green-400' },
          { label: 'Bakımda', value: vehicles.filter(v => v.status === 'maintenance').length, color: 'text-yellow-400' },
        ].map((s, i) => (
          <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-2">{s.label}</div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        {vehicles.length === 0 ? (
          <div className="p-16 text-center">
            <Car size={48} className="text-gray-600 mx-auto mb-4" />
            <div className="text-white font-semibold text-lg mb-2">Henüz araç eklenmemiş</div>
            <button onClick={() => { setForm(emptyForm); setShowAddModal(true) }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium mt-2">Araç Ekle</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {['Plaka', 'Marka / Model', 'Yıl', 'Durum', 'Güncel KM', 'Sigorta', 'Muayene', 'İşlemler'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => {
                const sc = statusConfig[v.status] || statusConfig.available
                return (
                  <tr key={v.id} className="border-b border-[#1A1A1A] hover:bg-[#1E1E1E] transition-colors">
                    <td className="px-4 py-3 text-white font-bold">{v.plate}</td>
                    <td className="px-4 py-3">
                      <div className="text-white text-sm">{v.brand}</div>
                      <div className="text-gray-500 text-xs">{v.model} · {v.fuel_type}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{v.year || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{(v.current_km || 0).toLocaleString()} km</td>
                    <td className="px-4 py-3">
                      {v.insurance_expiry ? (
                        <span className={`text-xs ${isExpired(v.insurance_expiry) ? 'text-red-400' : isExpiringSoon(v.insurance_expiry) ? 'text-yellow-400' : 'text-gray-400'}`}>
                          {isExpired(v.insurance_expiry) ? '⚠ ' : ''}{format(new Date(v.insurance_expiry), 'dd.MM.yyyy')}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {v.inspection_expiry ? (
                        <span className={`text-xs ${isExpired(v.inspection_expiry) ? 'text-red-400' : isExpiringSoon(v.inspection_expiry) ? 'text-yellow-400' : 'text-gray-400'}`}>
                          {isExpired(v.inspection_expiry) ? '⚠ ' : ''}{format(new Date(v.inspection_expiry), 'dd.MM.yyyy')}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setSelectedVehicle(v); setKmValue(String(v.current_km || '')); setShowKmModal(true) }}
                          className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-500/20 transition-colors">KM</button>
                        <button onClick={() => openEdit(v)} className="text-xs bg-[#2A2A2A] text-gray-400 hover:text-white px-2 py-1 rounded-lg transition-colors"><Edit2 size={11} /></button>
                        <button onClick={() => handleDelete(v.id)} className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/20 transition-colors"><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {vehicles.length > 0 && kmLogs.length > 0 && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">KM Analizi</h3>
            <select value={selectedVehicleForChart} onChange={e => setSelectedVehicleForChart(e.target.value)}
              className="bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-red-500">
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
            </select>
          </div>
          {chartData.length < 2 ? (
            <div className="text-center text-gray-500 text-sm py-8">En az 2 KM kaydı gerekli</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="tarih" tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 8 }} formatter={(v: any) => [`${Number(v).toLocaleString()} km`, '']} />
                <Line type="monotone" dataKey="KM" stroke="#E02424" strokeWidth={2} dot={{ fill: '#E02424', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold text-lg">Araç Ekle</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <VehicleFormFields />
            <div className="flex gap-3 p-5 border-t border-[#2A2A2A]">
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleAddVehicle} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-white font-semibold text-lg">Araç Düzenle — {selectedVehicle?.plate}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <VehicleFormFields />
            <div className="flex gap-3 p-5 border-t border-[#2A2A2A]">
              <button onClick={() => setShowEditModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleEditVehicle} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KM Modal */}
      {showKmModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">KM Güncelle — {selectedVehicle.plate}</h3>
              <button onClick={() => setShowKmModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-gray-400 text-sm mb-4">Mevcut KM: <span className="text-white font-bold">{(selectedVehicle.current_km || 0).toLocaleString()}</span></p>
            <label className="text-gray-400 text-xs mb-1.5 block">Yeni KM Değeri *</label>
            <input type="number" value={kmValue} onChange={e => setKmValue(e.target.value)} placeholder="Örn: 45250" className={inputCls + ' mb-2'} />
            {kmValue && Number(kmValue) > (selectedVehicle.current_km || 0) && (
              <p className="text-blue-400 text-xs mb-3">+{(Number(kmValue) - (selectedVehicle.current_km || 0)).toLocaleString()} km artış</p>
            )}
            <label className="text-gray-400 text-xs mb-1.5 block">Not (opsiyonel)</label>
            <input value={kmNote} onChange={e => setKmNote(e.target.value)} placeholder="Bakım, uzun yol vs." className={inputCls + ' mb-4'} />
            <div className="flex gap-3">
              <button onClick={() => setShowKmModal(false)} className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-gray-400 py-2.5 rounded-lg hover:bg-[#252525] transition-colors">İptal</button>
              <button onClick={handleUpdateKm} disabled={saving || !kmValue} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}