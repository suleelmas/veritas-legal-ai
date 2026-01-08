import { NextResponse } from "next/server";
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import OpenAI from 'openai';
import { supabase } from "@/lib/supabase";
import PDFParser from 'pdf2json';

// Runtime configuration for Next.js App Router
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET handler for debugging (404 hatasını önlemek için)
export async function GET(req: Request) {
  console.log('[API] GET /api/analyze çağrıldı - Bu endpoint sadece POST kabul eder');
  return NextResponse.json({ 
    error: 'Method not allowed',
    message: 'This endpoint only accepts POST requests',
    allowedMethods: ['POST']
  }, { status: 405 });
}

// Telegram Notification Helper
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8415963295:AAEgRJ3QX2ZBVsIh5lxiXhFOf_-7WTpIOdc";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8418884482";

async function sendTelegramNotification(message: string, isCritical: boolean = false) {
  try {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const emoji = isCritical ? "🚨" : "📊";
    const formattedMessage = `${emoji} ${message}`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: formattedMessage,
        parse_mode: 'HTML'
      })
    });
    
    if (!response.ok) {
      console.error('Telegram notification failed:', await response.text());
    }
  } catch (error) {
    console.error('Telegram notification error:', error);
  }
}

// PDF Parse modülü artık standart import ile yükleniyor

function getUserKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") || "";
  return `${ip}_${ua}`;
}

async function performLegalAnalysis(pdfText: string, targetLang: string, onFinish?: (text: string) => Promise<void>) {
  console.log('[performLegalAnalysis] ========================================');
  console.log('[performLegalAnalysis] FONKSİYON ÇAĞRILDI!');
  console.log('[performLegalAnalysis] PDF metin uzunluğu:', pdfText?.length || 0);
  console.log('[performLegalAnalysis] Target lang:', targetLang);
  console.log('[performLegalAnalysis] PDF metin ilk 200 karakter:', pdfText?.substring(0, 200) || 'BOŞ');
  console.log('[performLegalAnalysis] ========================================');
  
  const analysisPrompt = `Sen bir yardımcı hukuk asistanısın ve verilen metne göre nesnel analizler yaparsın. Aşağıdaki hukuki metni derinlemesine ve kapsamlı bir şekilde analiz et. Analizini yaparken tüm yasal çerçeveleri, risk faktörlerini, uyum gerekliliklerini, potansiyel yasal sonuçları, yargı içtihatlarını ve akademik görüşleri göz önünde bulundur.

=== KAPSAMLI HUKUK KÜTÜPHANESİ VE ANALİZ ÇERÇEVESİ ===

Analizinde MUTLAKA ve ÇOK DETAYLI şekilde şu yasal düzenlemeleri, hukuk sistemlerini ve yasal alanları göz önünde bulundur:

1. BGB (Bürgerliches Gesetzbuch - Almanya Medeni Kanunu):
   - Tüm ilgili maddeleri, alt maddeleri (Absätze), paragrafları ve hükümleri belirt
   - Sözleşme hukuku (Vertragsrecht): BGB § 145-157 (Angebot und Annahme), BGB § 241-304 (Schuldverhältnisse), BGB § 305-310 (Allgemeine Geschäftsbedingungen)
   - Borçlar hukuku: BGB § 275-304 (Leistungsstörungen), BGB § 433-480 (Kaufvertrag), BGB § 535-580a (Miete, Pacht)
   - Tazminat hukuku: BGB § 280 (Schadensersatz wegen Pflichtverletzung), BGB § 823 (Schadensersatzpflicht), BGB § 826 (Sittenwidrige vorsätzliche Schädigung)
   - Haksız fiil hukuku: BGB § 823-853 (Deliktsrecht)
   - Genel hükümler: BGB § 1-240 (Allgemeiner Teil)
   - Alman hukuk sistemine özgü yükümlülükleri, hakları, yaptırımları ve içtihatları analiz et
   - BGH (Bundesgerichtshof) kararları ve Alman yargı içtihatlarını değerlendir

2. UCC (Uniform Commercial Code - ABD Birleşik Ticaret Kanunu):
   - Tüm ilgili bölümler (Article 1-11), maddeler, alt maddeler ve yorumları referans al
   - Article 1: Genel Hükümler (General Provisions) - UCC 1-201, 1-302, 1-303
   - Article 2: Satış Sözleşmeleri (Sales) - UCC 2-201 (Statute of Frauds), UCC 2-207 (Additional Terms), UCC 2-314 (Implied Warranty), UCC 2-315 (Fitness for Particular Purpose), UCC 2-601 (Perfect Tender Rule)
   - Article 2A: Kiralama (Leases) - UCC 2A-101 ve devamı
   - Article 3: Kambiyo Senetleri (Negotiable Instruments) - UCC 3-101 ve devamı
   - Article 4: Banka Mevduatları ve Tahsilat (Bank Deposits and Collections) - UCC 4-101 ve devamı
   - Article 4A: Fon Transferleri (Fund Transfers) - UCC 4A-101 ve devamı
   - Article 5: Akreditifler (Letters of Credit) - UCC 5-101 ve devamı
   - Article 6: Toplu Satışlar (Bulk Sales) - UCC 6-101 ve devamı
   - Article 7: Belge Başlıkları (Documents of Title) - UCC 7-101 ve devamı
   - Article 8: Menkul Kıymetler (Investment Securities) - UCC 8-101 ve devamı
   - Article 9: Güvenlik Hakları (Secured Transactions) - UCC 9-101, UCC 9-203 (Attachment), UCC 9-308 (Perfection), UCC 9-609 (Default)
   - Article 10: Etkin Tarih Hükümleri (Effective Date and Repealer)
   - Article 11: Etkilenmeyen İşlemler (Effective Date and Transition Provisions)
   - ABD ticaret hukukuna özgü gereklilikleri, yorumları ve federal/eyalet içtihatlarını belirt
   - Uniform Law Commission yorumlarını ve Restatement of Law referanslarını değerlendir

3. KVKK (Kişisel Verilerin Korunması Kanunu - Türkiye, 6698 sayılı Kanun):
   - Tüm ilgili maddeleri, yükümlülükleri, yaptırımları ve idari para cezalarını detaylı analiz et
   - KVKK m.3: Tanımlar (kişisel veri, özel nitelikli kişisel veri, veri sorumlusu, veri işleyen, açık rıza)
   - KVKK m.4: Genel İlkeler (hukuka ve dürüstlük kurallarına uygunluk, doğru ve gerektiğinde güncel olma, belirli açık ve meşru amaçlar için işleme)
   - KVKK m.5: Kişisel verilerin işlenme şartları (açık rıza, kanunlarda açıkça öngörülme, sözleşmenin kurulması veya ifası)
   - KVKK m.6: Özel nitelikli kişisel verilerin işlenme şartları (sağlık, cinsel hayat, biyometrik veriler)
   - KVKK m.7: Silme, yok etme veya anonim hale getirme
   - KVKK m.8: Veri sorumlusunun aydınlatma yükümlülüğü
   - KVKK m.9: Kişisel verilerin yurt dışına aktarılması
   - KVKK m.10: Veri sahibinin hakları (bilgi talep etme, düzeltme, silme, itiraz etme)
   - KVKK m.11: Başvuru hakkı
   - KVKK m.12: Veri güvenliğine ilişkin yükümlülükler
   - KVKK m.13: Veri ihlali bildirimi
   - KVKK m.14: Veri Koruma Kurulu
   - KVKK m.15-18: Yaptırımlar ve idari para cezaları (2024 güncel tutarları ile)
   - KVKK Yönetmeliği ve KVKK Kurulu kararlarını referans al
   - Türk hukuk sistemindeki içtihatları ve KVKK Kurulu uygulamalarını değerlendir

4. GDPR (General Data Protection Regulation - AB Genel Veri Koruma Yönetmeliği, Regulation (EU) 2016/679):
   - Tüm ilgili maddeleri (Articles), gereklilikleri, yaptırımları ve yönergeleri değerlendir
   - GDPR Art. 4: Tanımlar (Definitions)
   - GDPR Art. 5: Veri işleme ilkeleri (Principles relating to processing of personal data)
   - GDPR Art. 6: İşleme için yasal dayanak (Lawfulness of processing) - 6(1)(a) Consent, 6(1)(b) Contract, 6(1)(c) Legal obligation, 6(1)(f) Legitimate interests
   - GDPR Art. 7: Rıza koşulları (Conditions for consent)
   - GDPR Art. 8: Çocukların rızası (Conditions applicable to child's consent)
   - GDPR Art. 9: Özel veri kategorileri (Processing of special categories of personal data)
   - GDPR Art. 12-23: Veri sahibi hakları (Rights of the data subject) - Bilgi edinme, erişim, düzeltme, silme ("right to be forgotten"), işlemeye itiraz, veri taşınabilirliği
   - GDPR Art. 24-31: Veri sorumlusu ve veri işleyen yükümlülükleri
   - GDPR Art. 32: Güvenlik işleme (Security of processing)
   - GDPR Art. 33: Veri ihlali bildirimi (Notification of a personal data breach to the supervisory authority)
   - GDPR Art. 34: Veri sahibine bildirim (Communication of a personal data breach to the data subject)
   - GDPR Art. 35: Veri koruma etki değerlendirmesi (Data protection impact assessment)
   - GDPR Art. 36: Ön istişare (Prior consultation)
   - GDPR Art. 37-39: Veri koruma görevlisi (Data protection officer)
   - GDPR Art. 44-49: Üçüncü ülkelere veya uluslararası örgütlere aktarım (Transfers of personal data)
   - GDPR Art. 77-84: Yaptırımlar ve tazminat (Remedies, liability and penalties) - Art. 83: 20 milyon EUR veya küresel cirosun %4'üne kadar idari para cezası
   - GDPR Recitals (Gerekçeler) ve EDPB (European Data Protection Board) yönergelerini referans al
   - AB Adalet Divanı (CJEU) kararlarını ve ulusal veri koruma otoritelerinin kararlarını değerlendir

5. CISG (United Nations Convention on Contracts for the International Sale of Goods - BM Uluslararası Mal Satımına İlişkin Sözleşmeler Hakkında Sözleşme, 1980):
   - CISG Art. 1-6: Uygulama alanı ve genel hükümler
   - CISG Art. 14-24: Sözleşmenin kurulması (Formation of the contract)
   - CISG Art. 25-88: Satıcı ve alıcının yükümlülükleri (Obligations of the seller and buyer)
   - CISG Art. 45-52: Satıcının sözleşmeyi ihlal etmesi durumunda alıcının hakları
   - CISG Art. 61-65: Alıcının sözleşmeyi ihlal etmesi durumunda satıcının hakları
   - CISG Art. 74-77: Tazminat (Damages)
   - CISG Art. 78: Faiz (Interest)
   - CISG Art. 79-80: Mücbir sebep (Exemptions)
   - CISG'in uygulanabilirliği, çekilme hükümleri ve uluslararası içtihatları değerlendir

6. Türk Borçlar Kanunu (TBK - 6098 sayılı Kanun):
   - TBK m.1-48: Genel Hükümler
   - TBK m.49-118: Sözleşmelerin Kurulması (İcap, kabul, sözleşme özgürlüğü)
   - TBK m.119-206: Sözleşmelerin Hükümsüzlüğü (İptal, butlan, eksiklik)
   - TBK m.207-320: Borçların İfası ve İfa Edilmemesi
   - TBK m.321-420: Borçların Sona Ermesi
   - TBK m.421-480: Özel Borç İlişkileri (Satış, kira, hizmet sözleşmeleri)
   - TBK m.481-650: Haksız Fiil ve Sebepsiz Zenginleşme
   - TBK m.650-700: Tazminat Hukuku
   - Yargıtay içtihatlarını ve Türk hukuk doktrinini referans al

7. Türk Ticaret Kanunu (TTK - 6102 sayılı Kanun):
   - TTK m.1-150: Ticari İşletme
   - TTK m.151-400: Ticari İşler, Ticari Defterler
   - TTK m.401-800: Şirketler Hukuku (Kollektif, komandit, limited, anonim şirketler)
   - TTK m.801-1200: Kıymetli Evrak Hukuku
   - TTK m.1201-1530: Deniz Ticareti
   - TTK m.1531-1600: Sigorta Hukuku
   - Yargıtay ticaret dairesi kararlarını değerlendir

8. Rekabet Hukuku:
   - AB Rekabet Hukuku: TFEU Art. 101 (Kartel yasakları), TFEU Art. 102 (Hakim durumun kötüye kullanılması)
   - Türk Rekabet Hukuku: 4054 sayılı Rekabetin Korunması Hakkında Kanun
   - Sherman Act (ABD), Clayton Act (ABD)
   - Rekabet Kurulu kararları ve AB Komisyonu kararlarını referans al

9. Fikri Mülkiyet Hukuku:
   - Telif Hukuku: Bern Sözleşmesi, WIPO Copyright Treaty
   - Marka Hukuku: Paris Sözleşmesi, Madrid Protokolü, Türk Markalar Kanunu (6769 sayılı)
   - Patent Hukuku: Paris Sözleşmesi, PCT, Türk Patent ve Marka Kurumu mevzuatı
   - Ticari Sır ve Know-How koruması

10. Tüketici Hukuku:
    - AB Tüketici Hakları Direktifi (2011/83/EU)
    - Türk Tüketicinin Korunması Hakkında Kanun (6502 sayılı)
    - Mesafeli Sözleşmeler Yönetmeliği
    - Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri uygulamaları

11. İş Hukuku ve Çalışma Mevzuatı:
    - AB İş Hukuku Direktifleri (Çalışma Süresi, İş Sağlığı ve Güvenliği)
    - Türk İş Kanunu (4857 sayılı)
    - Toplu İş Sözleşmesi, Grev ve Lokavt Kanunu (6356 sayılı)
    - İş Sağlığı ve Güvenliği Kanunu (6331 sayılı)

12. Çevre Hukuku:
    - AB Çevre Direktifleri
    - Türk Çevre Kanunu (2872 sayılı)
    - Atık Yönetimi, Hava Kalitesi, Su Kirliliği mevzuatı

13. Vergi Hukuku (İlgiliyse):
    - Gelir Vergisi Kanunu, Kurumlar Vergisi Kanunu
    - KDV Kanunu, Özel Tüketim Vergisi Kanunu
    - Çifte Vergilendirmeyi Önleme Anlaşmaları

14. Uluslararası Ticaret Hukuku:
    - INCOTERMS 2020 (FOB, CIF, EXW, DDP vb.)
    - UCP 600 (Akreditif Kuralları)
    - URDG 758 (Teminat Mektupları Kuralları)
    - ICC Yönergeleri ve Model Sözleşmeleri

15. Elektronik Ticaret ve Dijital Hukuk:
    - eIDAS Yönetmeliği (AB - Elektronik Kimlik ve Güvenilir Hizmetler)
    - Elektronik Ticaretin Düzenlenmesi Hakkında Kanun (6563 sayılı)
    - Elektronik İmza Kanunu (5070 sayılı)
    - Dijital Hizmetler Yasası (DSA - AB), Dijital Piyasalar Yasası (DMA - AB)

16. Finansal Hizmetler ve Sermaye Piyasaları:
    - MiFID II (Markets in Financial Instruments Directive)
    - PSD2 (Payment Services Directive)
    - Türk Sermaye Piyasası Kanunu (6362 sayılı)
    - Bankacılık Kanunu (5411 sayılı)

=== ANALİZ METODOLOJİSİ VE DERİNLİK GEREKSİNİMLERİ ===

Analizini şu metodoloji ile yap:

1. METİN ANALİZİ:
   - Belgenin türünü, amacını, taraflarını ve hukuki niteliğini tespit et
   - Sözleşme türü, tek taraflı hukuki işlem, çok taraflı anlaşma, genel işlem koşulları, yönetmelik, politika vb. belirle
   - Belgedeki tüm hukuki kavramları, terimleri ve teknik ifadeleri analiz et
   - Belgedeki muğlak, eksik veya riskli ifadeleri tespit et

2. YASAL UYUMLULUK ANALİZİ:
   - Her yasal düzenleme açısından uyumluluk durumunu değerlendir
   - Zorunlu hükümler, yasaklar, izinler ve koşullu izinleri belirle
   - Eksik yükümlülükleri, ihlal risklerini ve yaptırımları tespit et
   - Çapraz referanslar yap (bir düzenlemedeki hükmün diğer düzenlemelerle ilişkisi)

3. RİSK ANALİZİ:
   - Her riski şiddet (yüksek/orta/düşük), olasılık ve etki açısından değerlendir
   - Riskin hukuki, mali, operasyonel ve itibar boyutlarını analiz et
   - Riskin gerçekleşmesi durumunda ortaya çıkabilecek tazminat talepleri, idari para cezaları, yasal yaptırımlar, sözleşme feshi, yasaklama gibi sonuçları belirt
   - Riskin aciliyetini ve zamanlamasını değerlendir

4. EYLEM PLANI:
   - Her eylemi öncelik, uygulanabilirlik, maliyet ve zamanlama açısından değerlendir
   - Eylemin yasal dayanağını, uygulama adımlarını ve sorumlu tarafları belirt
   - Eylemin tamamlanmaması durumunda ortaya çıkabilecek sonuçları açıkla

Yanıtın MUTLAKA şu JSON yapısında olmalı (başka hiçbir metin ekleme, sadece geçerli JSON):
{
  "summary": "Belgenin kapsamlı ve detaylı özeti ve genel hukuki değerlendirmesi. En az 500-700 kelime olmalı. Belgenin türü, tarafları, temel hukuki konuları, risk alanları, uyum durumu, önemli yasal referanslar ve genel değerlendirme hakkında kapsamlı bilgi içermeli. Belgenin hukuki geçerliliği, yürürlüğü ve uygulanabilirliği hakkında görüş belirtilmeli.",
  "document_type": "Belgenin hukuki türü (sözleşme, genel işlem koşulları, politika, yönetmelik, tek taraflı işlem vb.)",
  "parties": ["Belgedeki tarafların listesi ve rolleri"],
  "applicable_laws": ["Belgeye uygulanabilir yasal düzenlemelerin listesi"],
  "risk_cards": [
    {
      "title": "Risk başlığı (spesifik, açıklayıcı ve teknik)",
      "severity": "yüksek|orta|düşük",
      "probability": "yüksek|orta|düşük",
      "impact": "yüksek|önemli|orta|düşük",
      "description": "Riskin detaylı ve kapsamlı açıklaması. Riskin nedenleri, kökeni, hukuki dayanakları, potansiyel sonuçları, etkilenen taraflar, zamanlama ve aciliyet durumu içermeli. En az 200-300 kelime olmalı.",
      "affected_articles": {
        "BGB": ["Spesifik BGB madde numarası, alt madde ve detaylı açıklama (örn: BGB § 280 I - Schadensersatz wegen Pflichtverletzung: Borçlunun sözleşmeden doğan yükümlülüğünü ihlal etmesi durumunda alacaklının tazminat talep edebilme hakkı)"],
        "UCC": ["Spesifik UCC bölüm/madde referansları ve detaylı açıklama (örn: UCC Article 2-207 - Additional Terms in Acceptance: Kabul beyanındaki ek şartların sözleşmeye dahil olma koşulları)"],
        "KVKK": ["Spesifik KVKK madde numaraları, hükümler ve detaylı açıklama (örn: KVKK m.5 - Kişisel verilerin işlenme şartları: Açık rıza, kanuni zorunluluk, sözleşmenin kurulması/ifası gibi yasal dayanaklar)"],
        "GDPR": ["Spesifik GDPR madde numaraları, gereklilikler ve detaylı açıklama (örn: GDPR Art. 6(1)(a) - Consent as legal basis: Veri sahibinin açık ve bilgilendirilmiş rızası)"],
        "CISG": ["Spesifik CISG maddeleri ve açıklamaları (varsa)"],
        "TBK": ["Spesifik TBK maddeleri ve açıklamaları (varsa)"],
        "TTK": ["Spesifik TTK maddeleri ve açıklamaları (varsa)"],
        "Other": ["Diğer ilgili yasal düzenlemeler, direktifler, yönetmelikler ve açıklamaları (varsa)"]
      },
      "potential_consequences": "Bu riskin gerçekleşmesi durumunda ortaya çıkabilecek hukuki, mali, operasyonel, itibar ve stratejik sonuçlar. Tazminat miktarları, idari para cezaları, yasal yaptırımlar, sözleşme feshi, yasaklama, lisans iptali gibi spesifik sonuçları belirt. En az 150 kelime.",
      "mitigation_suggestions": "Riskin azaltılması, önlenmesi veya yönetilmesi için detaylı, uygulanabilir ve ölçülebilir öneriler. Önerilerin uygulanma adımları, maliyeti, zamanlaması ve beklenen etkisi belirtilmeli. En az 100 kelime.",
      "case_law_references": ["İlgili yargı kararları, içtihatlar ve akademik görüşler (varsa)"],
      "urgency": "acil|önemli|normal|düşük",
      "timeline": "Riskin gerçekleşme zamanlaması ve aciliyet durumu"
    }
  ],
  "references": {
    "BGB": ["İlgili BGB maddeleri, alt maddeleri, paragrafları ve detaylı açıklamaları. Her madde için madde numarası, başlık, içerik özeti ve belgeye uygulanabilirliği belirtilmeli."],
    "UCC": ["İlgili UCC bölüm/maddeleri, alt maddeleri ve detaylı açıklamaları. Her bölüm için Article numarası, başlık, içerik özeti ve belgeye uygulanabilirliği belirtilmeli."],
    "KVKK": ["İlgili KVKK maddeleri, yönetmelik hükümleri, KVKK Kurulu kararları ve detaylı açıklamaları. Her madde için madde numarası, başlık, içerik özeti, yaptırımlar ve belgeye uygulanabilirliği belirtilmeli."],
    "GDPR": ["İlgili GDPR maddeleri, Recitals, EDPB yönergeleri, CJEU kararları ve detaylı açıklamaları. Her madde için Article numarası, başlık, içerik özeti, yaptırımlar ve belgeye uygulanabilirliği belirtilmeli."],
    "CISG": ["İlgili CISG maddeleri ve açıklamaları (varsa)"],
    "TBK": ["İlgili TBK maddeleri, Yargıtay içtihatları ve açıklamaları (varsa)"],
    "TTK": ["İlgili TTK maddeleri, Yargıtay içtihatları ve açıklamaları (varsa)"],
    "Other": ["Diğer ilgili yasal düzenlemeler, uluslararası sözleşmeler, direktifler, yönetmelikler, içtihatlar ve referanslar (varsa)"]
  },
  "action_plan": [
    {
      "priority": "yüksek|orta|düşük",
      "action": "Yapılması gereken eylem (spesifik, uygulanabilir, ölçülebilir ve detaylı). Eylemin adımları, gereksinimleri ve beklenen sonuçları belirtilmeli.",
      "legal_basis": "Hangi yasal düzenleme, spesifik madde ve hükmü bu eylemi gerektiriyor. Madde numarası, başlık ve ilgili hüküm detaylı belirtilmeli.",
      "deadline_note": "Zamanlama notu, aciliyet durumu, önerilen tamamlanma süresi ve gecikme durumunda ortaya çıkabilecek sonuçlar (varsa)",
      "responsible_party": "Bu eylemin sorumlusu olması gereken taraf, birim veya kişi. Sorumluluk alanı ve yetkileri belirtilmeli (varsa)",
      "implementation_steps": ["Eylemin uygulanması için gereken adımların listesi"],
      "estimated_cost": "Eylemin tahmini maliyeti veya kaynak gereksinimi (varsa)",
      "expected_outcome": "Eylemin tamamlanması durumunda beklenen sonuç ve fayda"
    }
  ],
  "compliance_status": {
    "overall": "uyumlu|kısmen_uyumlu|uyumsuz",
    "details": "Genel uyum durumunun detaylı, kapsamlı açıklaması. Her yasal düzenleme açısından uyumluluk seviyesi, eksiklikler, ihlaller ve iyileştirme alanları belirtilmeli. En az 200 kelime.",
    "critical_issues": ["Yüksek öncelikli uyum sorunlarının detaylı listesi. Her sorun için açıklama, etki ve aciliyet belirtilmeli."],
    "recommendations": ["Genel öneriler, iyileştirme alanları ve en iyi uygulamalar. Her öneri için açıklama ve beklenen fayda belirtilmeli."],
    "compliance_score": {
      "BGB": "uyumlu|kısmen_uyumlu|uyumsuz",
      "UCC": "uyumlu|kısmen_uyumlu|uyumsuz",
      "KVKK": "uyumlu|kısmen_uyumlu|uyumsuz",
      "GDPR": "uyumlu|kısmen_uyumlu|uyumsuz",
      "Overall": "uyumlu|kısmen_uyumlu|uyumsuz"
    }
  },
  "legal_opinion": {
    "validity": "Belgenin hukuki geçerliliği ve yürürlüğü hakkında görüş",
    "enforceability": "Belgenin uygulanabilirliği ve yaptırım gücü hakkında görüş",
    "recommendations": "Belgenin iyileştirilmesi veya yeniden düzenlenmesi için öneriler",
    "alternative_approaches": "Alternatif hukuki yaklaşımlar veya sözleşme yapıları (varsa)"
  }
}

ÖNEMLİ TALİMATLAR VE GEREKSİNİMLER:
- Analizini ${targetLang} dilinde yap
- Tüm risk kartlarında, referanslarda ve eylem planında ilgili yasal düzenlemelerin SPESİFİK madde numaralarını, alt maddelerini ve paragraflarını belirt
- Her yasal referans için kapsamlı, bilgilendirici ve teknik açıklamalar ekle
- Risk değerlendirmelerini objektif, kapsamlı ve detaylı yap
- Eylem planındaki önerileri uygulanabilir, spesifik, ölçülebilir ve adım adım formüle et
- Yargı içtihatlarını, akademik görüşleri ve uygulama örneklerini referans al
- Yanıtını JSON formatında döndür, ek açıklama, önsöz, sonuç metni, markdown formatı veya başka herhangi bir metin ekleme
- JSON formatında hata olmamasına dikkat et (tırnak işaretleri, virgüller, köşeli parantezler, süslü parantezler doğru olmalı)
- Tüm string değerlerde özel karakterleri (tırnak, ters eğik çizgi, yeni satır) düzgün escape et
- Array'lerde en az bir örnek ver, boş array yerine ilgili örnekler ekle
- Her alanı doldur, "varsa" notu olan alanlar için bile ilgili bilgileri eklemeye çalış
- Analiz derinliğini maksimuma çıkar, yüzeysel değerlendirmeler yapma

Analiz edilecek metin:
PLACEHOLDER_PDF_TEXT`;

  // PDF metnini temizle ve kontrol et
  const cleanedPdfText = pdfText.trim();
  if (!cleanedPdfText || cleanedPdfText.length < 10) {
    console.error('[performLegalAnalysis] PDF metni çok kısa veya boş:', cleanedPdfText.length);
    throw new Error('PDF metni çok kısa veya boş');
  }
  
  // PDF metnini kısalt (OpenAI token limiti için) - Güvenlik taramasını azaltmak için
  const maxPdfLength = 8000; // 12000'den 8000'e düşürüldü
  const truncatedPdfText = cleanedPdfText.length > maxPdfLength 
    ? cleanedPdfText.substring(0, maxPdfLength) + '\n\n[... Metin kısaltıldı, tam analiz için tam metni gönderin ...]'
    : cleanedPdfText;
  
  // Prompt'u güncelle - PDF metnini kısaltılmış versiyonla değiştir
  const finalAnalysisPrompt = analysisPrompt.replace('PLACEHOLDER_PDF_TEXT', truncatedPdfText);
  
  // Prompt uzunluğunu kontrol et
  const promptLength = finalAnalysisPrompt.length;
  console.log('[performLegalAnalysis] Prompt uzunluğu:', promptLength, 'PDF metin uzunluğu:', cleanedPdfText.length, 'Kısaltılmış PDF uzunluğu:', truncatedPdfText.length);
  
  // Compare mode'daki gibi direkt JSON döndür (streaming olmadan)
  try {
    console.log('[performLegalAnalysis] Eski OpenAI SDK ile analiz başlatılıyor (Compare mode gibi)...');
    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini", // Güvenlik/politika takılmasını önlemek için mini model kullanılıyor
      messages: [
        {
          role: "system",
          content: `Sen bir yardımcı hukuk asistanısın ve verilen metne göre nesnel analizler yaparsın. Analizini sadece ${targetLang} dilinde yap. Mümkün olduğunca spesifik yasal madde referansları, yargı içtihatları ve akademik görüşler ver. Analizini derinlemesine ve kapsamlı yap.`
        },
        { role: "user", content: finalAnalysisPrompt }
      ],
      temperature: 0.2,
      // stream: false - Compare mode gibi direkt JSON döndür
    });
    
    console.log('[performLegalAnalysis] OpenAI yanıtı başarıyla alındı');
    
    const analysisResult = response.choices[0]?.message?.content || 'Analysis complete';
    
    console.log('[performLegalAnalysis] YANIT DETAYLI:', {
      yanitUzunlugu: analysisResult.length,
      ilk200Karakter: analysisResult.substring(0, 200),
      son200Karakter: analysisResult.substring(Math.max(0, analysisResult.length - 200)),
      tamYanit: analysisResult
    });
    
    // onFinish callback'ini çağır
    if (onFinish && analysisResult) {
      console.log('[performLegalAnalysis] onFinish çağrılıyor, text uzunluğu:', analysisResult.length);
      await onFinish(analysisResult);
    }
    
    // Compare mode gibi direkt JSON döndür
    return NextResponse.json({ 
      reply: analysisResult,
      analysis: analysisResult
    });
  } catch (error: any) {
    console.error('[performLegalAnalysis] OpenAI hatası:', {
      error: error,
      message: error?.message,
      stack: error?.stack
    });
    throw error;
  }
}

export async function POST(req: Request) {
  console.log('========================================');
  console.log('[API] POST /api/analyze çağrıldı - ROUTE ÇALIŞIYOR!');
  console.log('[API] Request method:', req.method);
  console.log('[API] Request URL:', req.url);
  console.log('[API] Request headers:', Object.fromEntries(req.headers.entries()));
  console.log('========================================');
  
  try {
    console.log('[API] Request body parse ediliyor...');
    const { pdfText, pdfBase64, targetLang, userEmail, userId, fileName } = await req.json();
    console.log('[API] Request body parse edildi!');
    console.log('[API] Request body alındı:', {
      hasPdfText: !!pdfText,
      hasPdfBase64: !!pdfBase64,
      targetLang,
      userEmail,
      userId,
      fileName
    });

    // Eğer pdfBase64 geliyorsa, önce PDF'i parse et
    let finalPdfText = pdfText;
    if (pdfBase64 && !pdfText) {
      try {
        const buffer = Buffer.from(pdfBase64, 'base64');
        const pdfParser = new PDFParser(null, true);
        
        // Promise wrapper for pdf2json (event-based API)
        const extractedText = await new Promise<string>((resolve, reject) => {
          pdfParser.on("pdfParser_dataError", (errData: any) => {
            reject(new Error(errData.parserError || 'PDF parse hatası'));
          });
          
          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
              // Extract text from all pages
              const textParts: string[] = [];
              if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
                pdfData.Pages.forEach((page: any) => {
                  if (page.Texts && Array.isArray(page.Texts)) {
                    page.Texts.forEach((textObj: any) => {
                      if (textObj.R && Array.isArray(textObj.R)) {
                        textObj.R.forEach((r: any) => {
                          if (r.T) {
                            // Decode URI-encoded text
                            textParts.push(decodeURIComponent(r.T));
                          }
                        });
                      }
                    });
                  }
                });
              }
              resolve(textParts.join(' '));
            } catch (extractError: any) {
              reject(new Error(`Text extraction hatası: ${extractError.message}`));
            }
          });
          
          pdfParser.parseBuffer(buffer);
        });
        
        finalPdfText = extractedText;
      } catch (parseError: any) {
        console.error("PDF parse hatası:", parseError);
        return NextResponse.json({ reply: `PDF parse hatası: ${parseError.message}. Lütfen PDF metnini direkt olarak gönderin.` }, { status: 400 });
      }
    }
    
    if (!finalPdfText) {
      return NextResponse.json({ reply: "PDF metni bulunamadı!" }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ reply: "API Key eksik!" }, { status: 500 });
    }
    
    // ADMIN BYPASS: Belirli email için tüm kontrolleri atla
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const isAdmin = userEmail && adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase();
    
    const userKey = getUserKey(req);
    
    // Helper function to save analysis and send notifications
    const saveAnalysisAndNotify = async (analysisResult: string, fileName: string = 'document.pdf', userIdParam?: string) => {
      // Use userIdParam if provided, otherwise fall back to userId from request
      const finalUserId = userIdParam || userId;
      
      try {
        // Parse analysis result to check for critical risks
        let parsedResult: any = null;
        try {
          parsedResult = typeof analysisResult === 'string' ? JSON.parse(analysisResult) : analysisResult;
        } catch (e) {
          // If not JSON, try to extract JSON from string
          const jsonStart = analysisResult.indexOf('{');
          const jsonEnd = analysisResult.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            parsedResult = JSON.parse(analysisResult.substring(jsonStart, jsonEnd));
          }
        }

        // Check for critical risks
        const hasCriticalRisk = parsedResult?.risk_cards?.some((card: any) => 
          (card.severity?.toLowerCase().indexOf('yüksek') !== -1 || 
           card.severity?.toLowerCase().indexOf('high') !== -1 ||
           card.severity?.toLowerCase().indexOf('kritik') !== -1 ||
           card.severity?.toLowerCase().indexOf('critical') !== -1) &&
          (card.impact?.toLowerCase().indexOf('kritik') !== -1 ||
           card.impact?.toLowerCase().indexOf('critical') !== -1)
        );

        // Save to database if finalUserId exists (UUID from auth.users)
        if (finalUserId) {
          try {
            // Parse analysis result to extract summary
            let analysisSummary = '';
            try {
              const parsed = typeof analysisResult === 'string' ? JSON.parse(analysisResult) : analysisResult;
              analysisSummary = parsed?.summary || parsed?.document_type || analysisResult.substring(0, 200) + '...';
            } catch (e) {
              analysisSummary = typeof analysisResult === 'string' ? analysisResult.substring(0, 200) + '...' : 'Analysis completed';
            }
            
            // Extract risk score if available
            let riskScore: number | null = null;
            try {
              const parsed = typeof analysisResult === 'string' ? JSON.parse(analysisResult) : analysisResult;
              if (parsed?.risk_cards && Array.isArray(parsed.risk_cards)) {
                const highRiskCount = parsed.risk_cards.filter((card: any) => 
                  card.severity?.toLowerCase().includes('yüksek') || 
                  card.severity?.toLowerCase().includes('high')
                ).length;
                riskScore = parsed.risk_cards.length > 0 ? (highRiskCount / parsed.risk_cards.length) * 100 : null;
              }
            } catch (e) {
              // Risk score extraction failed, continue without it
            }
            
            const { error: dbError, data: insertedData } = await supabase.from('analyses').insert({
              user_id: finalUserId, // UUID from auth.users
              file_name: fileName || 'document.pdf',
              analysis_result: typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult),
              analysis_summary: analysisSummary,
              risk_score: riskScore,
              created_at: new Date().toISOString()
            }).select();
            
            if (dbError) {
              console.error('[saveAnalysisAndNotify] Database save error:', dbError);
            } else {
              console.log('[saveAnalysisAndNotify] Analysis saved successfully:', {
                userId: finalUserId,
                fileName: fileName || 'document.pdf',
                analysisId: insertedData?.[0]?.id,
                resultLength: typeof analysisResult === 'string' ? analysisResult.length : JSON.stringify(analysisResult).length
              });
            }
          } catch (dbError) {
            console.error('[saveAnalysisAndNotify] Database save error (catch):', dbError);
            // Continue even if DB save fails
          }
        } else {
          console.warn('[saveAnalysisAndNotify] userId not provided, skipping database save', { userId, userIdParam, finalUserId });
        }

        // Calculate risk score and summary
        const riskCount = parsedResult?.risk_cards?.length || 0;
        const highRiskCount = parsedResult?.risk_cards?.filter((card: any) => 
          card.severity?.toLowerCase().indexOf('yüksek') !== -1 || 
          card.severity?.toLowerCase().indexOf('high') !== -1 ||
          card.severity?.toLowerCase().indexOf('kritik') !== -1 ||
          card.severity?.toLowerCase().indexOf('critical') !== -1
        ).length || 0;
        
        const complianceScore = parsedResult?.compliance_status?.overall || 'Bilinmiyor';
        const documentType = parsedResult?.document_type || 'Belirtilmemiş';
        const summaryPreview = parsedResult?.summary ? 
          (parsedResult.summary.length > 150 ? parsedResult.summary.substring(0, 150) + '...' : parsedResult.summary) : 
          'Özet mevcut değil';

        // Send Telegram notification for critical analyses
        if (hasCriticalRisk) {
          await sendTelegramNotification(
            `🚨 <b>KRİTİK ANALİZ TAMAMLANDI</b>\n\n` +
            `📧 Kullanıcı: ${userEmail || 'Anonim'}\n` +
            `📄 Dosya: ${fileName}\n` +
            `📋 Belge Türü: ${documentType}\n` +
            `⚠️ <b>Risk Skoru:</b> ${highRiskCount}/${riskCount} Yüksek Risk\n` +
            `📊 <b>Uyumluluk:</b> ${complianceScore}\n` +
            `🔍 <b>Özet:</b> ${summaryPreview}\n\n` +
            `⚠️ Yüksek riskli hukuki sorunlar tespit edildi!\n` +
            `🔍 Detaylı rapor hazırlandı.`,
            true
          );
        } else {
          // Regular analysis notification
          await sendTelegramNotification(
            `📊 <b>YENİ ANALİZ TAMAMLANDI</b>\n\n` +
            `📧 Kullanıcı: ${userEmail || 'Anonim'}\n` +
            `📄 Dosya: ${fileName}\n` +
            `📋 Belge Türü: ${documentType}\n` +
            `📊 <b>Risk Skoru:</b> ${riskCount} Risk Tespit Edildi (${highRiskCount} Yüksek)\n` +
            `✅ <b>Uyumluluk:</b> ${complianceScore}\n` +
            `🔍 <b>Özet:</b> ${summaryPreview}\n\n` +
            `✅ Analiz başarıyla tamamlandı.`,
            false
          );
        }
      } catch (error) {
        console.error('Save/Notify error:', error);
        // Don't fail the request if save/notify fails
      }
    };
    
    // Admin ise direkt analiz yap, kontrolleri atla
    if (isAdmin) {
      console.log('[API] Admin kullanıcı - kontroller atlanıyor');
      const result = performLegalAnalysis(
        finalPdfText, 
        targetLang || 'tr',
        async (text) => {
          await saveAnalysisAndNotify(text, fileName || 'admin-document.pdf', userId);
        }
      );
      // performLegalAnalysis artık direkt Response döndürüyor
      return result;
    }
    
    // TEST MODU: Geçici olarak kredi kontrolünü esnet - detaylı loglama ile
    console.log('[API] Kredi kontrolü başlatılıyor...', { userKey, userEmail });
    
    try {
      // 1. KREDİ KONTROLÜ
      const { data: creditRow, error: creditError } = await supabase
        .from("user_credits")
        .select("credit")
        .eq("user_key", userKey)
        .maybeSingle();
      
      console.log('[API] Kredi kontrolü sonucu:', { 
        creditRow, 
        creditError: creditError?.message,
        hasCredit: creditRow && creditRow.credit > 0 
      });
      
      // 2. İlk ücretsiz hakkı kontrolü
      const { data: usedDisks, error: rightsError } = await supabase
        .from("user_analysis_rights")
        .select("id")
        .eq("user_key", userKey)
        .maybeSingle();
      
      console.log('[API] Ücretsiz hak kontrolü sonucu:', { 
        usedDisks, 
        rightsError: rightsError?.message,
        hasUsedFree: !!usedDisks 
      });
      
      // Tablo yoksa veya hata varsa, analizi yine de yap (TEST MODU)
      if (creditError || rightsError) {
        console.warn('[API] Kredi/rights tablolarına erişim hatası - TEST MODU: Analiz yapılıyor', {
          creditError: creditError?.message,
          rightsError: rightsError?.message
        });
        // Hata olsa bile analizi yap - streaming
        const result = performLegalAnalysis(
          finalPdfText, 
          targetLang || 'tr',
          async (text) => {
            await saveAnalysisAndNotify(text, fileName || 'document.pdf', userId);
          }
        );
        // performLegalAnalysis artık direkt Response döndürüyor
        return result;
      }
      
      if (creditRow && creditRow.credit > 0) {
        // Kredisi olanlar için analiz - streaming
        console.log('[API] Kullanıcının kredisi var, analiz yapılıyor');
        const result = performLegalAnalysis(
          finalPdfText, 
          targetLang || 'tr',
          async (text) => {
            // Kredi bir azaltılır
            await supabase.from("user_credits")
              .update({ credit: creditRow.credit - 1 })
              .eq("user_key", userKey);
            await saveAnalysisAndNotify(text, fileName || 'document.pdf', userId);
          }
        );
        // performLegalAnalysis artık direkt Response döndürüyor
        return result;
      } else if (!usedDisks) {
        // İlk analiz ücretsiz - streaming
        console.log('[API] İlk ücretsiz analiz, analiz yapılıyor');
        const result = performLegalAnalysis(
          finalPdfText, 
          targetLang || 'tr',
          async (text) => {
            await supabase.from("user_analysis_rights").insert({ user_key: userKey });
            await saveAnalysisAndNotify(text, fileName || 'document.pdf', userId);
          }
        );
        // performLegalAnalysis artık direkt Response döndürüyor
        return result;
      } else {
        // TEST MODU: Hakkı yoksa bile analizi yap (geçici olarak) - streaming
        console.warn('[API] Kullanıcının hakkı yok ama TEST MODU aktif - analiz yapılıyor', {
          userKey,
          userEmail,
          creditRow,
          usedDisks
        });
        console.log('[API] performLegalAnalysis çağrılmadan önce - finalPdfText uzunluğu:', finalPdfText?.length || 0);
        console.log('[API] performLegalAnalysis çağrılmadan önce - finalPdfText ilk 200 karakter:', finalPdfText?.substring(0, 200) || 'BOŞ');
        console.log('[API] performLegalAnalysis çağrılmadan önce - targetLang:', targetLang || 'tr');
        const result = performLegalAnalysis(
          finalPdfText, 
          targetLang || 'tr',
          async (text) => {
            await saveAnalysisAndNotify(text, fileName || 'document.pdf', userId);
          }
        );
        console.log('[API] performLegalAnalysis çağrıldı, result alındı');
        // performLegalAnalysis artık direkt Response döndürüyor
        return result;
      }
    } catch (checkError: any) {
      // Kontrol sırasında hata olursa, analizi yine de yap (TEST MODU) - streaming
      console.error('[API] Kredi kontrolü sırasında hata - TEST MODU: Analiz yapılıyor', checkError);
      const result = performLegalAnalysis(
        finalPdfText, 
        targetLang || 'tr',
        async (text) => {
          await saveAnalysisAndNotify(text, fileName || 'document.pdf', userId);
        }
      );
      // performLegalAnalysis artık direkt Response döndürüyor
      return result;
    }
  } catch (error: any) {
    console.error("OpenAI/Supabase Hatası:", error);
    return NextResponse.json({ reply: `Sistem hatası: ${error.message}` }, { status: 500 });
  }
}
