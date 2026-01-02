"use client";
import { useEffect, useState } from "react";

const KVKK_TR = (
  <div style={{maxWidth:750,margin:'60px auto',background:'#171c2d',borderRadius:22,padding:36,color:'#ffe18d',boxShadow:'0 10px 30px #0007'}}>
    <h1 style={{fontWeight:800,fontSize:'2.1rem',marginBottom:18}}>KVKK Aydınlatma Metni</h1>
    <div style={{color:'#eaeaea',fontWeight:600,marginBottom:28, fontSize:'1.07rem'}}>
      <p><b>VERITAS Q-AI KİŞİSEL VERİLERİN İŞLENMESİNE İLİŞKİN AYDINLATMA METNİ</b></p>
      <ol style={{ marginLeft: 18 }}>
        <li><b>Veri Sorumlusu:</b> 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, Veritas Q-AI (Bundan sonra “Platform” olarak anılacaktır), kişisel verilerinizi hukuka ve dürüstlük kurallarına uygun, belirli, açık ve meşru amaçlar doğrultusunda işlemektedir.</li>
        <li><b>İşlenen Kişisel Verileriniz ve İşleme Amaçları:</b> Kimlik bilgileriniz (ad-soyad), iletişim bilgileriniz (e-posta), finansal bilgileriniz (fatura adresi) ve kullanım verileriniz (IP adresi, log kayıtları);
          <ul>
            <li>Hizmet sözleşmesinin kurulması ve ifası,</li>
            <li>Yapay zeka tabanlı analiz süreçlerinin yürütülmesi,</li>
            <li>Finans ve muhasebe işlerinin takibi (Ödeme doğrulama),</li>
            <li>Mevzuattan kaynaklanan saklama ve bilgilendirme yükümlülüklerinin yerine getirilmesi</li>
          </ul>
          amaçlarıyla sınırlı olarak işlenmektedir.
        </li>
        <li><b>Analiz İçeriklerinin Durumu (Özel Not):</b> Kullanıcı tarafından analiz edilmek üzere sisteme yüklenen metinler, 6698 sayılı Kanun kapsamında "Veri İşleyen" sıfatıyla, sadece talep edilen hizmetin sunulması amacıyla işlenir. Bu veriler yapay zeka modelinin eğitimi için anonimleştirilmeden kullanılmaz ve hiçbir surette üçüncü taraf veri havuzlarına aktarılmaz.
        </li>
        <li><b>İşlenen Kişisel Verilerin Aktarımı:</b> Kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesi ile sınırlı olarak; yasal yükümlülüklerin yerine getirilmesi amacıyla yetkili kamu kurum ve kuruluşlarına (BTK, adli makamlar vb.) ve ödeme sistemlerinin tesisi amacıyla iş ortaklarımıza (Shopier/Lemon Squeezy) KVKK m.8 ve m.9 hükümleri çerçevesinde aktarılabilmektedir.
        </li>
        <li><b>Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi:</b> Verileriniz, elektronik ortamda web sitemiz üzerinden; "bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması" ve "veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması" hukuki sebeplerine dayanarak toplanmaktadır.
        </li>
      </ol>
    </div>
  </div>
);

const KVKK_EN = (
  <div style={{maxWidth:750,margin:'60px auto',background:'#171c2d',borderRadius:22,padding:36,color:'#ffe18d',boxShadow:'0 10px 30px #0007'}}>
    <h1 style={{fontWeight:800,fontSize:'2.1rem',marginBottom:18}}>GDPR / Data Privacy Notice</h1>
    <div style={{color:'#eaeaea',fontWeight:600,marginBottom:28, fontSize:'1.07rem'}}>
      <b>VERITAS Q-AI DATA PROCESSING NOTICE</b>
      <ol style={{ marginLeft: 18 }}>
        <li><b>Controller:</b> Pursuant to Law No.6698 on Protection of Personal Data ("KVKK"), Veritas Q-AI (hereinafter referred to as the "Platform") processes your personal data in accordance with legal and ethical rules for specific, clear and legitimate purposes.</li>
        <li><b>Processed Data and Purposes:</b> Your identity information (name-surname), contact details (email), financial information (billing address), and usage data (IP address, logs) are processed for the following purposes:
          <ul>
            <li>Conclusion and execution of the service agreement,</li>
            <li>Conducting AI-based analysis processes,</li>
            <li>Finance and accounting operations (Payment confirmation),</li>
            <li>Fulfilling statutory storage and disclosure obligations</li>
          </ul>
          (Limited to these purposes).
        </li>
        <li><b>Case Submission (Special Note):</b> Case texts uploaded to the system by the user for analysis are, as a Data Processor under Law no. 6698, processed only for the provision of the requested service. These texts are not used for training the AI model in a non-anonymized form and will never be transferred to any third-party data pool.
        </li>
        <li><b>Transfer of Personal Data:</b> Your personal data may be transferred, limited to the above-mentioned purposes, to legally authorized public agencies (BTK, judicial authorities, etc.) and our payment partners (Shopier/Lemon Squeezy) within the scope of Articles 8 and 9 of the KVKK for fulfillment of statutory obligations.
        </li>
        <li><b>Collection Method and Legal Basis:</b> Your data is collected electronically through our website, based on the legal grounds of "necessity for the performance of a contract" and "compliance with the controller's legal obligations".
        </li>
      </ol>
    </div>
  </div>
);

export default function KVKK() {
  const [lang, setLang] = useState('EN');
  useEffect(() => {
    const ln = typeof window !== 'undefined' ? (window.localStorage.getItem('lang') || window.navigator.language.slice(0,2).toUpperCase()) : 'EN';
    setLang(ln === 'TR' ? 'TR' : 'EN');
  }, []);
  return lang === 'TR' ? KVKK_TR : KVKK_EN;
}
