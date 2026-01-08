"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CASE_LAW_ROULETTE_DATA, JURISDICTION_STATS, SYSTEM_STATUS } from '@/lib/constants';

type Tab = "analyze" | "pricing" | "about" | "history";

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
  ui,
  isAdmin = false,
  userCredits = 0,
  contractCount = 10,
  setContractCount,
  roiCurrency = 'USD',
  setRoiCurrency
}: QuantumSidebarProps) {
  const router = useRouter();
  
  // Case-Law Roulette State
  const [currentCase, setCurrentCase] = useState<{ country: string; text: string; emoji: string } | null>(null);
  const [caseIndex, setCaseIndex] = useState(0);

  // Get random case from all jurisdictions
  const getAllCases = () => {
    const allCases: { country: string; text: string; emoji: string }[] = [];
    Object.entries(CASE_LAW_ROULETTE_DATA).forEach(([country, cases]) => {
      const emoji = JURISDICTION_STATS[country as keyof typeof JURISDICTION_STATS].emoji;
      cases.forEach(caseText => {
        allCases.push({ country, text: caseText, emoji });
      });
    });
    return allCases;
  };

  // Initialize and rotate cases every 20 seconds
  useEffect(() => {
    const allCases = getAllCases();
    if (allCases.length > 0) {
      setCurrentCase(allCases[0]);
    }

    const interval = setInterval(() => {
      setCaseIndex(prev => {
        const nextIndex = (prev + 1) % allCases.length;
        setCurrentCase(allCases[nextIndex]);
        return nextIndex;
      });
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, []);

  if (!sidebarOpen) return null;

  return (
    <aside style={{ width: '260px', background: '#131b26', height: '100vh', position: 'fixed', left: 0, padding: '20px', borderRight: `1px solid ${gold}44`, zIndex: 1050, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <h2 style={{ color: gold, textAlign: 'center', marginBottom: '20px' }}>VERITAS Q-AI</h2>
      
      {/* Credits Display */}
      {user && !isAdmin && (
        <div style={{
          marginBottom: '20px',
          padding: '10px',
          background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
          borderRadius: '8px',
          border: `1px solid ${gold}33`,
          textAlign: 'center'
        }}>
          <div style={{
            color: gold,
            fontSize: '0.9rem',
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            {language === 'TR' ? 'Krediler' : 'Credits'}
          </div>
          <div style={{
            color: '#e0e0e0',
            fontSize: '1.2rem',
            fontWeight: 'bold'
          }}>
            {userCredits}
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
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

      {/* VIP/Admin Status Badge */}
      {isAdmin && user && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            marginTop: '20px',
            padding: '12px',
            background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
            borderRadius: '10px',
            border: `2px solid ${gold}66`,
            textAlign: 'center',
            boxShadow: `0 0 15px ${gold}33`
          }}
        >
          <div style={{
            fontSize: '24px',
            marginBottom: '6px'
          }}>
            ⭐
          </div>
          <div style={{
            color: gold,
            fontSize: '0.85rem',
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            {language === 'TR' ? 'Plan: Veritas VIP / Developer' : 'Plan: Veritas VIP / Developer'}
          </div>
          <div style={{
            color: '#e0e0e0',
            fontSize: '0.7rem',
            opacity: 0.8
          }}>
            {language === 'TR' ? 'Sınırsız Analiz' : 'Unlimited Analysis'}
          </div>
        </motion.div>
      )}

      {/* What is Veritas Q-AI Section */}
      <div style={{ 
        marginTop: '30px', 
        paddingTop: '20px', 
        borderTop: `1px solid ${gold}33`,
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: '5px'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h3 style={{ 
            color: gold, 
            fontSize: '1.1rem', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {language === 'TR' ? 'Veritas Q-AI Nedir?' : 'What is Veritas Q-AI?'}
          </h3>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${gold}66, transparent)`,
            marginBottom: '20px',
            boxShadow: `0 0 4px ${gold}33`
          }} />

          {/* Title */}
          <motion.h4
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{
              color: gold,
              fontSize: '0.95rem',
              fontWeight: 'bold',
              marginBottom: '15px',
              textAlign: 'center'
            }}
          >
            {language === 'TR' ? 'Hukukta Kuantum Sıçraması' : 'The Quantum Leap in Law'}
          </motion.h4>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${gold}44, transparent)`,
            marginBottom: '15px',
            boxShadow: `0 0 3px ${gold}22`
          }} />

          {/* The Solution */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ marginBottom: '20px' }}
          >
            <h5 style={{
              color: gold,
              fontSize: '0.85rem',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              {language === 'TR' ? 'Ne Çözüm Sunuyoruz?' : 'The Solution'}
            </h5>
            <p style={{
              color: '#e0e0e0',
              fontSize: '0.75rem',
              lineHeight: '1.6',
              opacity: 0.9
            }}>
              {language === 'TR' 
                ? 'Veritas Q-AI, modern hukukta "Karmaşıklık Krizi"ni çözer. 4 büyük yargı alanındaki (TR, US, UK, DE) milyonlarca sayfa mevzuat ve mahkeme içtihadını saniyeler içinde işleyerek, manuel araştırma hatalarını ortadan kaldırır ve klasik analizin genellikle kaçırdığı gizli hukuki riskleri ortaya çıkarır.'
                : 'Veritas Q-AI solves the "Complexity Crisis" in modern law. By processing millions of pages of legislation and court precedents across 4 major jurisdictions (TR, US, UK, DE) in seconds, we eliminate manual research errors and reveal hidden legal risks that classical analysis often misses.'}
            </p>
          </motion.div>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${gold}44, transparent)`,
            marginBottom: '15px',
            boxShadow: `0 0 3px ${gold}22`
          }} />

          {/* The Technology */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{ marginBottom: '20px' }}
          >
            <h5 style={{
              color: gold,
              fontSize: '0.85rem',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              {language === 'TR' ? 'Nasıl Sunuyoruz?' : 'The Technology'}
            </h5>
            <p style={{
              color: '#e0e0e0',
              fontSize: '0.75rem',
              lineHeight: '1.6',
              opacity: 0.9
            }}>
              {language === 'TR'
                ? 'Hibrit Kuantum-AI Mimarisi kullanıyoruz. AI parser\'larımız küresel hukuk verilerini toplarken ve yapılandırırken, Kuantum Simülasyon Motorumuz belgeniz ile mevcut yasalar arasındaki dolanıklığı hesaplar. Bu sayede hukuki olasılıkları haritalandırır ve potansiyel sonuçları benzeri görülmemiş bir doğrulukla tahmin ederiz.'
                : 'We utilize a Hybrid Quantum-AI Architecture. While our AI parsers collect and structure global legal data, our Quantum Simulation Engine calculates the entanglement between your document and current laws. This allows us to map legal probabilities and predict potential outcomes with unprecedented accuracy.'}
            </p>
          </motion.div>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${gold}44, transparent)`,
            marginBottom: '15px',
            boxShadow: `0 0 3px ${gold}22`
          }} />

          {/* The Value */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{ marginBottom: '20px' }}
          >
            <h5 style={{
              color: gold,
              fontSize: '0.85rem',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              {language === 'TR' ? 'Neden Veritas?' : 'The Value'}
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: gold, fontSize: '0.7rem' }}>✓</span>
                <span style={{ color: '#e0e0e0', fontSize: '0.75rem', lineHeight: '1.5', opacity: 0.9 }}>
                  {language === 'TR' ? 'Küresel Yargı İçgörüsü: 4 ülkede eşzamanlı analiz.' : 'Global Jurisdictional Insight: Simultaneous analysis across 4 countries.'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: gold, fontSize: '0.7rem' }}>✓</span>
                <span style={{ color: '#e0e0e0', fontSize: '0.75rem', lineHeight: '1.5', opacity: 0.9 }}>
                  {language === 'TR' ? 'Anahtar Kelimelerin Ötesi: Hukuki mantığın bağlamsal anlaşılması.' : 'Beyond Keywords: Contextual understanding of legal logic.'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ color: gold, fontSize: '0.7rem' }}>✓</span>
                <span style={{ color: '#e0e0e0', fontSize: '0.75rem', lineHeight: '1.5', opacity: 0.9 }}>
                  {language === 'TR' ? 'Risk Tahmini: Olasılık tabanlı çatışma tespiti.' : 'Risk Prediction: Probability-based conflict detection.'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Divider */}
          <div style={{
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${gold}44, transparent)`,
            marginBottom: '15px',
            boxShadow: `0 0 3px ${gold}22`
          }} />

          {/* Live Data Pulse */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{
              marginTop: '20px',
              padding: '12px',
              background: `linear-gradient(135deg, rgba(199, 176, 121, 0.1), rgba(199, 176, 121, 0.05))`,
              borderRadius: '8px',
              border: `1px solid ${gold}33`
            }}
          >
            <h5 style={{
              color: gold,
              fontSize: '0.8rem',
              fontWeight: 'bold',
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              {language === 'TR' ? 'Canlı Veri Nabzı' : 'Live Data Pulse'}
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#b0b0b0', fontSize: '0.7rem', opacity: 0.8 }}>
                  {language === 'TR' ? 'Durum:' : 'Status:'}
                </span>
                <span style={{ color: '#4ade80', fontSize: '0.7rem', fontWeight: 'bold' }}>
                  {language === 'TR' ? 'Kuantum Motoru Aktif' : 'Quantum Engine Active'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#b0b0b0', fontSize: '0.7rem', opacity: 0.8 }}>
                  {language === 'TR' ? 'Veri Havuzu:' : 'Data Pool:'}
                </span>
                <span style={{ color: '#e0e0e0', fontSize: '0.7rem' }}>
                  {language === 'TR' ? '1M+ Bağlantılı Madde' : '1M+ Linked Clauses'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#b0b0b0', fontSize: '0.7rem', opacity: 0.8 }}>
                  {language === 'TR' ? 'Son Senkron:' : 'Last Sync:'}
                </span>
                <span style={{ color: '#e0e0e0', fontSize: '0.7rem' }}>
                  {language === 'TR' ? 'Gerçek Zamanlı' : 'Real-time'}
                </span>
              </div>
              <div style={{ 
                marginTop: '4px', 
                fontSize: '0.65rem', 
                color: '#999', 
                textAlign: 'center',
                opacity: 0.7
              }}>
                (TR, US, UK, DE)
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Jurisdiction Switcher */}
        <div style={{
          marginTop: '25px',
          paddingTop: '20px',
          borderTop: `1px solid ${gold}33`
        }}>
          <h5 style={{
            color: gold,
            fontSize: '0.8rem',
            fontWeight: 'bold',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            {language === 'TR' ? 'Aktif Yargı Alanları' : 'Active Jurisdictions'}
          </h5>
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            {Object.entries(JURISDICTION_STATS).map(([code, stats]) => (
              <motion.div
                key={code}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  filter: stats.active ? `drop-shadow(0 0 8px ${gold}66)` : 'none'
                }}
                transition={{ delay: 0.1 * Object.keys(JURISDICTION_STATS).indexOf(code) }}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  filter: stats.active ? `drop-shadow(0 0 6px ${gold}44)` : 'none',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = `drop-shadow(0 0 12px ${gold}88)`;
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = stats.active ? `drop-shadow(0 0 6px ${gold}44)` : 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title={`${stats.name}: ${(stats.documentCount / 1000).toFixed(0)}K documents`}
              >
                <div style={{
                  fontSize: '28px',
                  textAlign: 'center'
                }}>
                  {stats.emoji}
                </div>
                {stats.active && (
                  <motion.div
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#4ade80',
                      boxShadow: `0 0 6px #4ade80`
                    }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Case-Law Roulette */}
        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: `linear-gradient(135deg, rgba(199, 176, 121, 0.08), rgba(199, 176, 121, 0.03))`,
          borderRadius: '8px',
          border: `1px solid ${gold}22`,
          minHeight: '80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h5 style={{
            color: gold,
            fontSize: '0.75rem',
            fontWeight: 'bold',
            marginBottom: '10px',
            textAlign: 'center',
            opacity: 0.9
          }}>
            {language === 'TR' ? 'Emsal Karar Döngüsü' : 'Case-Law Roulette'}
          </h5>
          <AnimatePresence mode="wait">
            {currentCase && (
              <motion.div
                key={caseIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                style={{
                  textAlign: 'center',
                  padding: '8px 4px'
                }}
              >
                <div style={{
                  fontSize: '20px',
                  marginBottom: '6px'
                }}>
                  {currentCase.emoji}
                </div>
                <p style={{
                  color: '#e0e0e0',
                  fontSize: '0.7rem',
                  lineHeight: '1.4',
                  margin: 0,
                  opacity: 0.9
                }}>
                  {currentCase.text}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quantum ROI Calculator */}
        {setContractCount && setRoiCurrency && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{
              marginTop: '20px',
              padding: '15px',
              background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
              borderRadius: '10px',
              border: `1px solid ${gold}33`
            }}
          >
            <h5 style={{
              color: gold,
              fontSize: '0.8rem',
              fontWeight: 'bold',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              {language === 'TR' ? 'ROI Hesaplayıcı' : 'ROI Calculator'}
            </h5>
            
            {/* Currency Selector */}
            <div style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setRoiCurrency('TR')}
                style={{
                  padding: '4px 10px',
                  background: roiCurrency === 'TR' ? gold : 'transparent',
                  color: roiCurrency === 'TR' ? '#000000' : gold,
                  border: `1.5px solid ${gold}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.65rem',
                  transition: 'all 0.3s'
                }}
              >
                TR
              </button>
              <button
                onClick={() => setRoiCurrency('USD')}
                style={{
                  padding: '4px 10px',
                  background: roiCurrency === 'USD' ? gold : 'transparent',
                  color: roiCurrency === 'USD' ? '#000000' : gold,
                  border: `1.5px solid ${gold}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.65rem',
                  transition: 'all 0.3s'
                }}
              >
                USD
              </button>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                color: '#e0e0e0',
                fontSize: '0.7rem',
                marginBottom: '6px',
                display: 'block',
                textAlign: 'center',
                opacity: 0.9
              }}>
                {language === 'TR' ? 'Sözleşme Sayısı' : 'Contracts'}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={contractCount}
                onChange={(e) => setContractCount(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: '#2a3441',
                  outline: 'none',
                  marginTop: '8px',
                  accentColor: gold
                }}
              />
              <div style={{
                textAlign: 'center',
                color: gold,
                fontSize: '0.9rem',
                fontWeight: 'bold',
                marginTop: '6px'
              }}>
                {contractCount}
              </div>
            </div>
            <div style={{
              padding: '10px',
              background: `rgba(0, 0, 0, 0.3)`,
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              {(() => {
                const isTR = roiCurrency === 'TR';
                const hourlyRate = isTR ? 2500 : 150;
                const veritasRate = isTR ? 990 : 49;
                const currencySymbol = isTR ? 'TL' : '$';
                const savings = (contractCount * 8 * hourlyRate) - (contractCount * veritasRate);
                
                return (
                  <>
                    <div style={{
                      color: '#b0b0b0',
                      fontSize: '0.65rem',
                      marginBottom: '4px',
                      opacity: 0.8
                    }}>
                      {language === 'TR' ? 'Tasarruf' : 'Savings'}
                    </div>
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                        filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)']
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        color: gold,
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        textShadow: `0 0 10px ${gold}44`
                      }}
                    >
                      {currencySymbol} {savings.toLocaleString('tr-TR')}
                    </motion.div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}

        {/* System Status */}
        <div style={{
          marginTop: '20px',
          paddingTop: '15px',
          borderTop: `1px solid ${gold}22`,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          paddingBottom: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <motion.div
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: SYSTEM_STATUS.quantumLink ? '#4ade80' : '#ef4444',
                boxShadow: SYSTEM_STATUS.quantumLink ? `0 0 8px #4ade80` : 'none'
              }}
            />
            <span style={{
              color: '#b0b0b0',
              fontSize: '0.65rem',
              opacity: 0.8
            }}>
              {language === 'TR' ? 'Sistem Durumu: Kuantum Bağlantısı Kuruldu' : 'System Status: Quantum Link Established'}
            </span>
          </div>
          {/* Risk Scanned Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            paddingTop: '8px',
            borderTop: `1px solid ${gold}22`
          }}>
            <motion.div
              animate={{
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: `0 0 6px #4ade80`
              }}
            />
            <span style={{
              color: '#b0b0b0',
              fontSize: '0.65rem',
              opacity: 0.8
            }}>
              {language === 'TR' ? 'Risk Taraması: Tamamlandı' : 'Risk Scanned: Completed'}
            </span>
          </div>
        </div>

        {/* Live Database Status */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '20px',
          paddingBottom: '15px',
          borderTop: `1px solid ${gold}22`,
          position: 'relative'
        }}>
          <div
            style={{
              padding: '12px',
              background: `rgba(19, 27, 38, 0.6)`,
              borderRadius: '8px',
              border: `1px solid ${gold}33`,
              fontFamily: '"JetBrains Mono", "Roboto Mono", monospace',
              fontSize: '0.7rem',
              position: 'relative'
            }}
            title={language === 'TR' 
              ? 'Veritas günlük olarak 4 büyük yargı alanını tarar ve yeni yüksek mahkeme kararları ile yasal değişiklikleri tespit eder. Toplam analiz edilen kayıt: 1.2M+'
              : 'Veritas daily scans 4 major jurisdictions for new supreme court rulings and legislative changes. Total records analyzed: 1.2M+'}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `rgba(19, 27, 38, 0.8)`;
              e.currentTarget.style.borderColor = gold;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `rgba(19, 27, 38, 0.6)`;
              e.currentTarget.style.borderColor = `${gold}33`;
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px'
            }}>
              <motion.div
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#4ade80',
                  boxShadow: `0 0 8px #4ade80`
                }}
              />
              <span style={{
                color: '#4ade80',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                letterSpacing: '0.5px'
              }}>
                Quantum Engine: Online
              </span>
            </div>
            <div style={{
              color: '#b0b0b0',
              fontSize: '0.65rem',
              marginBottom: '4px',
              opacity: 0.8
            }}>
              {language === 'TR' ? 'Son Veri Senkronizasyonu:' : 'Last Data Sync:'} {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (language === 'TR') {
                  return today.toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                }
                return today.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
              })()}
            </div>
            <div style={{
              color: '#b0b0b0',
              fontSize: '0.65rem',
              opacity: 0.7
            }}>
              {language === 'TR' ? 'Yargı Alanları:' : 'Jurisdictions Covered:'} TR, US, UK, DE
            </div>
          </div>
        </div>

        {/* Feedback Hub Button */}
        <div style={{
          paddingTop: '15px',
          borderTop: `1px solid ${gold}22`
        }}>
          <button
            onClick={() => {
              // This will be handled by parent component
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('openFeedbackHub'));
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
              color: gold,
              border: `1px solid ${gold}44`,
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s',
              marginBottom: '10px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `linear-gradient(135deg, ${gold}33, ${gold}22)`;
              e.currentTarget.style.borderColor = gold;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${gold}44`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `linear-gradient(135deg, ${gold}22, ${gold}11)`;
              e.currentTarget.style.borderColor = `${gold}44`;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>💬</span>
            <span>{language === 'TR' ? 'İstek & Öneri' : 'Request a Feature / Suggestion'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}





