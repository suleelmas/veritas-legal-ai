"use client";
import React, { useState, useEffect, useRef } from 'react';
import PricingCard from "./components/PricingCard";
import { createBrowserClient } from '@supabase/ssr';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';

type Tab = "analyze" | "pricing" | "about";

export default function Home() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [language, setLanguage] = useState("EN");
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const gold = "#c7b079"; 
  const darkBlue = "#182332"; 
  const midBlue = "#232d3c"; 
  const lightText = "#f1efca"; // Kirli beyaz / beyaza yakın gold - normal yazılar için 

  const ui: any = {
    TR: { 
      title: "VERITAS LEGAL AI", 
      sub: "YÜKSEK HUKUK ANALİTİĞİ", 
      aboutBtn: "Veritas AI Nedir?", 
      aboutTitle: "Veritas Legal AI Hakkında",
      aboutText: "Veritas, avukatlar ve hukuk profesyonelleri için geliştirilmiş, ileri seviye yapay zeka tabanlı bir hukuk analitiği platformudur. Karmaşık PDF belgelerini saniyeler içinde analiz eder, mevzuat dayanaklarını bulur ve risk raporları oluşturur.",
      googleBtn: "Google ile Giriş Yap", 
      select: "Dosya Seç", 
      btn: "ANALİZİ BAŞLAT", 
      upload: "PDF Belgesini Seçin", 
      download: "RAPORU İNDİR (.PDF)",
      loading: "⏳ Analiz Ediliyor...",
      resultTitle: "Analiz Sonucu",
      features: "Özellikler",
      pricing: "Fiyatlandırma"
    },
    EN: { 
      title: "VERITAS LEGAL AI", 
      sub: "SUPREME LEGAL ANALYTICS", 
      aboutBtn: "What is Veritas AI?", 
      aboutTitle: "About Veritas Legal AI",
      aboutText: "Veritas is an advanced AI-driven legal analytics platform developed for lawyers and legal professionals. It analyzes complex documents in seconds, identifies legal bases, and generates risk assessments.",
      googleBtn: "Sign in with Google", 
      select: "Select File", 
      btn: "START ANALYSIS", 
      upload: "Select PDF Document", 
      download: "DOWNLOAD PDF",
      loading: "⏳ Analyzing...",
      resultTitle: "Analysis Result",
      features: "Features",
      pricing: "Pricing"
    },
    FR: { 
      title: "VERITAS LEGAL AI", 
      sub: "ANALYTIQUE JURIDIQUE SUPÉRIEURE", 
      aboutBtn: "Qu'est-ce que Veritas AI?", 
      aboutTitle: "À propos de Veritas Legal AI",
      aboutText: "Veritas est une plateforme d'analyse juridique avancée basée sur l'intelligence artificielle, développée pour les avocats et les professionnels du droit. Elle analyse des documents PDF complexes en quelques secondes, identifie les bases légales et génère des rapports d'évaluation des risques.",
      googleBtn: "Se connecter avec Google", 
      select: "Sélectionner un fichier", 
      btn: "DÉMARRER L'ANALYSE", 
      upload: "Sélectionner un document PDF", 
      download: "TÉLÉCHARGER LE RAPPORT (.PDF)",
      loading: "⏳ Analyse en cours...",
      resultTitle: "Résultat de l'analyse",
      features: "Caractéristiques",
      pricing: "Tarification"
    },
    DE: { 
      title: "VERITAS LEGAL AI", 
      sub: "HÖCHSTE RECHTSANALYTIK", 
      aboutBtn: "Was ist Veritas AI?", 
      aboutTitle: "Über Veritas Legal AI",
      aboutText: "Veritas ist eine fortschrittliche KI-gestützte Rechtsanalytik-Plattform, die für Anwälte und Rechtsexperten entwickelt wurde. Sie analysiert komplexe PDF-Dokumente in Sekunden, identifiziert Rechtsgrundlagen und erstellt Risikobewertungen.",
      googleBtn: "Mit Google anmelden", 
      select: "Datei auswählen", 
      btn: "ANALYSE STARTEN", 
      upload: "PDF-Dokument auswählen", 
      download: "BERICHT HERUNTERLADEN (.PDF)",
      loading: "⏳ Analyse läuft...",
      resultTitle: "Analyseergebnis",
      features: "Funktionen",
      pricing: "Preise"
    },
    RU: { 
      title: "VERITAS LEGAL AI", 
      sub: "ВЫСШАЯ ЮРИДИЧЕСКАЯ АНАЛИТИКА", 
      aboutBtn: "Что такое Veritas AI?", 
      aboutTitle: "О Veritas Legal AI",
      aboutText: "Veritas - это передовая платформа юридической аналитики на основе искусственного интеллекта, разработанная для юристов и правовых специалистов. Она анализирует сложные PDF-документы за секунды, находит правовые основания и создает отчеты об оценке рисков.",
      googleBtn: "Войти через Google", 
      select: "Выбрать файл", 
      btn: "НАЧАТЬ АНАЛИЗ", 
      upload: "Выберите PDF-документ", 
      download: "СКАЧАТЬ ОТЧЕТ (.PDF)",
      loading: "⏳ Анализ выполняется...",
      resultTitle: "Результат анализа",
      features: "Функции",
      pricing: "Цены"
    },
    ZH: { 
      title: "VERITAS LEGAL AI", 
      sub: "最高法律分析", 
      aboutBtn: "什么是 Veritas AI?", 
      aboutTitle: "关于 Veritas Legal AI",
      aboutText: "Veritas 是一个为律师和法律专业人士开发的先进人工智能驱动的法律分析平台。它在几秒钟内分析复杂的PDF文档，识别法律依据，并生成风险评估。",
      googleBtn: "使用 Google 登录", 
      select: "选择文件", 
      btn: "开始分析", 
      upload: "选择 PDF 文档", 
      download: "下载报告 (.PDF)",
      loading: "⏳ 分析中...",
      resultTitle: "分析结果",
      features: "功能",
      pricing: "定价"
    },
    AR: { 
      title: "VERITAS LEGAL AI", 
      sub: "التحليلات القانونية العليا", 
      aboutBtn: "ما هو Veritas AI?", 
      aboutTitle: "حول Veritas Legal AI",
      aboutText: "Veritas هي منصة تحليلات قانونية متقدمة مدعومة بالذكاء الاصطناعي، تم تطويرها للمحامين والمهنيين القانونيين. تحلل مستندات PDF المعقدة في ثوانٍ، وتحدد الأسس القانونية، وتولد تقارير تقييم المخاطر.",
      googleBtn: "تسجيل الدخول باستخدام Google", 
      select: "اختر الملف", 
      btn: "بدء التحليل", 
      upload: "اختر مستند PDF", 
      download: "تحميل التقرير (.PDF)",
      loading: "⏳ جاري التحليل...",
      resultTitle: "نتيجة التحليل",
      features: "الميزات",
      pricing: "التسعير"
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    initAuth();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (languageMenuOpen && !target.closest('[data-language-menu]')) {
        setLanguageMenuOpen(false);
      }
    };
    if (languageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [languageMenuOpen]);

  const handleAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setResult("");
    try {
      // PDF'den metin çıkarma
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      // Dil kodunu belirle
      const langMap: any = {
        'TR': 'Türkçe',
        'EN': 'English',
        'FR': 'Français',
        'DE': 'Deutsch',
        'RU': 'Русский',
        'ZH': '中文',
        'AR': 'العربية'
      };
      const targetLang = langMap[language] || 'English';

      // API'ye gönder
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfText: fullText,
          targetLang: targetLang
        })
      });

      const data = await res.json();
      setResult(data.reply || data.error || 'Analysis complete');
    } catch (err: any) {
      setResult(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgWidth = 190;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save('veritas-report.pdf');
    } catch (err) {
      console.error('PDF download error:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: darkBlue, color: lightText, fontFamily: 'sans-serif' }}>
      
      {/* ÜST BAR - Logo İkonu ve Sağ Üst Dil Menüsü */}
      <nav style={{ width: '100%', background: '#131b26', padding: '15px 20px', position: 'fixed', top: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${gold}33` }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => {setActiveTab('analyze'); setSidebarOpen(false);}} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* House outline - triangular roof and two side walls, no bottom line */}
              <path d="M25 35 L50 15 L75 35" stroke={gold} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="25" y1="35" x2="25" y2="75" stroke={gold} strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="75" y1="35" x2="75" y2="75" stroke={gold} strokeWidth="3.5" strokeLinecap="round"/>
              {/* Sword - vertical, hilt at roof apex, blade pointing down to base */}
              <line x1="50" y1="15" x2="50" y2="75" stroke={gold} strokeWidth="3" strokeLinecap="round"/>
              <path d="M46 20 L50 15 L54 20" stroke={gold} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Scales of justice - at bottom, directly beneath sword tip, balanced */}
              <line x1="50" y1="75" x2="50" y2="80" stroke={gold} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="50" y1="80" x2="40" y2="88" stroke={gold} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="50" y1="80" x2="60" y2="88" stroke={gold} strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="40" cy="88" r="3.5" fill={gold}/>
              <circle cx="60" cy="88" r="3.5" fill={gold}/>
            </svg>
          </button>
          {/* HAMBURGER MENÜ BUTONU - Logo İkonunun Altında */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            style={{ 
              background: 'transparent', 
              border: `2px solid ${gold}`, 
              width: 32, 
              height: 32, 
              borderRadius: '6px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: `0 0 10px ${gold}44`
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ width: '16px', height: '2.5px', backgroundColor: gold, borderRadius: '1px', boxShadow: `0 0 2px ${gold}` }}></div>
              <div style={{ width: '16px', height: '2.5px', backgroundColor: gold, borderRadius: '1px', boxShadow: `0 0 2px ${gold}` }}></div>
              <div style={{ width: '16px', height: '2.5px', backgroundColor: gold, borderRadius: '1px', boxShadow: `0 0 2px ${gold}` }}></div>
            </div>
          </button>
        </div>
        
        {/* SAĞ ÜST DİL MENÜSÜ */}
        <div style={{ position: 'relative', marginRight: '40px' }} data-language-menu>
          <button 
            onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
            style={{ 
              background: 'transparent', 
              border: `1px solid ${gold}`, 
              color: gold, 
              padding: '8px 15px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke={gold} strokeWidth="2" fill="none"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={gold} strokeWidth="1.5" fill="none"/>
            </svg>
            <span style={{ color: gold }}>{language}</span>
            <span style={{ fontSize: '10px', color: gold }}>{languageMenuOpen ? '▲' : '▼'}</span>
          </button>
          
          {languageMenuOpen && (
            <div style={{ 
              position: 'absolute', 
              top: '100%', 
              right: '-40px', 
              marginTop: '8px', 
              background: '#131b26', 
              border: `1px solid ${gold}`, 
              borderRadius: '8px', 
              minWidth: '120px',
              boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
              zIndex: 1100,
              overflow: 'hidden'
            }}>
              {["EN", "TR", "FR", "DE", "RU", "ZH", "AR"].map(l => (
                <button 
                  key={l} 
                  onClick={() => {
                    setLanguage(l);
                    setLanguageMenuOpen(false);
                  }} 
                  style={{ 
                    width: '100%',
                    background: language === l ? gold : 'transparent', 
                    color: language === l ? '#000000' : lightText, 
                    border: 'none',
                    padding: '10px 15px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (language !== l) {
                      e.currentTarget.style.background = `${gold}33`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (language !== l) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div style={{ display: 'flex', paddingTop: '70px' }}>
        {/* SIDEBAR */}
        {sidebarOpen && (
          <aside style={{ width: '260px', background: '#131b26', height: '100vh', position: 'fixed', left: 0, padding: '20px', borderRight: `1px solid ${gold}44`, zIndex: 1050, display: 'flex', flexDirection: 'column' }}>
             <h2 style={{ color: gold, textAlign: 'center', marginBottom: '30px' }}>VERITAS AI</h2>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => {setActiveTab('analyze'); setSidebarOpen(false);}} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: activeTab === 'analyze' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
                  color: activeTab === 'analyze' ? gold : lightText, 
                  border: `1px solid ${gold}`, 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8" stroke={activeTab === 'analyze' ? gold : lightText} strokeWidth="2" fill="none"/>
                  <path d="m21 21-4.35-4.35" stroke={activeTab === 'analyze' ? gold : lightText} strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Analiz</span>
              </button>
              <button 
                onClick={() => {setActiveTab('pricing'); setSidebarOpen(false);}} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: activeTab === 'pricing' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
                  color: activeTab === 'pricing' ? gold : lightText, 
                  border: `1px solid ${gold}`, 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="4" width="22" height="16" rx="2" stroke={activeTab === 'pricing' ? gold : lightText} strokeWidth="2" fill="none"/>
                  <path d="M1 10h22" stroke={activeTab === 'pricing' ? gold : lightText} strokeWidth="2"/>
                </svg>
                <span>Paketler</span>
              </button>
              <button 
                onClick={() => {setActiveTab('about'); setSidebarOpen(false);}} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: activeTab === 'about' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
                  color: activeTab === 'about' ? gold : lightText, 
                  border: `1px solid ${gold}`, 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  textAlign: 'left', 
                  marginTop: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke={activeTab === 'about' ? gold : lightText} strokeWidth="2" fill="none"/>
                  <path d="M12 16v-4M12 8h.01" stroke={activeTab === 'about' ? gold : lightText} strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>{ui[language].aboutBtn}</span>
              </button>
             </div>
          </aside>
        )}

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', width: '100%' }}>
          {!user ? (
            /* GİRİŞ EKRANI - Logo 450px, Google Butonu Saf Beyaz */
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <img src="/logoverl.png" alt="Logo" style={{ width: '450px', marginBottom: '30px' }} />
              <h1 style={{ color: gold, fontSize: '2.5rem', marginBottom: '10px' }}>{ui[language].title}</h1>
              <p style={{ color: lightText, fontSize: '1.2rem', marginBottom: '40px' }}>{ui[language].sub}</p>
              
              <button 
                onClick={handleAuth} 
                style={{ 
                  backgroundColor: '#ffffff', 
                  color: '#000000', 
                  padding: '15px 50px', 
                  minWidth: '300px',
                  borderRadius: '50px', 
                  border: 'none', 
                  fontWeight: 'bold', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '12px', 
                  margin: '0 auto', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                  transition: 'background-color 0.3s ease',
                  fontSize: '16px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google Logo" 
                  width="24" 
                  height="24"
                  style={{ display: 'block' }}
                /> 
                <span style={{ color: '#000000', fontWeight: 'bold' }}>{ui[language].googleBtn}</span>
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '850px', textAlign: 'center' }}>
              
              {activeTab === 'analyze' && (
                <>
                  <img src="/logoverl.png" alt="Logo" style={{ width: '250px', marginBottom: '30px' }} />
                  <div style={{ background: midBlue, padding: '50px', borderRadius: '25px', border: `2px dashed ${gold}44` }}>
                    <p style={{ color: lightText, fontSize: '1.2rem', marginBottom: '20px' }}>{ui[language].upload}</p>
                    <input 
                      type="file" 
                      id="pdfInputFinal" 
                      accept=".pdf" 
                      style={{ display: 'none' }} 
                      onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    />
                    <button 
                      onClick={() => document.getElementById('pdfInputFinal')?.click()} 
                      style={{ background: '#ffffff', color: darkBlue, padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                      <span style={{ color: darkBlue }}>{ui[language].select}</span>
                    </button>
                    {file && <p style={{ marginTop: '20px', color: '#4ade80', fontWeight: 'bold' }}>● {file.name}</p>}
                    <button 
                      onClick={handleAnalyze}
                      disabled={!file || loading}
                      style={{ 
                        width: '100%', 
                        padding: '18px', 
                        background: file ? gold : '#444', 
                        color: file ? '#000000' : lightText, 
                        borderRadius: '12px', 
                        border: 'none', 
                        marginTop: '30px', 
                        fontWeight: '900',
                        cursor: file && !loading ? 'pointer' : 'not-allowed',
                        opacity: file && !loading ? 1 : 0.6
                      }}
                    >
                      <span style={{ color: file ? '#000000' : lightText }}>{loading ? ui[language].loading : ui[language].btn}</span>
                    </button>
                    {result && (
                      <div 
                        ref={reportRef} 
                        style={{ 
                          marginTop: '30px', 
                          background: '#1a1f2e', 
                          padding: '30px', 
                          borderRadius: '15px', 
                          border: `1px solid ${gold}44` 
                        }}
                      >
                        <h3 style={{ color: gold, marginBottom: '15px' }}>{ui[language].resultTitle}</h3>
                        <div style={{ color: lightText, whiteSpace: 'pre-wrap', textAlign: 'left' }}>{result}</div>
                        <button 
                          onClick={handleDownloadPDF}
                          style={{ 
                            marginTop: '20px', 
                            background: gold, 
                            color: '#000000', 
                            padding: '12px 25px', 
                            borderRadius: '10px', 
                            border: 'none', 
                            fontWeight: 'bold', 
                            cursor: 'pointer' 
                          }}
                        >
                          <span style={{ color: '#000000' }}>{ui[language].download}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'pricing' && (
                <div style={{ marginTop: '40px' }}>
                  <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '40px', textAlign: 'center' }}>{ui[language].pricing}</h2>
                  <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <PricingCard 
                      gold={gold}
                      plan="Basic"
                      price="₺299/ay"
                      features={["10 Analiz/Ay", "Temel Risk Raporu", "Email Desteği"]}
                    />
                    <PricingCard 
                      gold={gold}
                      plan="Professional"
                      price="₺799/ay"
                      features={["50 Analiz/Ay", "Detaylı Risk Raporu", "Öncelikli Destek", "API Erişimi"]}
                      popular
                    />
                    <PricingCard 
                      gold={gold}
                      plan="Elite"
                      price="₺1,999/ay"
                      features={["Sınırsız Analiz", "Premium Raporlar", "7/24 Destek", "Özel Entegrasyon", "Özel Eğitim"]}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'about' && (
                <div style={{ marginTop: '40px', maxWidth: '700px', textAlign: 'left' }}>
                  <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '30px', textAlign: 'center' }}>{ui[language].aboutTitle}</h2>
                  <p style={{ color: lightText, fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '20px' }}>{ui[language].aboutText}</p>
                  <div style={{ background: midBlue, padding: '25px', borderRadius: '15px', marginTop: '30px' }}>
                    <h3 style={{ color: gold, marginBottom: '15px' }}>{ui[language].features}</h3>
                    <ul style={{ color: lightText, lineHeight: '2' }}>
                      <li>✓ Hızlı PDF analizi</li>
                      <li>✓ Mevzuat uyumluluk kontrolü</li>
                      <li>✓ Risk değerlendirme raporları</li>
                      <li>✓ Çoklu dil desteği</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      
      {/* FOOTER */}
      <footer style={{ 
        background: '#131b26', 
        padding: '30px 20px', 
        marginTop: '60px',
        borderTop: `1px solid ${gold}33`,
        textAlign: 'center'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '30px', 
          flexWrap: 'wrap',
          marginBottom: '20px'
        }}>
          <a 
            href="/kvkk" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: gold, 
              textDecoration: 'none', 
              fontSize: '14px',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            KVKK Aydınlatma Metni
          </a>
          <a 
            href="/distance-agreement" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: gold, 
              textDecoration: 'none', 
              fontSize: '14px',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Mesafeli Satış Sözleşmesi
          </a>
          <a 
            href="/privacy" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: gold, 
              textDecoration: 'none', 
              fontSize: '14px',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Gizlilik Politikası
          </a>
        </div>
        <p style={{ color: lightText, fontSize: '12px', margin: 0, opacity: 0.8 }}>
          © {new Date().getFullYear()} Veritas Legal AI. Tüm hakları saklıdır.
        </p>
      </footer>
    </div>
  );
}
