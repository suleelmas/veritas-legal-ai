"use client";
import React, { useState, useEffect, useRef } from 'react';
import PricingCard from "./components/PricingCard";
import { createBrowserClient } from '@supabase/ssr';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';

type Tab = "analyze" | "history" | "pricing";

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
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const gold = "#c7b079"; 
  const darkBlue = "#182332"; 
  const midBlue = "#232d3c"; 

  const languages = ["TR", "EN", "DE", "RU", "ZH", "AR", "FR", "ES"];

  const ui: any = {
    TR: { title: "VERITAS LEGAL AI", sub: "YÜKSEK HUKUK ANALİTİĞİ", btn: "ANALİZİ BAŞLAT", logout: "Güvenli Çıkış", googleBtn: "Google ile Giriş Yap", upload: "PDF Belgesini Seçin", select: "Dosya Seç", uploadLimit: "100 PDF'e kadar.", sidebar_analyze: "Analiz", sidebar_history: "Geçmiş", sidebar_pricing: "Paketler", processing: "YAPAY ZEKA ANALİZ EDİYOR...", ready: "● Belge Hazır", reportTitles: ["📋 Veritas AI Analiz Raporu", "1. Analiz Özeti", "Olayın Özeti:", "Hukuki Nitelendirme:", "2. İlgili Mevzuat", "Kanun Maddeleri:", "Yönetmelikler:", "3. Güncel İçtihatlar", "Emsal Kararlar:", "Karar Analizi:", "4. Risk Analizi", "Güçlü Yönler:", "Zayıf Yönler:", "5. Stratejik Öneriler", "Atılması Gereken Adımlar:", "Zamanaşımı Uyarıları:", "6. Sonuç", "Yasal Uyarı: Otomatik rapordur."] },
    EN: { title: "VERITAS LEGAL AI", sub: "SUPREME LEGAL ANALYTICS", btn: "START ANALYSIS", logout: "Logout", googleBtn: "Sign in with Google", upload: "Select PDF Document", select: "Select File", uploadLimit: "Up to 100 PDFs.", sidebar_analyze: "Analyze", sidebar_history: "History", sidebar_pricing: "Pricing", processing: "AI IS ANALYZING...", ready: "● File Ready", reportTitles: ["📋 Veritas AI Analysis Report", "1. Executive Summary", "Summary:", "Qualification:", "2. Legal Basis", "Statutes:", "Regulations:", "3. Precedents", "Cases:", "Analysis:", "4. Risk Assessment", "Strengths:", "Weaknesses:", "5. Suggestions", "Actions:", "Warnings:", "6. Conclusion", "Disclaimer: Auto-generated."] }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthChecking(false);
    };
    initAuth();
  }, [supabase]);

  const handleAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  const handleAnalyze = async () => {
    if (!file || !user) return;
    setLoading(true);
    setResult("");
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += (content.items as any[]).map((item) => item.str).join(" ") + "\n";
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfText: text, targetLang: language })
      });
      const data = await res.json();
      setResult(data.reply);
    } catch (err) { setResult("Hata oluştu."); } finally { setLoading(false); }
  };

  if (authChecking) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: darkBlue, color: 'white' }}>
      {/* HEADER / DİL SEÇİCİ */}
      <div style={{ width: '100%', textAlign:'center', background: darkBlue, padding: 10, position: 'fixed', top: 0, zIndex: 1000, borderBottom: `1px solid ${gold}33`, display: 'flex', justifyContent: 'center', gap: 10 }}>
        {languages.map(lang => (
          <button key={lang} onClick={() => setLanguage(lang)} style={{ background: language === lang ? gold : 'transparent', color: language === lang ? darkBlue : gold, border: `1px solid ${gold}`, padding: '4px 12px', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' }}>{lang}</button>
        ))}
      </div>

      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'fixed', top: 60, left: 20, zIndex: 1100, background: 'transparent', border: `1px solid ${gold}`, color: gold, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <div style={{ display: 'flex', paddingTop: '60px' }}>
        {sidebarOpen && (
          <aside style={{ width: '250px', background: '#1c263a', height: 'calc(100vh - 60px)', position: 'fixed', left: 0, padding: '20px', borderRight: `1px solid ${gold}33`, zIndex: 1050 }}>
            <h2 style={{ color: gold }}>VERITAS AI</h2>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
              <button onClick={() => {setActiveTab('analyze'); setSidebarOpen(false)}} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '1.1rem' }}>🔎 {ui[language].sidebar_analyze}</button>
              <button onClick={() => {setActiveTab('pricing'); setSidebarOpen(false)}} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '1.1rem' }}>💳 {ui[language].sidebar_pricing}</button>
            </nav>
          </aside>
        )}

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
          {!user ? (
            <div style={{ textAlign: 'center', marginTop: '100px' }}>
              <img src="/logoverl.png" alt="Logo" style={{ width: '200px' }} />
              <h1 style={{ color: gold }}>{ui[language].title}</h1>
              <p>{ui[language].sub}</p>
              <button onClick={handleAuth} style={{ background: 'white', color: darkBlue, padding: '15px 30px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '20px' }}>{ui[language].googleBtn}</button>
            </div>
          ) : (
            activeTab === 'analyze' ? (
              <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                <div style={{ background: midBlue, padding: '40px', borderRadius: '20px', border: `1px dashed ${gold}66` }}>
                  <input type="file" id="fileIn" accept=".pdf" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <button onClick={() => document.getElementById('fileIn')?.click()} style={{ background: gold, color: darkBlue, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{ui[language].select}</button>
                  <p style={{ marginTop: '15px' }}>{file ? file.name : ui[language].upload}</p>
                  <button onClick={handleAnalyze} disabled={!file || loading} style={{ width: '100%', padding: '15px', background: file ? gold : '#555', color: darkBlue, borderRadius: '10px', border: 'none', marginTop: '20px', fontWeight: 'bold', cursor: file ? 'pointer' : 'not-allowed' }}>
                    {loading ? ui[language].processing : ui[language].btn}
                  </button>
                </div>
                {result && <div style={{ marginTop: '30px', textAlign: 'left', padding: '20px', background: 'white', color: 'black', borderRadius: '10px' }}>{result}</div>}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <PricingCard gold={gold} plan="Basic" price="Free" features={["1 Analysis"]} />
                <PricingCard gold={gold} plan="Pro" price="$29" features={["Unlimited"]} />
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}