"use client";
import React from 'react';
import { useRouter } from 'next/navigation';

type Tab = "analyze" | "pricing" | "about" | "history";

interface SidebarProps {
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
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  gold,
  language,
  user,
  activeTab,
  setActiveTab,
  setFile,
  setResult,
  handleAuth,
  canAccessHistory,
  ui
}: SidebarProps) {
  const router = useRouter();
  
  if (!sidebarOpen) return null;

  return (
    <aside style={{ width: '260px', background: '#131b26', height: '100vh', position: 'fixed', left: 0, padding: '20px', borderRight: `1px solid ${gold}44`, zIndex: 1050, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ color: gold, textAlign: 'center', marginBottom: '30px' }}>VERITAS Q-AI</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {user ? (
          <button 
            onClick={() => {
              setActiveTab('analyze'); 
              setSidebarOpen(false);
              setFile(null);
              setResult("");
            }} 
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: activeTab === 'analyze' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
              color: activeTab === 'analyze' ? gold : '#ffffff', 
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
              <circle cx="11" cy="11" r="8" stroke={activeTab === 'analyze' ? gold : '#ffffff'} strokeWidth="2" fill="none"/>
              <path d="m21 21-4.35-4.35" stroke={activeTab === 'analyze' ? gold : '#ffffff'} strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ color: activeTab === 'analyze' ? gold : '#ffffff' }}>Analiz</span>
          </button>
        ) : (
          <button 
            onClick={() => {
              setSidebarOpen(false);
              handleAuth();
            }} 
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: 'transparent', 
              color: '#ffffff', 
              border: `1px solid ${gold}`, 
              borderRadius: '10px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              opacity: 0.7
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="#ffffff" strokeWidth="2" fill="none"/>
              <path d="m21 21-4.35-4.35" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ color: '#ffffff' }}>Analiz (Giriş Gerekli)</span>
          </button>
        )}
        <button 
          onClick={() => {
            setActiveTab('pricing');
            setSidebarOpen(false);
            if (window.location.pathname !== '/') {
              router.push('/#pricing');
              setTimeout(() => {
                window.location.href = '/#pricing';
              }, 100);
            } else {
              setTimeout(() => {
                const pricingElement = document.getElementById('pricing');
                if (pricingElement) {
                  pricingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  window.location.href = '/#pricing';
                }
              }, 200);
            }
          }} 
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: activeTab === 'pricing' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
            color: activeTab === 'pricing' ? gold : '#ffffff', 
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
            <rect x="1" y="4" width="22" height="16" rx="2" stroke={activeTab === 'pricing' ? gold : '#ffffff'} strokeWidth="2" fill="none"/>
            <path d="M1 10h22" stroke={activeTab === 'pricing' ? gold : '#ffffff'} strokeWidth="2"/>
          </svg>
          <span style={{ color: activeTab === 'pricing' ? gold : '#ffffff' }}>Paketler</span>
        </button>
        <button 
          onClick={() => {
            if (canAccessHistory()) {
              setActiveTab('history');
              setSidebarOpen(false);
            } else {
              alert(language === 'TR' ? 'Bu özellik sadece Enterprise paketi için geçerlidir.' : 'This feature is only available for Enterprise members.');
            }
          }} 
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: activeTab === 'history' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
            color: canAccessHistory() ? (activeTab === 'history' ? gold : '#ffffff') : '#666666', 
            border: `1px solid ${canAccessHistory() ? gold : '#666666'}`, 
            borderRadius: '10px', 
            cursor: canAccessHistory() ? 'pointer' : 'not-allowed', 
            fontWeight: 'bold', 
            textAlign: 'left', 
            marginTop: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            opacity: canAccessHistory() ? 1 : 0.5
          }}
          title={!canAccessHistory() ? (language === 'TR' ? 'Bu özellik sadece Enterprise paketi için geçerlidir' : 'This feature is only for Enterprise members') : ''}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke={canAccessHistory() ? (activeTab === 'history' ? gold : '#ffffff') : '#666666'} strokeWidth="2" fill="none"/>
            <path d="M8 2v4M16 2v4M3 10h18" stroke={canAccessHistory() ? (activeTab === 'history' ? gold : '#ffffff') : '#666666'} strokeWidth="2"/>
          </svg>
          <span style={{ color: canAccessHistory() ? (activeTab === 'history' ? gold : '#ffffff') : '#666666' }}>
            {language === 'TR' ? 'Geçmiş' : 'History'}
            {!canAccessHistory() && ' 🔒'}
          </span>
        </button>
        <button 
          onClick={() => {setActiveTab('about'); setSidebarOpen(false);}} 
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: activeTab === 'about' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
            color: activeTab === 'about' ? gold : '#ffffff', 
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
            <circle cx="12" cy="12" r="10" stroke={activeTab === 'about' ? gold : '#ffffff'} strokeWidth="2" fill="none"/>
            <path d="M12 16v-4M12 8h.01" stroke={activeTab === 'about' ? gold : '#ffffff'} strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ color: activeTab === 'about' ? gold : '#ffffff' }}>{ui[language].aboutBtn}</span>
        </button>
      </div>
    </aside>
  );
}




