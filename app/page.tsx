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
    TR: { title: "VERITAS LEGAL AI", sub: "YÜKSEK HUKUK ANALİTİĞİ", googleBtn: "Google ile Giriş Yap", select: "Dosya Seç", btn: "ANALİZİ BAŞLAT", upload: "PDF Belgesini Seçin", aboutBtn: "Veritas AI Nedir?" },
    EN: { title: "VERITAS LEGAL AI", sub: "SUPREME LEGAL ANALYTICS", googleBtn: "Sign in with Google", select: "Select File", btn: "START ANALYSIS", upload: "Select PDF Document", aboutBtn: "What is Veritas AI?" }
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
    <div style={{ minHeight: '100vh', backgroundColor: darkBlue, color: 'white', fontFamily: 'sans-serif', position: 'relative' }}>
      
      {/* 1. ÜST BAR (Dil ve Minimal Ev İkonu) */}
      <nav style={{ width: '100%', background: '#131b26', padding: '12px 20px', position: 'fixed', top: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${gold}33` }}>
        {/* Minimal Ana Sayfa İkonu */}
        <button onClick={() => setActiveTab('analyze')} style={{ background: 'transparent', border: 'none', color: gold, fontSize: '20px', cursor: 'pointer', position: 'absolute', left: '70px' }}>🏠</button>
        
        {/* Dil Seçenekleri */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {["TR", "EN"].map(l => (
            <button key={l} onClick={() => setLanguage(l)} style={{ background: language === l ? gold : 'transparent', color: language === l ? darkBlue : gold, border: `1px solid ${gold}`, padding: '4px 12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>{l}</button>
          ))}
        </div>
      </nav>

      {/* 2. SIDEBAR AÇMA BUTONU (3 Çizgi - Kesin Görünür) */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'fixed', top: 12, left: 15, zIndex: 2100, background: 'transparent', border: `1px solid ${gold}66`, width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ width: '22px', height: '2px', backgroundColor: gold }}></div>
          <div style={{ width: '22px', height: '2px', backgroundColor: gold }}></div>
          <div style={{ width: '22px', height: '2px', backgroundColor: gold }}></div>
        </div>
      </button>

      <div style={{ display: 'flex', paddingTop: '65px' }}>
        {/* 3. SIDEBAR */}
        {sidebarOpen && (
          <aside style={{ width: '270px', background: '#0f172a', height: '100vh', position: 'fixed', left: 0, top: 0, padding: '80px 20px 20px 20px', borderRight: `1px solid ${gold}33`, zIndex: 1900 }}>
             <h2 style={{ color: gold, textAlign: 'center', marginBottom: '40px', fontSize: '1.5rem', fontWeight: 'bold' }}>VERITAS AI</h2>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <button onClick={() => {setActiveTab('analyze'); setSidebarOpen(false)}} style={{ width: '100%', padding: '12px', background: activeTab === 'analyze' ? gold : 'transparent', color: activeTab === 'analyze' ? darkBlue : 'white', border: `1px solid ${gold}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'left' }}>🔎 Analiz</button>
               <button onClick={() => {setActiveTab('pricing'); setSidebarOpen(false)}} style={{ width: '100%', padding: '12px', background: activeTab === 'pricing' ? gold : 'transparent', color: activeTab === 'pricing' ? darkBlue : 'white', border: `1px solid ${gold}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'left' }}>💳 Paketler</button>
               <button onClick={() => {setActiveTab('about'); setSidebarOpen(false)}} style={{ width: '100%', padding: '12px', background: activeTab === 'about' ? gold : 'transparent', color: activeTab === 'about' ? darkBlue : 'white', border: `1px solid ${gold}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', textAlign: 'left' }}>❓ {ui[language].aboutBtn}</button>
             </div>
          </aside>
        )}

        {/* 4. ANA İÇERİK ALANI */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', width: '100%' }}>
          {!user ? (
            /* GİRİŞ EKRANI (Google Beyaz Buton ve Dev Logo) */
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
              <img src="/logoverl.png" alt="Logo" style={{ width: '450px', marginBottom: '20px', filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.5))' }} />
              <h1 style={{ color: gold, fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '10px' }}>{ui[language].title}</h1>
              <p style={{ color: 'white', fontSize: '1.2rem', marginBottom: '40px', opacity: 0.8 }}>{ui[language].sub}</p>
              
              <button onClick={handleAuth} style={{ background: '#ffffff', color: '#000000', padding: '16px 40px', borderRadius: '14px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', margin: '0 auto', boxShadow: '0 8px 25px rgba(0,0,0,0.4)' }}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="24" /> 
                <span style={{ fontSize: '1.1rem', color: '#000' }}>{ui[language].googleBtn}</span>
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '850px', textAlign: 'center' }}>
              {activeTab === 'analyze' && (
                <>
                  <img src="/logoverl.png" alt="Logo" style={{ width: '220px', marginBottom: '30px' }} />
                  <div style={{ background: midBlue, padding: '50px', borderRadius: '30px', border: `2px dashed ${gold}44` }}>
                    <p style={{ color: 'white', fontSize: '1.2rem', marginBottom: '20px' }}>{ui[language].upload}</p>
                    <input type="file" id="finalInput" accept=".pdf" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <button onClick={() => document.getElementById('finalInput')?.click()} style={{ background: gold, color: darkBlue, padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{ui[language].select}</button>
                    {file && <p style={{ marginTop: '20px', color: '#4ade80', fontWeight: 'bold' }}>✔ {file.name}</p>}
                    <button style={{ width: '100%', padding: '18px', background: file ? gold : '#444', color: darkBlue, borderRadius: '12px', border: 'none', marginTop: '30px', fontWeight: '900', cursor: file ? 'pointer' : 'not-allowed' }}>{ui[language].btn}</button>
                  </div>
                </>
              )}

              {activeTab === 'pricing' && (
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <PricingCard gold={gold} plan="Basic" price="49₺" features={["10 Analiz"]} />
                  <PricingCard gold={gold} plan="Pro" price="149₺" popular features={["50 Analiz"]} />
                </div>
              )}

              {activeTab === 'about' && (
                <div style={{ background: midBlue, padding: '40px', borderRadius: '20px', border: `1px solid ${gold}33`, textAlign: 'left', color: 'white' }}>
                  <h2 style={{ color: gold, marginBottom: '20px' }}>Veritas AI</h2>
                  <p style={{ lineHeight: '1.7', opacity: 0.9 }}>Veritas Legal AI, hukuk profesyonelleri için belgeleri saniyeler içinde analiz eden gelişmiş bir yapay zeka sistemidir.</p>
                  <button onClick={() => setActiveTab('analyze')} style={{ marginTop: '20px', color: gold, background: 'transparent', border: `1px solid ${gold}`, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Geri Dön</button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}