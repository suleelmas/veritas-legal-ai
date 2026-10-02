"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CASE_LAW_ROULETTE_DATA, JURISDICTION_STATS, SYSTEM_STATUS } from '@/lib/constants';
import { ct } from '@/lib/componentTranslations';
import { getLanguage, localeMap } from '@/lib/translations';

type Tab = 'analyze' | 'pricing' | 'about' | 'history';

interface QuantumSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  gold: string;
  language: string;
  user: any;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  setFile: (file: File | null) => void;
  setResult: (result: string) => void;
  handleAuth: () => void;
  canAccessHistory: () => boolean;
  ui: any;
  isAdmin?: boolean;
  userCredits?: number;
  contractCount?: number;
  setContractCount?: (count: number) => void;
  roiCurrency?: 'TR' | 'USD';
  setRoiCurrency?: (currency: 'TR' | 'USD') => void;
}

export default function QuantumSidebar({
  sidebarOpen, setSidebarOpen, gold, language, user, activeTab, setActiveTab,
  setFile, setResult, handleAuth, canAccessHistory, isAdmin = false,
  userCredits = 0, contractCount = 10, setContractCount, roiCurrency = 'USD', setRoiCurrency
}: QuantumSidebarProps) {
  const router = useRouter();
  const [currentCase, setCurrentCase] = useState<{ country: string; text: string; emoji: string } | null>(null);
  const [caseIndex, setCaseIndex] = useState(0);

  useEffect(() => {
    const allCases: { country: string; text: string; emoji: string }[] = [];
    Object.entries(CASE_LAW_ROULETTE_DATA).forEach(([country, cases]) => {
      const emoji = JURISDICTION_STATS[country as keyof typeof JURISDICTION_STATS].emoji;
      cases.forEach((text) => allCases.push({ country, text, emoji }));
    });
    if (!allCases.length) return;
    setCurrentCase(allCases[0]);
    const interval = setInterval(() => {
      setCaseIndex((prev) => {
        const next = (prev + 1) % allCases.length;
        setCurrentCase(allCases[next]);
        return next;
      });
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  if (!sidebarOpen) return null;

  const navButton = (selected: boolean, enabled = true): React.CSSProperties => ({
    width: '100%', padding: '12px', background: selected ? 'rgba(199,176,121,.25)' : 'transparent',
    color: enabled ? (selected ? gold : '#fff') : '#666', border: `1px solid ${enabled ? gold : '#666'}`,
    borderRadius: '10px', cursor: enabled ? 'pointer' : 'not-allowed', fontWeight: 'bold',
    textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', opacity: enabled ? 1 : .5
  });

  const divider = <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${gold}44,transparent)`, margin: '15px 0' }} />;

  return (
    <aside style={{ width: 260, background: '#131b26', height: '100vh', position: 'fixed', left: 0, padding: 20, borderRight: `1px solid ${gold}44`, zIndex: 999, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
      <h2 style={{ color: gold, textAlign: 'center', marginBottom: 20 }}>VERITAS Q-AI</h2>

      {user && !isAdmin && (
        <div style={{ marginBottom: 20, padding: 10, background: `linear-gradient(135deg,${gold}22,${gold}11)`, borderRadius: 8, border: `1px solid ${gold}33`, textAlign: 'center' }}>
          <div style={{ color: gold, fontSize: '.9rem', fontWeight: 'bold', marginBottom: 4 }}>{ct(language, 'credits')}</div>
          <div style={{ color: '#e0e0e0', fontSize: '1.2rem', fontWeight: 'bold' }}>{userCredits}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        {user ? (
          <button onClick={() => { setActiveTab('analyze'); setSidebarOpen(false); setFile(null); setResult(''); }} style={navButton(activeTab === 'analyze')}>
            <span>⌕</span><span>{ct(language, 'analyze')}</span>
          </button>
        ) : (
          <button onClick={() => { setSidebarOpen(false); handleAuth(); }} style={navButton(false)}>
            <span>⌕</span><span>{ct(language, 'analyzeLoginRequired')}</span>
          </button>
        )}

        <button onClick={() => {
          setActiveTab('pricing'); setSidebarOpen(false);
          if (window.location.pathname !== '/') { router.push('/#pricing'); setTimeout(() => { window.location.href = '/#pricing'; }, 100); }
          else setTimeout(() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        }} style={navButton(activeTab === 'pricing')}>
          <span>▣</span><span>{ct(language, 'packages')}</span>
        </button>

        <button onClick={() => {
          if (canAccessHistory()) { setActiveTab('history'); setSidebarOpen(false); }
          else alert(ct(language, 'historyEnterpriseOnly'));
        }} title={!canAccessHistory() ? ct(language, 'historyEnterpriseOnly') : ''} style={{ ...navButton(activeTab === 'history', canAccessHistory()), marginTop: 20 }}>
          <span>▦</span><span>{ct(language, 'history')}{!canAccessHistory() ? ' 🔒' : ''}</span>
        </button>

        <button onClick={() => { setActiveTab('about'); setSidebarOpen(false); }} style={{ ...navButton(activeTab === 'about'), marginTop: 20 }}>
          <span>ⓘ</span><span>{ct(language, 'whatIsVeritas')}</span>
        </button>
      </div>

      {isAdmin && user && (
        <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} style={{ marginTop: 20, padding: 12, background: `linear-gradient(135deg,${gold}22,${gold}11)`, borderRadius: 10, border: `2px solid ${gold}66`, textAlign: 'center' }}>
          <div style={{ fontSize: 24 }}>⭐</div>
          <div style={{ color: gold, fontSize: '.85rem', fontWeight: 'bold' }}>Plan: Veritas VIP / Developer</div>
          <div style={{ color: '#e0e0e0', fontSize: '.7rem', opacity: .8 }}>{ct(language, 'unlimitedAnalysis')}</div>
        </motion.div>
      )}

      <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${gold}33`, flex: 1, paddingRight: 5 }}>
        <h3 style={{ color: gold, fontSize: '1.1rem', textAlign: 'center', marginBottom: 20 }}>{ct(language, 'whatIsVeritas')}</h3>
        <h4 style={{ color: gold, fontSize: '.95rem', textAlign: 'center' }}>{ct(language, 'quantumLeapLaw')}</h4>
        {divider}

        <section style={{ marginBottom: 20 }}>
          <h5 style={{ color: gold, fontSize: '.85rem', marginBottom: 8 }}>{ct(language, 'solutionTitle')}</h5>
          <p style={{ color: '#e0e0e0', fontSize: '.75rem', lineHeight: 1.6, opacity: .9 }}>{ct(language, 'solutionText')}</p>
        </section>
        {divider}
        <section style={{ marginBottom: 20 }}>
          <h5 style={{ color: gold, fontSize: '.85rem', marginBottom: 8 }}>{ct(language, 'technologyTitle')}</h5>
          <p style={{ color: '#e0e0e0', fontSize: '.75rem', lineHeight: 1.6, opacity: .9 }}>{ct(language, 'technologyText')}</p>
        </section>
        {divider}
        <section style={{ marginBottom: 20 }}>
          <h5 style={{ color: gold, fontSize: '.85rem', marginBottom: 8 }}>{ct(language, 'valueTitle')}</h5>
          {[ct(language, 'value1'), ct(language, 'value2'), ct(language, 'value3')].map((v) => <div key={v} style={{ display: 'flex', gap: 6, marginBottom: 6 }}><span style={{ color: gold }}>✓</span><span style={{ color: '#e0e0e0', fontSize: '.75rem', lineHeight: 1.5 }}>{v}</span></div>)}
        </section>

        <div style={{ marginTop: 20, padding: 12, background: `linear-gradient(135deg,rgba(199,176,121,.1),rgba(199,176,121,.05))`, borderRadius: 8, border: `1px solid ${gold}33` }}>
          <h5 style={{ color: gold, fontSize: '.8rem', textAlign: 'center', marginBottom: 10 }}>{ct(language, 'liveDataPulse')}</h5>
          {[
            [ct(language, 'status'), ct(language, 'quantumEngineActive')],
            [ct(language, 'dataPool'), ct(language, 'linkedClauses')],
            [ct(language, 'lastSync'), ct(language, 'realTime')]
          ].map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: '#b0b0b0', fontSize: '.7rem' }}>{label}</span><span style={{ color: '#e0e0e0', fontSize: '.7rem' }}>{value}</span></div>)}
          <div style={{ textAlign: 'center', color: '#999', fontSize: '.65rem' }}>(TR, US, UK, DE)</div>
        </div>

        <div style={{ marginTop: 25, paddingTop: 20, borderTop: `1px solid ${gold}33` }}>
          <h5 style={{ color: gold, fontSize: '.8rem', textAlign: 'center' }}>{ct(language, 'activeJurisdictions')}</h5>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(JURISDICTION_STATS).map(([code, stats]) => (
              <div key={code} title={`${stats.name}: ${(stats.documentCount / 1000).toFixed(0)}K ${ct(language, 'documents')}`} style={{ position: 'relative', fontSize: 28, filter: stats.active ? `drop-shadow(0 0 6px ${gold}44)` : 'none' }}>{stats.emoji}</div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, padding: 12, background: `linear-gradient(135deg,rgba(199,176,121,.08),rgba(199,176,121,.03))`, borderRadius: 8, border: `1px solid ${gold}22`, minHeight: 80 }}>
          <h5 style={{ color: gold, fontSize: '.75rem', textAlign: 'center' }}>{ct(language, 'caseLawRoulette')}</h5>
          <AnimatePresence mode="wait">{currentCase && <motion.div key={caseIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ textAlign: 'center' }}><div style={{ fontSize: 20 }}>{currentCase.emoji}</div><p style={{ color: '#e0e0e0', fontSize: '.7rem', lineHeight: 1.4 }}>{currentCase.text}</p></motion.div>}</AnimatePresence>
        </div>

        {setContractCount && setRoiCurrency && (
          <div style={{ marginTop: 20, padding: 15, background: `linear-gradient(135deg,${gold}22,${gold}11)`, borderRadius: 10, border: `1px solid ${gold}33` }}>
            <h5 style={{ color: gold, fontSize: '.8rem', textAlign: 'center' }}>{ct(language, 'roiCalculator')}</h5>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
              {(['TR','USD'] as const).map((c) => <button key={c} onClick={() => setRoiCurrency(c)} style={{ padding: '4px 10px', background: roiCurrency === c ? gold : 'transparent', color: roiCurrency === c ? '#000' : gold, border: `1.5px solid ${gold}`, borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: '.65rem' }}>{c}</button>)}
            </div>
            <label style={{ color: '#e0e0e0', fontSize: '.7rem', display: 'block', textAlign: 'center' }}>{ct(language, 'contracts')}</label>
            <input type="range" min="1" max="50" value={contractCount} onChange={(e) => setContractCount(parseInt(e.target.value))} style={{ width: '100%', accentColor: gold }} />
            <div style={{ textAlign: 'center', color: gold, fontWeight: 'bold' }}>{contractCount}</div>
            {(() => {
              const isTR = roiCurrency === 'TR'; const hourlyRate = isTR ? 2500 : 150; const veritasRate = isTR ? 990 : 49; const symbol = isTR ? 'TL' : '$';
              const savings = (contractCount * 8 * hourlyRate) - (contractCount * veritasRate);
              return <div style={{ marginTop: 10, padding: 10, background: 'rgba(0,0,0,.3)', borderRadius: 8, textAlign: 'center' }}><div style={{ color: '#b0b0b0', fontSize: '.65rem' }}>{ct(language, 'savings')}</div><div style={{ color: gold, fontWeight: 'bold' }}>{symbol} {savings.toLocaleString(localeMap[getLanguage(language)])}</div></div>;
            })()}
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 15, borderTop: `1px solid ${gold}22`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ textAlign: 'center', color: '#b0b0b0', fontSize: '.65rem' }}>● {ct(language, 'systemQuantumEstablished')}</div>
          <div style={{ textAlign: 'center', color: '#b0b0b0', fontSize: '.65rem' }}>● {ct(language, 'riskScannedCompleted')}</div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${gold}22` }}>
          <div title={ct(language, 'databaseTooltip')} style={{ padding: 12, background: 'rgba(19,27,38,.6)', borderRadius: 8, border: `1px solid ${gold}33`, fontSize: '.7rem' }}>
            <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: 6 }}>Quantum Engine: Online</div>
            <div style={{ color: '#b0b0b0', fontSize: '.65rem', marginBottom: 4 }}>{ct(language, 'lastDataSync')} {new Date(new Date().setHours(0,0,0,0)).toLocaleDateString(localeMap[getLanguage(language)], { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div style={{ color: '#b0b0b0', fontSize: '.65rem' }}>{ct(language, 'jurisdictionsCovered')} TR, US, UK, DE</div>
          </div>
        </div>

        <div style={{ paddingTop: 15, borderTop: `1px solid ${gold}22`, marginTop: 15 }}>
          <button onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('openFeedbackHub')); }} style={{ width: '100%', padding: 12, background: `linear-gradient(135deg,${gold}22,${gold}11)`, color: gold, border: `1px solid ${gold}44`, borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: '.85rem' }}>💬 {ct(language, 'requestFeature')}</button>
        </div>
      </div>
    </aside>
  );
}
