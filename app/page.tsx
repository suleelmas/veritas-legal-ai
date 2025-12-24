"use client";
import React, { useState, useEffect, useRef } from 'react';
import PricingCard from "./components/PricingCard";
import { createBrowserClient } from '@supabase/ssr';

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
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("analyze");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const gold = "#c7b079"; 
  const darkBlue = "#182332"; 
  const midBlue = "#232d3c"; 

  const ui: any = {
    TR: { title: "VERITAS AI", side_a: "Analiz", side_p: "Paketler", googleBtn: "Google ile Giriş Yap", upload: "PDF Seçin", btn: "ANALİZİ BAŞLAT" },
    EN: { title: "VERITAS AI", side_a: "Analyze", side_p: "Pricing", googleBtn: "Sign in with Google", upload: "Select PDF", btn: "START ANALYSIS" },
    DE: { title: "VERITAS AI", side_a: "Analyse", side_p: "Pakete", googleBtn: "Google Login", upload: "PDF", btn: "ANALYSE" },
    RU: { title: "VERITAS AI", side_a: "Анализ", side_p: "Цены", googleBtn: "Google Login", upload: "PDF", btn: "АНАЛИЗ" },
    ZH: { title: "VERITAS AI", side_a: "分析", side_p: "套餐", googleBtn: "Google Login", upload: "PDF", btn: "分析" },
    AR: { title: "VERITAS AI", side_a: "تحليل", side_p: "باقات", googleBtn: "Google Login", upload: "PDF", btn: "تحليل" },
    FR: { title: "VERITAS AI", side_a: "Analyser", side_p: "Prix", googleBtn: "Google Login", upload: "PDF", btn: "ANALYSER" },
    ES: { title: "VERITAS AI", side_a: "Analizar", side_p: "Planes", googleBtn: "Google Login", upload: "PDF", btn: "ANALIZAR" }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthChecking(false);
    };
    initAuth();
  }, [supabase]);

  if (authChecking) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: darkBlue, color: 'white' }}>
      {/* ÜST DİL SEÇİCİ */}
      <div style={{ width: '100%', background: '#131b26', padding: 8, position: 'fixed', top: 0, zIndex: 2000, display:'flex', alignItems:'center', justifyContent:'center', gap:8, borderBottom: `1px solid ${gold}33` }}>
        {Object.keys(ui).map(lang => (
          <button key={lang} onClick={() => setLanguage(lang)} style={{ background: language === lang ? gold : 'transparent', color: language === lang ? darkBlue : gold, border: `1px solid ${gold}`, padding: '2px 8px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>{lang}</button>
        ))}
      </div>

      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'fixed', top: 12, left: 12, zIndex: 2100, background: gold, border: 'none', borderRadius: 8, width: 40, height: 40, cursor: 'pointer', color: darkBlue, fontWeight: 'bold' }}>
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <div style={{ display: 'flex', paddingTop: '60px' }}>
        {sidebarOpen && (
          <aside style={{ width: '270px', background: '#131b26', height: '100vh', position: 'fixed', left: 0, zIndex: 1900, padding: '40px 20px', borderRight: `1px solid ${gold}44` }}>
            <h2 style={{ color: gold, textAlign: 'center', marginBottom: 40 }}>⚖️ VERITAS</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button onClick={() => {setActiveTab('analyze'); setSidebarOpen(false)}} style={{ padding: '14px', background: activeTab === 'analyze' ? gold : 'transparent', color: activeTab === 'analyze' ? darkBlue : gold, border: `1px solid ${gold}`, borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>🔎 {ui[language].side_a}</button>
              <button onClick={() => {setActiveTab('pricing'); setSidebarOpen(false)}} style={{ padding: '14px', background: activeTab === 'pricing' ? gold : 'transparent', color: activeTab === 'pricing' ? darkBlue : gold, border: `1px solid ${gold}`, borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>💳 {ui[language].side_p}</button>
            </div>
          </aside>
        )}

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', width: '100%' }}>
          {!user ? (
            <div style={{ textAlign: 'center', marginTop: '100px' }}>
              <img src="/logoverl.png" alt="Logo" style={{ width: '250px' }} />
              <h1 style={{ color: gold, fontSize: '2.5rem', margin: '20px 0' }}>{ui[language].title}</h1>
              <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} style={{ padding: '16px 32px', background: 'white', color: darkBlue, borderRadius: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, margin: '0 auto' }}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" /> {ui[language].googleBtn}
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'analyze' && (
                <div style={{ width: '100%', maxWidth: '800px', textAlign: 'center' }}>
                  <img src="/logoverl.png" alt="Logo" style={{ width: '150px', margin: '20px auto' }} />
                  <div style={{ background: midBlue, padding: '50px', borderRadius: '30px', border: `2px dashed ${gold}44` }}>
                    <p style={{ color: gold, fontSize: '1.2rem', marginBottom: 20 }}>{ui[language].upload}</p>
                    <input type="file" id="fIn" accept=".pdf" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <button onClick={() => document.getElementById('fIn')?.click()} style={{ background: gold, color: darkBlue, padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Dosya Seç</button>
                    {file && <p style={{marginTop: 15, color: '#10b981'}}>✔ {file.name}</p>}
                    <button style={{ width: '100%', padding: '18px', background: file ? gold : '#444', color: darkBlue, borderRadius: '12px', border: 'none', marginTop: '25px', fontWeight: 'bold' }}>{ui[language].btn}</button>
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div style={{ width: '100%', maxWidth: '1000px', textAlign: 'center' }}>
                  <h1 style={{ color: gold, fontSize: '2.5rem', marginBottom: '40px' }}>{ui[language].side_p}</h1>
                  <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <PricingCard gold={gold} plan="Basic" price="49₺" features={["10 Analiz"]} />
                    <PricingCard gold={gold} plan="Professional" price="149₺" popular={true} features={["50 Analiz", "PDF"]} />
                    <PricingCard gold={gold} plan="Elite" price="399₺" features={["Sınırsız"]} />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}