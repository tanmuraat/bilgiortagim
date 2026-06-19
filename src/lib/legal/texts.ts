// KVKK ve Üyelik Sözleşmesi metinleri — tek kaynaktan yönetilir.
// Kayıt sayfası, /kvkk sayfası ve /sozlesme sayfası buradan okur.

export const KVKK_TEXT = `KİŞİSEL VERİLERİN KORUNMASI KANUNU KAPSAMINDA AYDINLATMA METNİ

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
• Rate limiting ile yetkisiz toplu sorgulama engellenir`

export const CONTRACT_TEXT = `BİLGİORTAĞIM YAZILIM HİZMETLERİ ÜYELİK SÖZLEŞMESİ

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
BilgiOrtağım bu sözleşmeyi ve KVKK metnini güncelleyebilir. Değişiklikler platforma giriş sırasında Üye'ye bildirilir. Kullanıma devam edilmesi değişikliklerin kabulü anlamına gelir.`