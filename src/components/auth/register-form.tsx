"use client";

import Link from "next/link";
import { Upload, X, ChevronDown, ChevronUp, Shield, FileText, Check } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { registerAction, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

const CITIES = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir",
  "Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli",
  "Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane",
  "Hakkari","Hatay","Isparta","Mersin","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli",
  "Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş",
  "Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat",
  "Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman",
  "Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"
].sort();

const FLEET_SIZES = [
  "1-5 araç","6-10 araç","11-20 araç","21-50 araç","51-100 araç","100+ araç"
];

// KVKK metni
const KVKK_TEXT = `KİŞİSEL VERİLERİN KORUNMASI KANUNU KAPSAMINDA AYDINLATMA METNİ

Veri Sorumlusu: BilgiOrtağım Yazılım Hizmetleri

1. AMAÇ VE KAPSAM
Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi uyarınca, BilgiOrtağım platformunu kullanan üye firmalar ve bu firmalar aracılığıyla sisteme kaydedilen araç kiralama müşterileri hakkında hazırlanmıştır.

BilgiOrtağım; araç kiralama firmalarına yönelik müşteri geçmiş bilgisi sorgulama, kiralama takibi ve muhasebe hizmetleri sunan bir yazılım platformudur. Platform, firmalar arasında müşteri deneyimi paylaşımına aracılık etmekte olup bağımsız bir veri tabanı işletmektedir.

2. İŞLENEN KİŞİSEL VERİLER

A) Üye Firma Yetkilileri:
• Ad, soyad, TC kimlik numarası, doğum tarihi
• E-posta adresi, telefon numarası
• Firma unvanı, vergi numarası, vergi dairesi
• Adres bilgileri (il, ilçe)
• Web sitesi / sosyal medya hesabı

B) Araç Kiralama Müşterileri (Firmalar Aracılığıyla):
• Ad, soyad
• TC kimlik numarası (sistemde yalnızca karma/hash değeri olarak saklanır, düz metin olarak tutulmaz)
• Telefon numarası
• Araç kiralama geçmişi, ödeme durumu, hasar kayıtları
• Üye firmalar tarafından eklenen yorumlar ve belgeler

3. KİŞİSEL VERİLERİN İŞLENME AMAÇLARI
• Üyelik kaydının oluşturulması ve hesap yönetimi
• Araç kiralama firmalarına müşteri geçmiş bilgisi sorgulama hizmeti sunulması
• Kiralama sektöründe güvenli ticari ilişkilerin desteklenmesi
• Dolandırıcılık, araç hasarı ve ödeme ihlallerinin önlenmesi
• Yasal yükümlülüklerin yerine getirilmesi
• Platform güvenliğinin sağlanması ve kötüye kullanımın önlenmesi

4. HUKUKİ DAYANAK
• Açık rıza (m. 5/1): Müşteri sorgulama hizmetinin kullanımı için
• Sözleşmenin kurulması ve ifası (m. 5/2-c)
• Meşru menfaat (m. 5/2-f): Araç kiralama sektöründe güvenli ticari ortamın sağlanması
• Hukuki yükümlülük (m. 5/2-ç): Yasal saklama yükümlülükleri

ÖNEMLİ: Üye firmalar, sisteme kaydettiği müşteri bilgileri için KVKK kapsamında veri sorumlusu sıfatını taşımaktadır. BilgiOrtağım bu kapsamda veri işleyen konumundadır. Üye firma, müşteriden gerekli açık rızayı almakla yükümlüdür.

5. MÜŞTERİ AÇIK RIZASI ZORUNLULUĞU
Araç kiralama firmaları, müşteri bilgilerini sisteme kaydetmeden ve TC kimliğiyle sorgulama yapmadan önce müşteriden yazılı veya elektronik açık rıza almak zorundadır. Sorgulama ekranındaki onay metni bu amaca hizmet etmekte olup üye firma söz konusu onayı müşteri adına teyit etmektedir. Bu teyidin sorumluluğu tamamen üye firmaya aittir.

6. KİŞİSEL VERİLERİN AKTARIMI
• Yalnızca platforma üye ve yetkili araç kiralama firmalarıyla paylaşılmaktadır
• Üçüncü taraf reklam veya pazarlama şirketleriyle paylaşılmamaktadır
• Yasal zorunluluk halinde resmi makamlarla paylaşılabilir
• Platform altyapısı için Supabase ve Vercel hizmetleri kullanılmaktadır (GDPR uyumlu)

7. SAKLAMA SÜRELERİ
• Üye firma verileri: Üyelik süresince ve üyelik sonrası 5 yıl
• Müşteri kiralama kayıtları: Oluşturulmasından itibaren 5 yıl
• Güvenlik logları: 1 yıl

8. HAKLARINIZ (KVKK m. 11)
• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• İşlenmişse bilgi talep etme
• Amacına uygun kullanılıp kullanılmadığını öğrenme
• Yurt içi/dışında aktarıldığı kişileri öğrenme
• Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme
• Şartlar dahilinde silinmesini isteme
• Aleyhine sonuç doğuran otomatik işlemlere itiraz etme
• Kanuna aykırı işlemden doğan zararın giderilmesini talep etme

Başvuru: [iletisim@bilgiortagim.com]

9. GÜVENLİK TEDBİRLERİ
• TC kimlik numaraları düz metin olarak saklanmaz (SHA-256 hash)
• Tüm dosyalar şifreli depolanır
• Dosya URL'leri geçici ve imzalı bağlantılar üzerinden sunulur
• Tüm erişimler kayıt altına alınır (audit log)
• Rate limiting ile yetkisiz toplu sorgulama engellenir`;

// Üyelik Sözleşmesi metni
const CONTRACT_TEXT = `BİLGİORTAĞIM YAZILIM HİZMETLERİ ÜYELİK SÖZLEŞMESİ

TARAFLAR
Hizmet Sağlayıcı: BilgiOrtağım Yazılım Hizmetleri ("BilgiOrtağım")
Üye: Kayıt formunu dolduran ve onaylayan araç kiralama firması ve yetkilisi ("Üye")

MADDE 1 — SÖZLEŞMENİN KONUSU
Bu sözleşme, BilgiOrtağım platformunun Üye tarafından kullanımına ilişkin koşulları düzenlemektedir. Platform; müşteri geçmiş sorgulama, kiralama takvimi yönetimi ve mini muhasebe gibi araç kiralama firmalarına özel hizmetler sunmaktadır.

MADDE 2 — ÜYELİK KOŞULLARI
Üye aşağıdaki koşulları kabul eder:
1. Kayıt sırasında verilen tüm bilgilerin doğru, güncel ve eksiksiz olduğunu
2. Platformun yalnızca araç kiralama faaliyeti kapsamında kullanılacağını
3. Sisteme kaydedilecek müşteri bilgileri için KVKK kapsamında açık rıza alındığını
4. Üyeliğin admin onayına tabi olduğunu ve onay öncesi hizmetlere erişilemeyeceğini
5. Abonelik planına uygun kullanım limitlerinin aşılmayacağını

MADDE 3 — MÜŞTERİ VERİLERİNİN KULLANIMI VE SORUMLULUK

3.1. Üye, sisteme kaydettiği her müşterinin kişisel verileri için KVKK kapsamında veri sorumlusu sıfatını taşımaktadır.

3.2. Üye, müşteriden aydınlatma yaparak açık rıza almakla yükümlüdür. Platform üzerindeki onay mekanizması bu rızanın teyidi niteliğinde olup rızanın alınıp alınmadığının sorumluluğu tamamen Üye'ye aittir.

3.3. Sisteme gerçek dışı, asılsız veya kötü niyetli bilgi girilmesi yasaktır. Üye, eklediği yorumların doğruluğundan hukuken sorumludur.

3.4. Üye'nin sisteme girdiği olumsuz müşteri kaydının gerçeği yansıtmadığının tespiti halinde BilgiOrtağım, söz konusu kaydı bildirim yapmaksızın silebilir ve Üye'nin üyeliğini askıya alabilir.

3.5. BilgiOrtağım, Üye'nin sisteme girdiği verilerin doğruluğunu denetlemek, teyit etmek veya garanti etmekle yükümlü değildir. Platform bir aracı olup içeriğin sorumluluğu Üye'ye aittir.

MADDE 4 — YASAKLANAN KULLANIMLAR
Üye aşağıdaki eylemleri gerçekleştiremez:
• Sistemi araç kiralama dışı amaçlarla kullanmak
• Başkasına ait TC kimlik numaralarını izinsiz sorgulamak
• Otomatik araçlarla (bot, script vb.) toplu sorgulama yapmak
• Sisteme kasıtlı olarak yanlış müşteri bilgisi girmek
• Platform verilerini üçüncü taraflarla paylaşmak veya satmak
• Güvenlik sistemlerini aşmaya çalışmak

MADDE 5 — HİZMET BEDELİ VE ABONELİK
• Abonelik ücretleri platforma giriş yapıldıktan sonra seçilen plana göre belirlenir
• BilgiOrtağım fiyatları 30 gün önceden bildirmek kaydıyla değiştirme hakkını saklı tutar
• İptal halinde kalan süre için ücret iadesi yapılmaz
• Ödeme yapılmaması halinde üyelik askıya alınır, veriler 90 gün süreyle saklanır

MADDE 6 — HİZMETİN ASKIYA ALINMASI VE FESHİ
BilgiOrtağım aşağıdaki durumlarda üyeliği askıya alabilir veya sonlandırabilir:
• Bu sözleşme hükümlerinin ihlali
• KVKK'ya aykırı veri işleme tespiti
• Sisteme kötü niyetli veri girişi
• Ödeme yükümlülüklerinin yerine getirilmemesi
• Yetkili makamların talebi

MADDE 7 — SORUMLULUK SINIRLAMASI
• BilgiOrtağım, platformda yer alan Üye kaynaklı içeriklerin doğruluğunu garanti etmez
• Platform "olduğu gibi" sunulmaktadır; teknik kesintilerden kaynaklanan zararlardan sorumluluk kabul edilmez
• BilgiOrtağım'ın herhangi bir nedenle tazminat sorumluluğu, son 3 aylık abonelik ücreti ile sınırlıdır

MADDE 8 — UYGULANACAK HUKUK VE YETKİ
Bu sözleşmeye Türkiye Cumhuriyeti hukuku uygulanır. Uyuşmazlıklarda [İL] Mahkemeleri ve İcra Daireleri yetkilidir.

MADDE 9 — DEĞİŞİKLİKLER
BilgiOrtağım bu sözleşmeyi ve KVKK metnini güncelleyebilir. Değişiklikler platforma giriş sırasında Üye'ye bildirilir. Kullanıma devam edilmesi değişikliklerin kabulü anlamına gelir.`;

function DocumentModal({ title, content, onClose }: { title: string; content: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] flex-shrink-0">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">
          <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">{content}</pre>
        </div>
        <div className="p-4 border-t border-[#2A2A2A] flex-shrink-0">
          <button onClick={onClose}
            className="w-full bg-[#E02424] hover:bg-[#c41f1f] text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
            Okudum, Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [kvkkOpen, setKvkkOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [kvkkChecked, setKvkkChecked] = useState(false);
  const [contractChecked, setContractChecked] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const inputCls = "w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2.5 text-sm focus:border-[#E02424] outline-none placeholder:text-[#4A4A4A] transition-colors";
  const labelCls = "block text-sm font-medium text-[#a3a3a3] mb-1.5";

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 bg-[#E02424] rounded-lg flex items-center justify-center font-bold text-sm text-white">B</div>
          <span className="font-bold text-lg text-white">BilgiOrtağım</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-4">Firma Kaydı Oluştur</h1>
        <p className="text-[#737373] text-sm mt-1">Başvurunuz incelendikten sonra hesabınız aktifleştirilecektir.</p>
      </div>

      {/* Adım göstergesi */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: 'Yetkili Bilgileri' },
          { n: 2, label: 'Firma Bilgileri' },
          { n: 3, label: 'Onay & Tamamla' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors",
              step > s.n ? "bg-[#E02424] text-white" : step === s.n ? "bg-[#E02424] text-white" : "bg-[#2A2A2A] text-[#737373]"
            )}>
              {step > s.n ? <Check size={12} /> : s.n}
            </div>
            <span className={cn("text-xs ml-1.5 hidden sm:block", step === s.n ? "text-white" : "text-[#737373]")}>{s.label}</span>
            {i < 2 && <div className="flex-1 h-px bg-[#2A2A2A] mx-2" />}
          </div>
        ))}
      </div>

      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
        {state.error && (
          <div className="rounded-lg border border-[#E02424]/40 bg-[#E02424]/10 px-4 py-3 text-sm text-[#E02424] mb-5">
            {state.error}
          </div>
        )}

        <form action={formAction}>
          {/* ===== ADIM 1: YETKİLİ BİLGİLERİ ===== */}
          <div className={step !== 1 ? "hidden" : ""}>
            <h2 className="text-white font-semibold mb-5">Yetkili Bilgileri</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Ad Soyad *</label>
                <input name="full_name" required placeholder="Adınız Soyadınız" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>TC Kimlik No *</label>
                  <input name="tc_number" required maxLength={11} inputMode="numeric"
                    placeholder="12345678901"
                    className={inputCls}
                    onChange={e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11) }} />
                </div>
                <div>
                  <label className={labelCls}>Doğum Tarihi *</label>
                  <input name="birth_date" type="date" required className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Telefon *</label>
                <input name="phone" type="tel" required placeholder="05XX XXX XX XX" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>E-posta *</label>
                <input name="email" type="email" required placeholder="firma@email.com" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Şifre *</label>
                  <input name="password" type="password" minLength={8} required placeholder="En az 8 karakter" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Şifre Tekrar *</label>
                  <input name="password_confirm" type="password" minLength={8} required className={inputCls} />
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setStep(2)}
              className="w-full mt-6 bg-[#E02424] hover:bg-[#c41f1f] text-white py-3 rounded-lg font-medium transition-colors">
              Devam Et →
            </button>
          </div>

          {/* ===== ADIM 2: FİRMA BİLGİLERİ ===== */}
          <div className={step !== 2 ? "hidden" : ""}>
            <h2 className="text-white font-semibold mb-5">Firma Bilgileri</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Firma Adı *</label>
                <input name="company_name" required placeholder="Firma Unvanı" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Vergi Numarası *</label>
                  <input name="tax_number" required placeholder="1234567890" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Vergi Dairesi *</label>
                  <input name="tax_office" required placeholder="Vergi Dairesi Adı" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>İl *</label>
                  <select name="city" required className={inputCls}>
                    <option value="">İl seçin</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>İlçe *</label>
                  <input name="district" required placeholder="İlçe" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Web Sitesi / Sosyal Medya <span className="text-[#737373] font-normal">(opsiyonel)</span></label>
                <input name="website" type="url" placeholder="https://firmaniz.com veya @firmaniz" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Filo Büyüklüğü <span className="text-[#737373] font-normal">(opsiyonel)</span></label>
                <select name="fleet_size" className={inputCls}>
                  <option value="">Seçin</option>
                  {FLEET_SIZES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Vergi Levhası <span className="text-[#737373] font-normal">(PDF, JPG, PNG — max 10 MB)</span> *</label>
                <input ref={fileRef} type="file" name="tax_document" accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden" required onChange={e => setFileName(e.target.files?.[0]?.name ?? null)} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-sm transition-colors hover:border-[#E02424]/50",
                    fileName ? "border-[#E02424]/40 bg-[#E02424]/5" : "border-[#2A2A2A] bg-[#0A0A0A]"
                  )}>
                  <Upload className="size-5 text-[#737373] flex-shrink-0" />
                  <span className={fileName ? "text-[#F5F5F5]" : "text-[#737373]"}>{fileName ?? "Dosya seçin"}</span>
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-[#737373] py-3 rounded-lg font-medium hover:text-white transition-colors">
                ← Geri
              </button>
              <button type="button" onClick={() => setStep(3)}
                className="flex-1 bg-[#E02424] hover:bg-[#c41f1f] text-white py-3 rounded-lg font-medium transition-colors">
                Devam Et →
              </button>
            </div>
          </div>

          {/* ===== ADIM 3: ONAY ===== */}
          <div className={step !== 3 ? "hidden" : ""}>
            <h2 className="text-white font-semibold mb-5">Sözleşme & Onay</h2>
            <div className="space-y-4">
              {/* KVKK */}
              <div className={cn(
                "rounded-xl border p-4 transition-colors",
                kvkkChecked ? "border-emerald-500/30 bg-emerald-500/5" : "border-[#2A2A2A] bg-[#0A0A0A]"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 cursor-pointer transition-colors",
                    kvkkChecked ? "bg-emerald-500 border-emerald-500" : "border-[#3A3A3A]"
                  )} onClick={() => setKvkkChecked(!kvkkChecked)}>
                    {kvkkChecked && <Check size={10} className="text-white" />}
                  </div>
                  <input type="checkbox" name="kvkk_accepted" checked={kvkkChecked} onChange={() => {}} className="hidden" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Shield size={14} className="text-blue-400 flex-shrink-0" />
                      <span className="text-white text-sm font-medium">KVKK Aydınlatma Metni</span>
                      <button type="button" onClick={() => setKvkkOpen(true)}
                        className="text-[#E02424] text-xs hover:underline ml-auto">
                        Metni Oku →
                      </button>
                    </div>
                    <p className="text-[#737373] text-xs mt-1">
                      6698 sayılı KVKK kapsamında kişisel verilerimin işlenmesine ilişkin aydınlatma metnini okudum ve bilgilendirildim.
                    </p>
                    <button type="button" onClick={() => setKvkkChecked(!kvkkChecked)}
                      className={cn("text-xs mt-2 font-medium transition-colors", kvkkChecked ? "text-emerald-400" : "text-[#737373] hover:text-white")}>
                      {kvkkChecked ? "✓ Onaylandı" : "Onaylıyorum"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sözleşme */}
              <div className={cn(
                "rounded-xl border p-4 transition-colors",
                contractChecked ? "border-emerald-500/30 bg-emerald-500/5" : "border-[#2A2A2A] bg-[#0A0A0A]"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 cursor-pointer transition-colors",
                    contractChecked ? "bg-emerald-500 border-emerald-500" : "border-[#3A3A3A]"
                  )} onClick={() => setContractChecked(!contractChecked)}>
                    {contractChecked && <Check size={10} className="text-white" />}
                  </div>
                  <input type="checkbox" name="contract_accepted" checked={contractChecked} onChange={() => {}} className="hidden" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText size={14} className="text-purple-400 flex-shrink-0" />
                      <span className="text-white text-sm font-medium">Üyelik Sözleşmesi</span>
                      <button type="button" onClick={() => setContractOpen(true)}
                        className="text-[#E02424] text-xs hover:underline ml-auto">
                        Sözleşmeyi Oku →
                      </button>
                    </div>
                    <p className="text-[#737373] text-xs mt-1">
                      BilgiOrtağım Üyelik Sözleşmesi'ni, özellikle müşteri verilerinin kullanımına ilişkin 3. maddeyi okudum ve kabul ediyorum.
                    </p>
                    <button type="button" onClick={() => setContractChecked(!contractChecked)}
                      className={cn("text-xs mt-2 font-medium transition-colors", contractChecked ? "text-emerald-400" : "text-[#737373] hover:text-white")}>
                      {contractChecked ? "✓ Onaylandı" : "Onaylıyorum"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <p className="text-amber-400/80 text-xs leading-relaxed">
                  <strong className="text-amber-400">Önemli:</strong> Başvurunuz admin onayına tabidir. Onay sonrası e-posta ile bilgilendirileceksiniz. Vergi levhanız ve bilgileriniz incelenerek hesabınız aktifleştirilecektir.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] text-[#737373] py-3 rounded-lg font-medium hover:text-white transition-colors">
                ← Geri
              </button>
              <button type="submit" disabled={pending || !kvkkChecked || !contractChecked}
                className="flex-1 bg-[#E02424] hover:bg-[#c41f1f] text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {pending ? "Kayıt oluşturuluyor..." : "Başvuruyu Tamamla"}
              </button>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-[#737373]">
          Zaten hesabınız var mı?{" "}
          <Link href="/giris" className="font-medium text-[#E02424] hover:underline">Giriş yapın</Link>
        </p>
      </div>

      {/* Modallar */}
      {kvkkOpen && <DocumentModal title="KVKK Aydınlatma Metni" content={KVKK_TEXT} onClose={() => setKvkkOpen(false)} />}
      {contractOpen && <DocumentModal title="Üyelik Sözleşmesi" content={CONTRACT_TEXT} onClose={() => setContractOpen(false)} />}
    </div>
  );
}