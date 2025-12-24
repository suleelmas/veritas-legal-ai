"use client";
import { useEffect, useState } from "react";

const MESAFE_TR = (
  <div style={{maxWidth:750,margin:'60px auto',background:'#171c2d',borderRadius:22,padding:36,color:'#ffe18d',boxShadow:'0 10px 30px #0007'}}>
    <h1 style={{fontWeight:800,fontSize:'2.1rem',marginBottom:18}}>MESAFELİ SATIŞ SÖZLEŞMESİ</h1>
    <div style={{color:'#eaeaea',fontWeight:600,marginBottom:28, fontSize:'1.07rem'}}>
      <ol style={{ marginLeft: 18 }}>
        <li><b>TARAFLAR</b><br/>
          1.1. SATICI:<br/>
          Ünvan/Ad-Soyad: Şule Elmas<br/>
          Adres: Türkiye/Antalya<br/>
          E-posta: suleelmas13@gmail.com<br/>
          Web Sitesi: veritasai.com<br/>
          1.2. ALICI (Tüketici):<br/>
          Veritas AI (veritasai.com) platformuna üye olan ve hizmet satın alan kişidir. Alıcının üye olurken kullandığı iletişim bilgileri esas alınır.
        </li>
        <li><b>SÖZLEŞMENİN KONUSU</b><br/>
          Bu Sözleşme’nin konusu, Alıcı’nın Satıcı’ya ait veritasai.com web sitesi üzerinden elektronik ortamda siparişini verdiği, nitelikleri ve satış fiyatı web sitesinde belirtilen Yapay Zeka Tabanlı Hukuki Analiz Hizmeti’nin satışı ve teslimi ile ilgili tarafların hak ve yükümlülüklerinin belirlenmesidir.
        </li>
        <li><b>HİZMETİN NİTELİĞİ VE ÖDEME BİLGİLERİ</b><br/>
          <b>Hizmet Tanımı:</b> Seçilen paket tipine göre (Basic, Pro, Elite) belirli sayıda veya sınırsız analiz hakkı sağlayan dijital üyelik.<br/>
          <b>Satış Bedeli:</b> Kullanıcı tarafından seçilen paketin web sitesinde gösterilen KDV dahil fiyatıdır.<br/>
          <b>Ödeme Şekli:</b> Kredi Kartı / Banka Kartı (Shopier veya Lemon Squeezy aracılığıyla)
        </li>
        <li><b>HİZMETİN İFASI VE TESLİMATI</b><br/>
          Bu hizmet dijital içerik niteliğindedir. Alıcı ödeme yaptıktan sonra, hizmet kullanıcı hesabına anında tanımlanır. Hizmetin tanımlanması ile Satıcı’nın teslimat yükümlülüğü sona ermiş sayılır.
        </li>
        <li><b>CAYMA HAKKI VE İSTİSNALARI</b><br/>
          <b>ÖNEMLİ:</b> Mesafeli Sözleşmeler Yönetmeliği m. 15/ğ’ye göre "Elektronik ortamda anında ifa edilen hizmetlerde" cayma hakkı bulunmaz.<br/>
          Veritas AI’dan alınan paketler, anında ifa/dijital içerik kapsamında olduğundan, üye olduktan/ödeme yaptıktan sonra cayma hakkı ve ücret iadesi yoktur. Ödeme ile bu koşullar kabul edilmiş sayılır.
        </li>
        <li><b>GENEL HÜKÜMLER</b><br/>
          <ul>
            <li>Alıcı, hizmetin niteliklerini, fiyatını ve ödeme/teslimat esaslarını öğrendiğini önceden kabul eder.</li>
            <li>Satıcı, teknik arızalar/aksaklıklarda Alıcı’nın hakkını korumakla yükümlüdür.</li>
            <li>Veritas AI raporları bir avukatlık hizmeti değildir; kullanıcı, raporların kesin hukuki görüş olmadığını onaylar.</li>
          </ul>
        </li>
        <li><b>YETKİLİ MAHKEME</b><br/>
          T.C. Ticaret Bakanlığı’nın açıkladığı parasal sınıra kadar Tüketici Hakem Heyetleri, fazlası için ise tarafların yerleşim yerindeki Tüketici Mahkemeleri yetkilidir.
        </li>
        <li><b>YÜRÜRLÜK</b><br/>
          Alıcı, web sitesinde sipariş verip ödeme yaptığında bu sözleşmenin tüm şartlarını kabul etmiş sayılır.
        </li>
      </ol>
    </div>
  </div>
)

const MESAFE_EN = (
  <div style={{maxWidth:750,margin:'60px auto',background:'#171c2d',borderRadius:22,padding:36,color:'#ffe18d',boxShadow:'0 10px 30px #0007'}}>
    <h1 style={{fontWeight:800,fontSize:'2.1rem',marginBottom:18}}>DISTANCE SALES AGREEMENT</h1>
    <div style={{color:'#eaeaea',fontWeight:600,marginBottom:28, fontSize:'1.07rem'}}>
      <ol style={{ marginLeft: 18 }}>
        <li><b>PARTIES</b><br/>
          1.1. SELLER:<br/>
          Title: Şule Elmas<br/>
          Address: Türkiye/Antalya<br/>
          E-mail: suleelmas13@gmail.com<br/>
          Website: veritasai.com<br/>
          1.2. BUYER (Consumer):<br/>
          Any person registered on veritasai.com platform who purchases the service. Buyer's registration info is regarded.
        </li>
        <li><b>SUBJECT OF THE AGREEMENT</b><br/>
          The subject of this Agreement is to determine the rights and obligations of the parties concerning the sale and delivery of AI-powered Legal Analysis Service offered online via veritasai.com at prices and natures shown.
        </li>
        <li><b>SERVICE DESCRIPTION & PAYMENT</b><br/>
          <b>Service:</b> Digital membership entitling the user to a certain (or unlimited) number of legal analyses according to the package.<br/>
          <b>Sales Price:</b> The price (including VAT) as selected and seen on the site by the user.<br/>
          <b>Payment Method:</b> Credit/Debit Card (via Shopier or Lemon Squeezy)
        </li>
        <li><b>PERFORMANCE & DELIVERY</b><br/>
          The Service is a digital product. As soon as the Buyer completes payment, the service will be immediately defined under the buyer’s account. Seller’s obligation is fulfilled once access is granted.
        </li>
        <li><b>RIGHT OF WITHDRAWAL & EXCLUSIONS</b><br/>
          <b>IMPORTANT:</b> According to Distance Contracts Regulation Art. 15/ğ; no right of withdrawal is available for instantly performed digital services.<br/>
          Any package purchased on Veritas AI is a digital/instantly delivered service, so no right of withdrawal or refund is provided after access is granted. Buyer is deemed to have accepted these terms at payment.
        </li>
        <li><b>GENERAL TERMS</b><br/>
          <ul>
            <li>Buyer acknowledges the package details, price, payment, and delivery principles in advance.</li>
            <li>Seller is obliged to safeguard Buyer’s rights in case of technical failures.</li>
            <li>Veritas AI reports are not a definitive legal/professional advice; Buyer accepts this.</li>
          </ul>
        </li>
        <li><b>JURISDICTION</b><br/>
          Consumer Arbitration Committees for disputes up to the limit set by the Ministry of Trade; for higher values, Consumer Courts at Buyer’s or Seller’s location apply.
        </li>
        <li><b>ENTRY INTO FORCE</b><br/>
          Buyer is deemed to have accepted all terms of this Agreement by completing the order and payment.
        </li>
      </ol>
    </div>
  </div>
)

export default function DistanceAgreement() {
  const [lang, setLang] = useState('EN');
  useEffect(() => {
    const ln = typeof window !== 'undefined' ? (window.localStorage.getItem('lang') || window.navigator.language.slice(0,2).toUpperCase()) : 'EN';
    setLang(ln === 'TR' ? 'TR' : 'EN');
  }, []);
  return lang === 'TR' ? MESAFE_TR : MESAFE_EN;
}

