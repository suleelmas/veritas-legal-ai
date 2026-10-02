"use client";
import { useEffect, useState } from "react";

const PRIVACY_TR = (
  <div style={{maxWidth:750,margin:'60px auto',background:'#171c2d',borderRadius:22,padding:36,color:'#ffe18d',boxShadow:'0 10px 30px #0007'}}>
    <h1 style={{fontWeight:800,fontSize:'2.1rem',marginBottom:18}}>VERITAS Q-AI GİZLİLİK SÖZLEŞMESİ VE POLİTİKASI</h1>
    <div style={{color:'#eaeaea',fontWeight:600,marginBottom:28, fontSize:'1.07rem'}}>
      <b>Son Güncelleme Tarihi: [Günün Tarihi]</b>
      <ol style={{ marginLeft: 18 }}>
        <li><b>Giriş ve Kapsam:</b> Bu Politika, Veritas Q-AI ("Platform") kullanıcılarının kişisel verilerinin işlenmesinin usul ve esaslarını kapsar. Veritas Q-AI, 6698 sayılı KVKK'ya ve uluslararası mevzuata tam uyumu taahhüt eder.</li>
        <li><b>İşlenen Veriler ve Toplama Yöntemleri:</b>
          <ul>
            <li>Kimlik ve İletişim Bilgileri: Ad-soyad, e-posta adresi</li>
            <li>Ödeme ve Finansal Bilgiler: Ödeme aracı kuruluşlar aracılığıyla işlenen işlem kayıtları (Kredi kartı verileri tutulmaz)</li>
            <li>Kullanım ve Teknik Veriler: IP adresi, tarayıcı tipi, oturum kayıtları ve çerez bilgileri</li>
            <li>Analiz İçerikleri: Sisteme yüklenen hukuki metin ve dökümanlar</li>
          </ul>
        </li>
        <li><b>Verilerin İşlenme Amaçları:</b> Kullanıcı hesabı oluşturulması, analiz raporlarının üretilmesi, ödeme/faturalama, sistem güvenliği, yasal yükümlülükler ile sınırlı olarak veriler işlenir.</li>
        <li><b>Analiz İçeriklerinin Gizliliği ve Güvenliği:</b>
          <ul>
            <li>Model eğitimi: Girilen veriler anonimleştirilmeden AI eğitimi için kullanılmaz.</li>
            <li>Veri İşleyen Sıfatı: İçerikler "Veri İşleyen" sıfatıyla yalnızca analiz için işlenir.</li>
            <li>Erişim Kısıtlaması: Hiçbir üçüncü şahıs içeriklere erişemez, tüm işler algoritmik, kapalı devre yürütülür.</li>
          </ul>
        </li>
        <li><b>Verilerin Aktarımı ve Saklanması:</b> Yasal zorunluluklar hariç, veriler izinsiz üçüncü şahıslara satılmaz/kiralanmaz. Sunucu hizmetleri, ödeme altyapısı ve teknik destek kapsamında (KVKK m.8, m.9) aktarılabilir. Veriler hizmet süresince/yasal zamanaşımı boyunca saklanır.</li>
        <li><b>Kullanıcı Hakları:</b> Kullanıcılar, Veritas Q-AI'ya başvurarak verilerinin işlenip işlenmediğini öğrenme, düzeltme, silme ve yok edilmesini talep etme hakkına sahiptir.</li>
        <li><b>Çerezler (Cookies):</b> Kullanıcı deneyimini iyileştirmek ve güvenliği sağlamak için teknik çerezler kullanılır. Çerez reddi bazı işlevlerin çalışmasını engelleyebilir.</li>
        <li><b>Yasal Uyarı ve Sorumluluk Reddi:</b> Raporlar AI çıktısıdır, kesin hukuki/avukatlık tavsiyesi değildir. Raporlara dayanarak yapılan işlemlerden kullanıcı sorumludur.</li>
        <li><b>İletişim:</b> sorularınız için: <a href="mailto:suleelmas13@gmail.com" style={{color:'#ffe18d'}}>suleelmas13@gmail.com</a></li>
      </ol>
    </div>
  </div>
);

const PRIVACY_EN = (
  <div style={{maxWidth:750,margin:'60px auto',background:'#171c2d',borderRadius:22,padding:36,color:'#ffe18d',boxShadow:'0 10px 30px #0007'}}>
    <h1 style={{fontWeight:800,fontSize:'2.1rem',marginBottom:18}}>VERITAS Q-AI PRIVACY POLICY</h1>
    <div style={{color:'#eaeaea',fontWeight:600,marginBottom:28, fontSize:'1.07rem'}}>
      <b>Last Updated: [Current Date]</b>
      <ol style={{ marginLeft: 18 }}>
        <li><b>Scope:</b> This Policy covers the processing of personal data of Veritas Q-AI ("Platform") users and legal compliance (in particular, EU GDPR and Turkish law).</li>
        <li><b>Processed Data and Methods:</b>
          <ul>
            <li>Personal/Communication Data: Name-surname, e-mail address</li>
            <li>Payment Data: Transaction logs processed via 3rd-party services (no credit card details are stored)</li>
            <li>Usage/Technical Data: IP address, browser type, session and cookie data</li>
            <li>Analysis Content: Legal texts and docs uploaded for analysis</li>
          </ul>
        </li>
        <li><b>Purposes of Processing:</b> Creating user account, generating legal analysis reports, billing/payments, system security, and fulfilment of legal obligations.</li>
        <li><b>Confidentiality and Security of Analysis Content:</b>
          <ul>
            <li>Model Training: Uploaded content is not used for AI training without anonymization.</li>
            <li>Processor Role: Contents are processed solely to produce analysis output as a Processor.</li>
            <li>Access Restriction: No human/third party can access uploads; all flows are algorithmic and closed-circuit.</li>
          </ul>
        </li>
        <li><b>Transfer/Storage:</b> Except for legal obligations, no data is sold/shared to third parties. Data may be transferred (GDPR art.6, art.9) for infrastructure, payment, or technical purposes and is stored for service duration/statutory limitation.</li>
        <li><b>User Rights:</b> You can request from Veritas Q-AI: to learn whether your data is processed, request correction/deletion, and object to processing.</li>
        <li><b>Cookies:</b> Technical cookies are used for session security and UX. Cookie rejection may limit some functions.</li>
        <li><b>Legal Disclaimer:</b> Reports generated by the Platform are AI outputs and not legal/professional advice. Users are responsible for any actions taken with regard to reports.</li>
        <li><b>Contact:</b> For questions: <a href="mailto:suleelmas13@gmail.com" style={{color:'#ffe18d'}}>suleelmas13@gmail.com</a></li>
      </ol>
    </div>
  </div>
);

export default function Privacy() {
  const [lang, setLang] = useState('EN');
  useEffect(() => {
    const ln = typeof window !== 'undefined' ? (window.localStorage.getItem('lang') || window.navigator.language.slice(0,2).toUpperCase()) : 'EN';
    setLang(ln === 'TR' ? 'TR' : 'EN');
  }, []);
  return lang === 'TR' ? PRIVACY_TR : PRIVACY_EN;
}
