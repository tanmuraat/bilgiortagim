'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, isToday, parseISO, isValid,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

type Props = {
  /** 'yyyy-MM-dd' formatında string değer (form state'i ile uyumlu) */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** Bu tarihten önceki günler seçilemez (örn: bugünden önce kiralama bitemez) */
  minDate?: string
  /** Bu tarihten sonraki günler seçilemez */
  maxDate?: string
  /** Verilirse input'un üstünde bir <label> render edilir (standalone kullanım için) */
  label?: string
}

const PICKER_WIDTH = 280

/**
 * Tıklanınca açılan, projenin koyu temasına uygun takvim seçici.
 * Native <input type="date"> yerine kullanılır; value/onChange formatı
 * aynı kaldığı için mevcut form state mantığı değişmeden entegre olur.
 *
 * Mobilde (dar ekran) popover, viewport'a sığacak şekilde ortalanmış bir
 * sabit (fixed) panel olarak gösterilir; masaüstünde trigger'ın altında
 * konumlanan klasik popover olarak kalır.
 */
export function DatePicker({ value, onChange, placeholder, className, minDate, maxDate, label }: Props) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = value ? parseISO(value) : new Date()
    return isValid(d) ? d : new Date()
  })
  const [yearPickerOpen, setYearPickerOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const selectedDate = value ? parseISO(value) : null
  const validSelectedDate = selectedDate && isValid(selectedDate) ? selectedDate : null

  useEffect(() => {
    if (validSelectedDate) setViewMonth(validSelectedDate)
  }, [value])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return
      if (triggerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  // Açıkken arka plan scroll'unu kilitle (mobilde modal hissi için gerekli)
  useEffect(() => {
    if (open && isMobile) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [open, isMobile])

  const openPicker = () => {
    const mobile = window.innerWidth < 640
    setIsMobile(mobile)
    if (!mobile) {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) {
        // Sağ kenardan taşmayı önle
        const left = Math.min(rect.left + window.scrollX, window.innerWidth + window.scrollX - PICKER_WIDTH - 12)
        setCoords({ top: rect.bottom + window.scrollY + 6, left: Math.max(12, left) })
      }
    } else {
      setCoords(null)
    }
    setYearPickerOpen(false)
    setOpen(o => !o)
  }

  const min = minDate ? parseISO(minDate) : null
  const max = maxDate ? parseISO(maxDate) : null
  const isDisabled = (d: Date) => Boolean((min && d < min) || (max && d > max))

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let cursor = gridStart
  while (cursor <= gridEnd) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }

  const handleSelect = (d: Date) => {
    if (isDisabled(d)) return
    onChange(format(d, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const calendarBody = (
    <>
      <div className="flex items-center justify-between mb-2 px-1">
        <button type="button" onClick={() => yearPickerOpen ? setYearPickerOpen(false) : setViewMonth(m => subMonths(m, 1))}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2A2A2A] transition-colors">
          <ChevronLeft size={16} />
        </button>
        <button type="button" onClick={() => setYearPickerOpen(o => !o)}
          className="text-white text-sm font-medium hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-[#2A2A2A]">
          {format(viewMonth, 'MMMM yyyy', { locale: tr })}
        </button>
        <button type="button" onClick={() => yearPickerOpen ? setYearPickerOpen(false) : setViewMonth(m => addMonths(m, 1))}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2A2A2A] transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {yearPickerOpen ? (
        <div className="grid grid-cols-4 gap-1.5 max-h-[240px] overflow-y-auto py-1">
          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 90 + i).reverse().map(year => (
            <button key={year} type="button"
              onClick={() => { setViewMonth(m => { const nd = new Date(m); nd.setFullYear(year); return nd }); setYearPickerOpen(false) }}
              className={`text-xs rounded-lg py-2.5 transition-colors ${year === viewMonth.getFullYear() ? 'bg-red-600 text-white font-semibold' : 'text-gray-300 hover:bg-[#2A2A2A]'}`}>
              {year}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
              <div key={d} className="text-center text-gray-600 text-[10px] font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d, i) => {
              const inMonth = isSameMonth(d, viewMonth)
              const selected = validSelectedDate && isSameDay(d, validSelectedDate)
              const today = isToday(d)
              const disabled = isDisabled(d)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelect(d)}
                  className={`
                    text-sm rounded-lg py-2 transition-colors
                    ${!inMonth ? 'text-gray-700' : disabled ? 'text-gray-700 cursor-not-allowed' : 'text-gray-300 hover:bg-[#2A2A2A] active:bg-[#333]'}
                    ${selected ? 'bg-red-600 text-white hover:bg-red-600 font-semibold' : ''}
                    ${today && !selected ? 'border border-red-500/40' : ''}
                  `}
                >
                  {format(d, 'd')}
                </button>
              )
            })}
          </div>

          <button type="button" onClick={() => handleSelect(new Date())}
            className="w-full mt-2 text-center text-xs text-red-400 hover:text-red-300 py-2 rounded-lg hover:bg-red-500/5 active:bg-red-500/10 transition-colors">
            Bugün
          </button>
        </>
      )}
    </>
  )

  return (
    <>
      {label && <label className="text-gray-400 text-sm mb-1.5 block">{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={className || "w-full bg-[#1E1E1E] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-red-500 outline-none flex items-center justify-between gap-2 hover:border-[#3A3A3A] transition-colors"}
      >
        <span className={validSelectedDate ? 'text-white' : 'text-gray-500'}>
          {validSelectedDate ? format(validSelectedDate, 'd MMMM yyyy', { locale: tr }) : (placeholder || 'Tarih seçin')}
        </span>
        <Calendar size={14} className="text-gray-500 flex-shrink-0" />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        isMobile ? (
          // MOBİL: ekranı kaplayan karartma + ortalanmış sabit panel.
          // Native <input type="date"> bazı mobil tarayıcılarda (özellikle
          // WebView veya eski Android Chrome) tutarsız açılıyordu; bu yüzden
          // tamamen kendi kontrolümüzdeki bu görünüm kullanılıyor.
          <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
            <div ref={popoverRef} onClick={e => e.stopPropagation()}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl p-4 w-full max-w-[340px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm font-semibold">Tarih Seç</span>
                <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white p-1"><X size={16} /></button>
              </div>
              {calendarBody}
            </div>
          </div>
        ) : (
          <div
            ref={popoverRef}
            style={{ position: 'absolute', top: coords?.top ?? 0, left: coords?.left ?? 0, zIndex: 9999, width: PICKER_WIDTH }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl p-3"
          >
            {calendarBody}
          </div>
        ),
        document.body
      )}
    </>
  )
}
