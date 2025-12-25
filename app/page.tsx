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
  const [language, setLanguage] = useState("TR");
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const gold = "#c7b079"; 
  const darkBlue = "#182332"; 
  const midBlue = "#232d3c"; 

  const ui: any = {
    TR: { 
      title: "VERITAS LEGAL AI", sub: "YÜKSEK HUKUK ANALİTİĞİ", 
      aboutBtn: "Veritas AI Nedir?", aboutTitle: "Veritas Legal AI Hakkında",
      aboutText: "Veritas, avukatlar ve hukuk profesyonelleri için geliştirilmiş, ileri seviye yapay zeka tabanlı bir hukuk analitiği platformudur. Karmaşık PDF belgelerini saniyeler içinde analiz eder, mevzuat dayanaklarını bulur ve risk raporları oluşturur.",
      googleBtn: "Google ile Giriş Yap", select: "Dosya Seç", btn: "ANALİZİ BAŞLAT", upload: "PDF Belgesini Seçin", download: "RAPORU İNDİR (.PDF)" 
    },
    EN: { 
      title: "VERITAS LEGAL AI", sub: "SUPREME LEGAL ANALYTICS", 
      aboutBtn: "What is Veritas AI?", aboutTitle: "About Veritas Legal AI",
      aboutText: "Veritas is an advanced AI-driven legal analytics platform developed for lawyers and legal professionals. It analyzes complex documents in seconds, identifies legal bases, and generates risk assessments.",
      googleBtn: "Sign in with Google", select: "Select File", btn: "START ANALYSIS", upload: "Select PDF Document", download: "DOWNLOAD PDF" 
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    initAuth();
  }, [supabase]);

  const handleAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: darkBlue, color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <nav style={{ width: '100%', background: '#131b26', padding: '15px', position: 'fixed', top: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', borderBottom: `1px solid ${gold}33` }}>
        {["TR", "EN"].map(l => (
          <button key={l} onClick={() => setLanguage(l)} style={{ background: language === l ? gold : 'transparent', color: language === l ? darkBlue : gold, border: `1px solid ${gold}`, padding: '5px 15px', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold', margin: '0 5px' }}>{l}</button>
        ))}
      </nav>

      {/* MENÜ BUTONU */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'fixed', top: 15, left: 15, zIndex: 1100, background: gold, border: 'none', width: 40, height: 40, borderRadius: '8px', cursor: 'pointer' }}>
        <span style={{ fontSize: '20px', color: darkBlue }}>☰</span>
      </button>

      <div style={{ display: 'flex', paddingTop: '70px' }}>
        {/* SIDEBAR */}
        {sidebarOpen && (
          <aside style={{ width: '260px', background: '#131b26', height: '100vh', position: 'fixed', left: 0, padding: '20px', borderRight: `1px solid ${gold}44`, zIndex: 1050, display: 'flex', flexDirection: 'column' }}>
             
             {/* MİNİMAL ANA SAYFA BUTONU */}
             <button onClick={() => {setActiveTab('analyze'); setSidebarOpen(false)}} style={{ background: 'transparent', border: 'none', color: gold, fontSize: '24px', cursor: 'pointer', alignSelf: 'flex-start', marginBottom: '20px' }}>🏠</button>

             <h2 style={{ color: gold, textAlign: 'center', marginBottom: '30px' }}>VERITAS AI</h2>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <button onClick={() => {setActiveTab('analyze'); setSidebarOpen(false)}} style={{ width: '100%', padding: '12px', background: activeTab === 'analyze' ? gold : 'transparent', color: activeTab === 'analyze' ? darkBlue : 'white', border: `1px solid ${gold}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'left' }}>🔎 Analiz</button>
               <button onClick={() => {setActiveTab('pricing'); setSidebarOpen(false)}} style={{ width: '100%', padding: '12px', background: activeTab === 'pricing' ? gold : 'transparent', color: activeTab === 'pricing' ? darkBlue : 'white', border: `1px solid ${gold}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'left' }}>💳 Paketler</button>
               
               {/* VERITAS AI NEDİR? BUTONU */}
               <button onClick={() => {setActiveTab('about'); setSidebarOpen(false)}} style={{ width: '100%', padding: '12px', background: activeTab === 'about' ? gold : 'transparent', color: activeTab === 'about' ? darkBlue : 'white', border: `1px solid ${gold}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'left', marginTop: '20px' }}>❓ {ui[language].aboutBtn}</button>
             </div>
          </aside>
        )}

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', width: '100%' }}>
          {!user ? (
            /* GİRİŞ EKRANI */
            <div style={{ textAlign: 'center', marginTop: '80px' }}>
              <img src="/logoverl.png" alt="Logo" style={{ width: '350px', marginBottom: '30px' }} /> {/* LOGO BÜYÜTÜLDÜ */}
              <h1 style={{ color: gold, fontSize: '2.5rem', marginBottom: '10px' }}>{ui[language].title}</h1>
              <p style={{ color: 'white', fontSize: '1.2rem', marginBottom: '40px' }}>{ui[language].sub}</p>
              
              <button onClick={handleAuth} style={{ background: '#ffffff', color: '#000000', padding: '15px 35px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', margin: '0 auto', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="24" /> 
                <span style={{ color: 'black' }}>{ui[language].googleBtn}</span>
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '850px', textAlign: 'center' }}>
              
              {activeTab === 'analyze' && (
                <>
                  <img src="/logoverl.png" alt="Logo" style={{ width: '220px', marginBottom: '30px' }} /> {/* LOGO BÜYÜTÜLDÜ */}
                  <div style={{ background: midBlue, padding: '50px', borderRadius: '25px', border: `2px dashed ${gold}44` }}>
                    <p style={{ color: 'white', fontSize: '1.2rem', marginBottom: '20px' }}>{ui[language].upload}</p>
                    <input type="file" id="pdfInputFinal" accept=".pdf" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <button onClick={() => document.getElementById('pdfInputFinal')?.click()} style={{ background: gold, color: darkBlue, padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{ui[language].select}</button>
                    {file && <p style={{ marginTop: '20px', color: '#4ade80', fontWeight: 'bold' }}>● {file.name}</p>}
                    <button 
                      onClick={async () => {
                        if (!file) return;
                        setLoading(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await fetch('/api/analyze', { method: 'POST', body: formData });
                          const data = await res.json();
                          setResult(data.result || data.error || 'Analysis complete');
                        } catch (err: any) {
                          setResult(err.message || 'Error occurred');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={!file || loading}
                      style={{ width: '100%', padding: '18px', background: file ? gold : '#444', color: darkBlue, borderRadius: '12px', border: 'none', marginTop: '30px', fontWeight: '900', cursor: file ? 'pointer' : 'not-allowed' }}
                    >
                      {loading ? '⏳ Analiz Ediliyor...' : ui[language].btn}
                    </button>
                    {result && (
                      <div ref={reportRef} style={{ marginTop: '30px', background: '#1a1f2e', padding: '30px', borderRadius: '15px', border: `1px solid ${gold}44` }}>
                        <h3 style={{ color: gold, marginBottom: '15px' }}>Analiz Sonucu</h3>
                        <div style={{ color: 'white', whiteSpace: 'pre-wrap' }}>{result}</div>
                        <button 
                          onClick={async () => {
                            if (!reportRef.current) return;
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
                          }}
                          style={{ marginTop: '20px', background: gold, color: darkBlue, padding: '12px 25px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          {ui[language].download}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'pricing' && (
                <div style={{ marginTop: '40px' }}>
                  <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '40px' }}>Fiyatlandırma</h2>
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
                  <p style={{ color: 'white', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '20px' }}>{ui[language].aboutText}</p>
                  <div style={{ background: midBlue, padding: '25px', borderRadius: '15px', marginTop: '30px' }}>
                    <h3 style={{ color: gold, marginBottom: '15px' }}>Özellikler</h3>
                    <ul style={{ color: 'white', lineHeight: '2' }}>
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
    </div>
  );
}