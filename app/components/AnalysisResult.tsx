"use client";
import React, { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

type UserPackage = "free" | "basic" | "professional" | "enterprise" | null;

interface AnalysisResultProps {
  result: string;
  gold: string;
  darkBlue: string;
  midBlue: string;
  lightText: string;
  language: string;
  activeResultTab: 'summary' | 'detailed' | 'risks';
  setActiveResultTab: (tab: 'summary' | 'detailed' | 'risks') => void;
  effectivePackage: UserPackage;
  parseAnalysisResult: (text: string) => { summary: string; detailed: string };
  extractRiskScore: (text: string) => number;
  getRiskColor: (score: number) => string;
  getRiskLevel: (score: number) => string;
  riskScore?: number | null;
  legalCitations?: Array<{source: string; citation: string; relevance: number}>;
  canViewDetailedAnalysis: () => boolean;
  canDownload: () => boolean;
  canAccessLegislationDetails: () => boolean;
  handleDownloadPDF: () => void;
  handleDownloadWord: () => void;
  setShowLimitModal: (show: boolean) => void;
  detectLegislationReferences: (text: string) => Array<{match: string, law: string, article: string}>;
  fetchLegislationDetail: (law: string, article: string) => void;
  showLegislationModal: boolean;
  setShowLegislationModal: (show: boolean) => void;
  selectedLegislation: {title: string, content: string} | null;
  chatMessages: Array<{role: 'user' | 'assistant', content: string}>;
  chatInput: string;
  setChatInput: (input: string) => void;
  chatLoading: boolean;
  handleChatSend: () => void;
  ui: any;
  globalConflicts?: Array<{
    article: string;
    countryA: string;
    countryARule: string;
    countryB: string;
    countryBRule: string;
    riskScore: number;
  }>;
  isGlobalPackage?: boolean;
  legalReferences?: Array<{
    country: string;
    countryFlag: string;
    lawName: string;
    article: string;
    summary: string;
    isPrecedent: boolean;
    crossReference?: Array<{
      country: string;
      countryFlag: string;
      lawName: string;
      article: string;
    }>;
  }>;
  riskAssessments?: Array<{
    description: string;
    severity: number;
    countries?: string[];
    legalReference: string;
    isQuantumConflict: boolean;
  }>;
}

export default function AnalysisResult({
  result,
  gold,
  darkBlue,
  midBlue,
  lightText,
  language,
  activeResultTab,
  setActiveResultTab,
  effectivePackage,
  parseAnalysisResult,
  extractRiskScore,
  getRiskColor,
  getRiskLevel,
  riskScore: propRiskScore,
  legalCitations,
  canViewDetailedAnalysis,
  canDownload,
  canAccessLegislationDetails,
  handleDownloadPDF,
  handleDownloadWord,
  setShowLimitModal,
  detectLegislationReferences,
  fetchLegislationDetail,
  showLegislationModal,
  setShowLegislationModal,
  selectedLegislation,
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  handleChatSend,
  ui,
  globalConflicts = [],
  isGlobalPackage = false,
  legalReferences = [],
  riskAssessments = []
}: AnalysisResultProps) {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);

  if (!result) return null;

  const { summary, detailed } = parseAnalysisResult(result);

  return (
    <>
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
        <h3 style={{ color: gold, marginBottom: '20px', fontSize: '1.5rem' }}>{ui[language].resultTitle}</h3>
        
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '25px',
          borderBottom: `2px solid ${gold}33`
        }}>
          <button
            onClick={() => setActiveResultTab('summary')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: activeResultTab === 'summary' ? gold : lightText,
              border: 'none',
              borderBottom: activeResultTab === 'summary' ? `3px solid ${gold}` : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeResultTab === 'summary' ? 'bold' : 'normal',
              fontSize: '15px',
              transition: 'all 0.2s',
              opacity: activeResultTab === 'summary' ? 1 : 0.7
            }}
            onMouseEnter={(e) => {
              if (activeResultTab !== 'summary') {
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (activeResultTab !== 'summary') {
                e.currentTarget.style.opacity = '0.7';
              }
            }}
          >
            {language === 'TR' ? 'Yönetici Özeti' : 'Executive Summary'}
          </button>
          <button
            onClick={() => setActiveResultTab('detailed')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: activeResultTab === 'detailed' ? gold : lightText,
              border: 'none',
              borderBottom: activeResultTab === 'detailed' ? `3px solid ${gold}` : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: activeResultTab === 'detailed' ? 'bold' : 'normal',
              fontSize: '15px',
              transition: 'all 0.2s',
              opacity: activeResultTab === 'detailed' ? 1 : 0.7,
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (activeResultTab !== 'detailed') {
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (activeResultTab !== 'detailed') {
                e.currentTarget.style.opacity = '0.7';
              }
            }}
          >
            {language === 'TR' ? 'Ayrıntılı Analiz' : 'Detailed Analysis'}
            {!canViewDetailedAnalysis() && (
              <span style={{ 
                marginLeft: '8px', 
                fontSize: '12px',
                opacity: 0.8
              }}>🔒</span>
            )}
          </button>
          {riskAssessments && riskAssessments.length > 0 && (
            <button
              onClick={() => setActiveResultTab('risks')}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: activeResultTab === 'risks' ? gold : lightText,
                border: 'none',
                borderBottom: activeResultTab === 'risks' ? `3px solid ${gold}` : '3px solid transparent',
                cursor: 'pointer',
                fontWeight: activeResultTab === 'risks' ? 'bold' : 'normal',
                fontSize: '15px',
                transition: 'all 0.2s',
                opacity: activeResultTab === 'risks' ? 1 : 0.7,
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (activeResultTab !== 'risks') {
                  e.currentTarget.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                if (activeResultTab !== 'risks') {
                  e.currentTarget.style.opacity = '0.7';
                }
              }}
            >
              {language === 'TR' ? 'Hukuki Risk Analizi' : 'Legal Risk Analysis'}
              {riskAssessments.length > 0 && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '11px',
                  background: riskAssessments.some(r => r.severity >= 8) ? '#ef4444' : 
                              riskAssessments.some(r => r.severity >= 5) ? '#f97316' : '#fbbf24',
                  color: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 'bold'
                }}>
                  {riskAssessments.length}
                </span>
              )}
            </button>
          )}
        </div>

        <div style={{ minHeight: '200px' }}>
          {activeResultTab === 'summary' && (
            <div style={{ color: lightText, whiteSpace: 'pre-wrap', textAlign: 'left', lineHeight: '1.8' }}>
              {summary || result}
            </div>
          )}
          {activeResultTab === 'risks' && riskAssessments && riskAssessments.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Quantum Cross-Check Status */}
              <div style={{
                marginBottom: '30px',
                padding: '20px',
                background: `linear-gradient(135deg, ${midBlue}, ${darkBlue})`,
                borderRadius: '15px',
                border: `2px solid ${gold}44`,
                textAlign: 'center'
              }}>
                {isGlobalPackage ? (
                  <motion.div
                    animate={{
                      boxShadow: [
                        `0 0 20px ${gold}66`,
                        `0 0 30px ${gold}88`,
                        `0 0 20px ${gold}66`
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
                      borderRadius: '12px',
                      border: `2px solid ${gold}`,
                      marginBottom: '10px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      justifyContent: 'center'
                    }}>
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [1, 0.7, 1]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#4ade80',
                          boxShadow: `0 0 10px #4ade80`
                        }}
                      />
                      <span style={{
                        color: gold,
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}>
                        ⚛️ Quantum Cross-Check Status: ACTIVE
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <div style={{
                    padding: '12px 24px',
                    background: `${darkBlue}dd`,
                    borderRadius: '12px',
                    border: `2px solid ${gold}44`,
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      color: lightText,
                      fontSize: '0.9rem',
                      marginBottom: '15px',
                      opacity: 0.8
                    }}>
                      {language === 'TR' 
                        ? 'Çapraz Risk Analizi sadece Global paket kullanıcılarına özeldir.'
                        : 'Cross-Risk Analysis is exclusive to Global package users.'}
                    </div>
                    <Link href="/#pricing" style={{ textDecoration: 'none' }}>
                      <button
                        style={{
                          padding: '10px 20px',
                          background: gold,
                          color: darkBlue,
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = `0 4px 15px ${gold}66`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {language === 'TR' ? 'UPGRADE TO GLOBAL FOR CROSS-CHECK' : 'UPGRADE TO GLOBAL FOR CROSS-CHECK'}
                      </button>
                    </Link>
                  </div>
                )}
                <p style={{
                  color: lightText,
                  fontSize: '0.85rem',
                  marginTop: '15px',
                  opacity: 0.7,
                  lineHeight: '1.5'
                }}>
                  {language === 'TR'
                    ? 'Kuantum Cross-Risk analizi ile ülkeler arası hukuk çelişkilerini tespit ederek, uluslararası operasyonlarınızda %100 yasal güvenlik sağlayın.'
                    : 'Detect cross-jurisdictional legal conflicts with Quantum Cross-Risk analysis to ensure 100% legal security in your international operations.'}
                </p>
              </div>

              {/* Risk Cards */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
              }}>
                {riskAssessments.map((risk, idx) => {
                  const getRiskColor = (severity: number) => {
                    if (severity >= 8) return '#ef4444'; // Kırmızı
                    if (severity >= 5) return '#f97316'; // Turuncu
                    return '#fbbf24'; // Sarı
                  };
                  
                  const getRiskIcon = (severity: number) => {
                    if (severity >= 8) return '🔴';
                    if (severity >= 5) return '🟠';
                    return '🟡';
                  };
                  
                  const riskColor = getRiskColor(risk.severity);
                  const riskIcon = getRiskIcon(risk.severity);
                  
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      style={{
                        padding: '20px',
                        background: darkBlue,
                        borderRadius: '12px',
                        border: `2px solid ${riskColor}66`,
                        position: 'relative',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = riskColor;
                        e.currentTarget.style.background = `${darkBlue}dd`;
                        e.currentTarget.style.transform = 'translateX(5px)';
                        e.currentTarget.style.boxShadow = `0 4px 15px ${riskColor}44`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = `${riskColor}66`;
                        e.currentTarget.style.background = darkBlue;
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '15px'
                      }}>
                        <div style={{
                          fontSize: '2rem',
                          lineHeight: '1'
                        }}>
                          {risk.severity >= 8 ? (
                            <motion.span
                              animate={{
                                opacity: [1, 0.5, 1],
                                scale: [1, 1.1, 1]
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                              {riskIcon}
                            </motion.span>
                          ) : (
                            <span>{riskIcon}</span>
                          )}
                        </div>
                        <div style={{
                          flex: 1
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '10px',
                            flexWrap: 'wrap'
                          }}>
                            <h4 style={{
                              color: riskColor,
                              fontSize: '1.1rem',
                              fontWeight: 'bold',
                              margin: 0
                            }}>
                              {risk.description}
                            </h4>
                            {risk.isQuantumConflict && (
                              <motion.span
                                animate={{
                                  boxShadow: [
                                    `0 0 10px ${gold}66`,
                                    `0 0 20px ${gold}88`,
                                    `0 0 10px ${gold}66`
                                  ]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                                style={{
                                  background: `linear-gradient(135deg, ${gold}33, ${gold}22)`,
                                  color: gold,
                                  padding: '4px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  border: `1px solid ${gold}66`
                                }}
                              >
                                ⚛️ [Quantum Conflict Detected]
                              </motion.span>
                            )}
                            {!risk.isQuantumConflict && (
                              <span style={{
                                background: `${riskColor}22`,
                                color: riskColor,
                                padding: '4px 12px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}>
                                [Standard Risk]
                              </span>
                            )}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginLeft: 'auto'
                            }}>
                              <span style={{
                                color: riskColor,
                                fontSize: '1.5rem',
                                fontWeight: 'bold'
                              }}>
                                {risk.severity}
                              </span>
                              <span style={{
                                color: lightText,
                                fontSize: '0.9rem',
                                opacity: 0.7
                              }}>
                                /10
                              </span>
                            </div>
                          </div>
                          
                          {risk.countries && risk.countries.length > 0 && (
                            <div style={{
                              marginBottom: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap'
                            }}>
                              <span style={{
                                color: gold,
                                fontSize: '0.85rem',
                                fontWeight: '600'
                              }}>
                                {language === 'TR' ? 'Etkilenen Ülkeler:' : 'Affected Countries:'}
                              </span>
                              {risk.countries.map((country, cIdx) => (
                                <span key={cIdx} style={{
                                  background: `${gold}22`,
                                  color: gold,
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600'
                                }}>
                                  {country}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {risk.legalReference && (
                            <div style={{
                              marginTop: '12px',
                              padding: '12px',
                              background: `${gold}11`,
                              borderRadius: '8px',
                              border: `1px solid ${gold}22`
                            }}>
                              <div style={{
                                color: gold,
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                marginBottom: '6px'
                              }}>
                                {language === 'TR' ? '📚 Hukuki Referans:' : '📚 Legal Reference:'}
                              </div>
                              <div style={{
                                color: lightText,
                                fontSize: '0.9rem',
                                lineHeight: '1.6'
                              }}>
                                {risk.legalReference}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
          {activeResultTab === 'detailed' && (() => {
            const riskScore = extractRiskScore(result);
            const riskColor = getRiskColor(riskScore);
            const riskLevel = getRiskLevel(riskScore);
            const canViewDetailed = effectivePackage === 'professional' || effectivePackage === 'enterprise';
            
            return (
              <div style={{ position: 'relative' }}>
                <div style={{
                  marginBottom: '30px',
                  padding: '25px',
                  background: midBlue,
                  borderRadius: '15px',
                  border: `1px solid ${gold}44`,
                  filter: canViewDetailed ? 'none' : 'blur(8px)',
                  opacity: canViewDetailed ? 1 : 0.3,
                  pointerEvents: canViewDetailed ? 'auto' : 'none',
                  position: 'relative'
                }}>
                  <h4 style={{ 
                    color: gold, 
                    fontSize: '1.2rem', 
                    marginBottom: '20px',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {language === 'TR' ? 'Risk Skoru Değerlendirmesi' : 'Risk Assessment Score'}
                  </h4>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{
                      width: '100%',
                      height: '24px',
                      background: 'linear-gradient(90deg, #4ade80 0%, #fbbf24 50%, #f97316 75%, #ef4444 100%)',
                      borderRadius: '12px',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                      <div style={{
                        width: `${riskScore}%`,
                        height: '100%',
                        background: 'rgba(255,255,255,0.3)',
                        borderRadius: '12px',
                        transition: 'width 0.5s ease'
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: `${riskScore}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '32px',
                        height: '32px',
                        background: riskColor,
                        borderRadius: '50%',
                        border: '3px solid #ffffff',
                        boxShadow: `0 2px 8px ${riskColor}80`,
                        transition: 'left 0.5s ease'
                      }} />
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '15px'
                    }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ 
                          color: lightText, 
                          fontSize: '14px', 
                          opacity: 0.8,
                          marginBottom: '5px'
                        }}>
                          {language === 'TR' ? 'Risk Seviyesi' : 'Risk Level'}
                        </div>
                        <div style={{ 
                          color: riskColor, 
                          fontSize: '1.5rem', 
                          fontWeight: 'bold'
                        }}>
                          {riskLevel}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          color: lightText, 
                          fontSize: '14px', 
                          opacity: 0.8,
                          marginBottom: '5px'
                        }}>
                          {language === 'TR' ? 'Skor' : 'Score'}
                        </div>
                        <div style={{ 
                          color: riskColor, 
                          fontSize: '2rem', 
                          fontWeight: 'bold'
                        }}>
                          {riskScore}
                          <span style={{ fontSize: '1rem', opacity: 0.7 }}>/100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Global Conflict Map - Sadece Global Paket için */}
                {isGlobalPackage && globalConflicts && globalConflicts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    style={{
                      marginTop: '30px',
                      padding: '30px',
                      background: `linear-gradient(135deg, ${midBlue}, ${darkBlue})`,
                      borderRadius: '20px',
                      border: `3px solid ${gold}`,
                      boxShadow: `0 0 30px ${gold}66, inset 0 0 20px ${gold}22`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Quantum Global Feature Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      right: '15px',
                      background: `linear-gradient(135deg, ${gold}, #d4b877)`,
                      color: '#000000',
                      padding: '6px 15px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      boxShadow: `0 2px 10px ${gold}88`
                    }}>
                      ⚛️ Quantum Global Feature
                    </div>
                    
                    <h4 style={{ 
                      color: gold, 
                      fontSize: '1.5rem', 
                      marginBottom: '25px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      textShadow: `0 0 10px ${gold}66`
                    }}>
                      {language === 'TR' ? '🌍 Global Conflict Map' : '🌍 Global Conflict Map'}
                    </h4>
                    
                    <div style={{
                      overflowX: 'auto',
                      marginTop: '20px'
                    }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        background: darkBlue,
                        borderRadius: '10px',
                        overflow: 'hidden'
                      }}>
                        <thead>
                          <tr style={{
                            background: `linear-gradient(135deg, ${gold}33, ${gold}22)`,
                            borderBottom: `2px solid ${gold}`
                          }}>
                            <th style={{
                              padding: '15px',
                              textAlign: 'left',
                              color: gold,
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              borderRight: `1px solid ${gold}44`
                            }}>
                              {language === 'TR' ? 'Madde' : 'Article/Clause'}
                            </th>
                            <th style={{
                              padding: '15px',
                              textAlign: 'left',
                              color: gold,
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              borderRight: `1px solid ${gold}44`
                            }}>
                              {language === 'TR' ? 'Ülke A Kuralı' : 'Country A Rule'}
                            </th>
                            <th style={{
                              padding: '15px',
                              textAlign: 'left',
                              color: gold,
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              borderRight: `1px solid ${gold}44`
                            }}>
                              {language === 'TR' ? 'Ülke B Kuralı' : 'Country B Rule'}
                            </th>
                            <th style={{
                              padding: '15px',
                              textAlign: 'center',
                              color: gold,
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}>
                              {language === 'TR' ? 'Risk Skoru' : 'Risk Score'}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {globalConflicts.map((conflict, idx) => {
                            const riskColor = conflict.riskScore >= 80 ? '#ef4444' : 
                                             conflict.riskScore >= 60 ? '#f97316' : 
                                             conflict.riskScore >= 40 ? '#fbbf24' : '#4ade80';
                            return (
                              <motion.tr
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                style={{
                                  borderBottom: `1px solid ${gold}22`,
                                  transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = `${gold}11`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <td style={{
                                  padding: '15px',
                                  color: lightText,
                                  fontSize: '0.9rem',
                                  borderRight: `1px solid ${gold}22`,
                                  fontWeight: '600'
                                }}>
                                  {conflict.article}
                                </td>
                                <td style={{
                                  padding: '15px',
                                  color: lightText,
                                  fontSize: '0.85rem',
                                  borderRight: `1px solid ${gold}22`,
                                  lineHeight: '1.6'
                                }}>
                                  <div style={{ 
                                    color: gold, 
                                    fontWeight: 'bold', 
                                    marginBottom: '4px',
                                    fontSize: '0.8rem'
                                  }}>
                                    {conflict.countryA}
                                  </div>
                                  {conflict.countryARule}
                                </td>
                                <td style={{
                                  padding: '15px',
                                  color: lightText,
                                  fontSize: '0.85rem',
                                  borderRight: `1px solid ${gold}22`,
                                  lineHeight: '1.6'
                                }}>
                                  <div style={{ 
                                    color: gold, 
                                    fontWeight: 'bold', 
                                    marginBottom: '4px',
                                    fontSize: '0.8rem'
                                  }}>
                                    {conflict.countryB}
                                  </div>
                                  {conflict.countryBRule}
                                </td>
                                <td style={{
                                  padding: '15px',
                                  textAlign: 'center'
                                }}>
                                  <div style={{
                                    display: 'inline-block',
                                    padding: '8px 16px',
                                    background: `${riskColor}22`,
                                    color: riskColor,
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    border: `2px solid ${riskColor}44`,
                                    boxShadow: `0 0 10px ${riskColor}33`
                                  }}>
                                    {conflict.riskScore}
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {globalConflicts.length === 0 && (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: lightText,
                        opacity: 0.7,
                        fontSize: '1rem'
                      }}>
                        {language === 'TR' 
                          ? 'Bu belgede çapraz hukuk çelişkisi tespit edilmedi.'
                          : 'No cross-jurisdictional conflicts detected in this document.'
                        }
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Legal References & Bibliography Section */}
                {legalReferences && legalReferences.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    style={{
                      marginTop: '40px',
                      padding: '30px',
                      background: `linear-gradient(135deg, ${midBlue}, ${darkBlue})`,
                      borderRadius: '20px',
                      border: `2px solid ${gold}44`,
                      position: 'relative'
                    }}
                  >
                    <h4 style={{
                      color: gold,
                      fontSize: '1.5rem',
                      marginBottom: '25px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}>
                      <span>📚</span>
                      <span>{language === 'TR' ? 'Hukuki Referanslar ve Kaynakça' : 'Legal Citations & Bibliography'}</span>
                    </h4>
                    
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '15px'
                    }}>
                      {legalReferences.map((ref, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          style={{
                            padding: '18px',
                            background: darkBlue,
                            borderRadius: '12px',
                            border: `1px solid ${gold}33`,
                            transition: 'all 0.3s',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = gold;
                            e.currentTarget.style.background = `${darkBlue}dd`;
                            e.currentTarget.style.transform = 'translateX(5px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = gold + '33';
                            e.currentTarget.style.background = darkBlue;
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{
                              fontSize: '1.8rem',
                              lineHeight: '1'
                            }}>
                              {ref.countryFlag}
                            </div>
                            <div style={{
                              flex: 1,
                              minWidth: '200px'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '6px',
                                flexWrap: 'wrap'
                              }}>
                                <span style={{
                                  color: gold,
                                  fontWeight: 'bold',
                                  fontSize: '1rem'
                                }}>
                                  {ref.lawName}
                                </span>
                                {ref.article && (
                                  <>
                                    <span style={{ color: lightText, opacity: 0.7 }}>-</span>
                                    <span style={{
                                      color: gold,
                                      fontSize: '0.9rem',
                                      fontWeight: '600'
                                    }}>
                                      {ref.article.includes('Madde') ? ref.article : 
                                       ref.article.includes('§') ? ref.article :
                                       ref.article.includes('s.') ? ref.article :
                                       `Madde ${ref.article}`}
                                    </span>
                                  </>
                                )}
                                {ref.isPrecedent && (
                                  <span style={{
                                    background: `${gold}33`,
                                    color: gold,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600'
                                  }}>
                                    {language === 'TR' ? 'Emsal Karar' : 'Precedent'}
                                  </span>
                                )}
                                <div style={{
                                  position: 'relative',
                                  display: 'inline-block'
                                }}>
                                  <span style={{
                                    color: '#4ade80',
                                    fontSize: '1rem',
                                    cursor: 'help'
                                  }}
                                  title={language === 'TR' 
                                    ? 'Veritas Quantum Database tarafından doğrulandı'
                                    : 'Verified by Veritas Quantum Database'}
                                  >
                                    ✓
                                  </span>
                                </div>
                              </div>
                              <div style={{
                                color: lightText,
                                fontSize: '0.9rem',
                                lineHeight: '1.6',
                                opacity: 0.9
                              }}>
                                {ref.summary}
                              </div>
                              
                              {/* Cross-Reference (Global Paket için) */}
                              {isGlobalPackage && ref.crossReference && ref.crossReference.length > 0 && (
                                <div style={{
                                  marginTop: '12px',
                                  padding: '12px',
                                  background: `${gold}11`,
                                  borderRadius: '8px',
                                  border: `1px solid ${gold}22`
                                }}>
                                  <div style={{
                                    color: gold,
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    marginBottom: '8px',
                                    opacity: 0.9
                                  }}>
                                    {language === 'TR' ? '🔗 Çapraz Referans' : '🔗 Cross-Reference'}
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                  }}>
                                    {ref.crossReference.map((crossRef, crossIdx) => (
                                      <div key={crossIdx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.85rem',
                                        color: lightText,
                                        opacity: 0.8
                                      }}>
                                        <span>{crossRef.countryFlag}</span>
                                        <span style={{ fontWeight: '600' }}>{crossRef.lawName}</span>
                                        {crossRef.article && (
                                          <>
                                            <span>-</span>
                                            <span>{crossRef.article}</span>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Legal Citations Visualization */}
                {legalCitations && legalCitations.length > 0 && (
                  <div style={{
                    marginTop: '30px',
                    padding: '25px',
                    background: midBlue,
                    borderRadius: '15px',
                    border: `1px solid ${gold}44`
                  }}>
                    <h4 style={{ 
                      color: gold, 
                      fontSize: '1.2rem', 
                      marginBottom: '20px',
                      fontWeight: 'bold'
                    }}>
                      {language === 'TR' ? '📚 İlgili Hukuki Kaynaklar' : '📚 Legal Citations'}
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '15px'
                    }}>
                      {legalCitations.slice(0, 6).map((citation, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '15px',
                            background: darkBlue,
                            borderRadius: '10px',
                            border: `1px solid ${gold}33`,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = gold;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = gold + '33';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <div style={{
                            color: gold,
                            fontSize: '12px',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            opacity: 0.8
                          }}>
                            {citation.source}
                          </div>
                          <div style={{
                            color: lightText,
                            fontSize: '14px',
                            lineHeight: '1.6'
                          }}>
                            {citation.citation}
                          </div>
                          <div style={{
                            marginTop: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <div style={{
                              width: '60px',
                              height: '4px',
                              background: darkBlue,
                              borderRadius: '2px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${citation.relevance * 100}%`,
                                height: '100%',
                                background: gold,
                                transition: 'width 0.3s'
                              }} />
                            </div>
                            <span style={{
                              color: lightText,
                              fontSize: '12px',
                              opacity: 0.7
                            }}>
                              {Math.round(citation.relevance * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ 
                  color: lightText, 
                  whiteSpace: 'pre-wrap', 
                  textAlign: 'left', 
                  lineHeight: '1.8',
                  filter: canViewDetailed ? 'none' : 'blur(8px)',
                  opacity: canViewDetailed ? 1 : 0.3,
                  userSelect: canViewDetailed ? 'auto' : 'none',
                  pointerEvents: canViewDetailed ? 'auto' : 'none'
                }}>
                  {(() => {
                    const content = detailed || result;
                    const references = detectLegislationReferences(content);
                    
                    let highlightedContent = content;
                    const uniqueRefs = Array.from(new Map(references.map(ref => [ref.match, ref])).values());
                    
                    uniqueRefs.forEach(ref => {
                      const escapedMatch = ref.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      const regex = new RegExp(`(${escapedMatch})`, 'gi');
                      highlightedContent = highlightedContent.replace(regex, (match) => {
                        if (canAccessLegislationDetails()) {
                          return `<span style="color: ${gold}; font-weight: bold; cursor: pointer; text-decoration: underline; border-bottom: 1px dotted ${gold};" data-law="${ref.law}" data-article="${ref.article}">${match}</span>`;
                        }
                        return `<span style="color: ${gold}; font-weight: bold;">${match}</span>`;
                      });
                    });
                    
                    return (
                      <div 
                        dangerouslySetInnerHTML={{ __html: highlightedContent.replace(/\n/g, '<br>') }}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.dataset.law && target.dataset.article && canAccessLegislationDetails()) {
                            fetchLegislationDetail(target.dataset.law, target.dataset.article);
                          }
                        }}
                      />
                    );
                  })()}
                </div>
                
                {!canViewDetailed && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(24, 35, 50, 0.95)',
                    border: `2px solid ${gold}`,
                    borderRadius: '15px',
                    padding: '40px',
                    textAlign: 'center',
                    zIndex: 10,
                    maxWidth: '500px',
                    width: '90%',
                    boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
                    <h3 style={{ color: gold, fontSize: '1.5rem', marginBottom: '15px', fontWeight: 'bold' }}>
                      {language === 'TR' ? 'Ayrıntılı Risk Raporu' : 'Detailed Risk Report'}
                    </h3>
                    <p style={{ color: lightText, fontSize: '1rem', lineHeight: '1.6', marginBottom: '30px' }}>
                      {language === 'TR' 
                        ? 'Ayrıntılı risk analizi ve madde incelemeleri için Professional pakete geçin.'
                        : 'Upgrade to Professional package for detailed risk analysis and article reviews.'
                      }
                    </p>
                    <Link href="/#pricing" style={{ textDecoration: 'none' }}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (window.location.pathname !== '/') {
                            router.push('/#pricing');
                            setTimeout(() => {
                              window.location.href = '/#pricing';
                            }, 100);
                          } else {
                            router.push('/#pricing');
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
                          padding: '15px 35px',
                          background: '#ffffff',
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          border: 'none',
                          borderRadius: '50px',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          boxShadow: `0 4px 12px rgba(255, 255, 255, 0.3)`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.setProperty('background-color', '#f5f5f5', 'important');
                          e.currentTarget.style.setProperty('background', '#f5f5f5', 'important');
                          e.currentTarget.style.boxShadow = `0 6px 16px rgba(255, 255, 255, 0.5)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.setProperty('background-color', '#ffffff', 'important');
                          e.currentTarget.style.setProperty('background', '#ffffff', 'important');
                          e.currentTarget.style.boxShadow = `0 4px 12px rgba(255, 255, 255, 0.3)`;
                        }}
                      >
                        <span style={{ color: '#000000', fontWeight: 'bold' }}>{language === 'TR' ? 'Paketi Yükselt' : 'Upgrade Plan'}</span>
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          marginTop: '25px',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={canDownload() ? handleDownloadPDF : () => setShowLimitModal(true)}
            disabled={!canDownload()}
            style={{ 
              background: canDownload() ? '#dc3545' : '#666666', 
              color: '#ffffff', 
              padding: '12px 25px', 
              borderRadius: '10px', 
              border: 'none', 
              fontWeight: 'bold', 
              cursor: canDownload() ? 'pointer' : 'not-allowed',
              flex: '1',
              minWidth: '150px',
              opacity: canDownload() ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (canDownload()) {
                e.currentTarget.style.background = '#c82333';
              }
            }}
            onMouseLeave={(e) => {
              if (canDownload()) {
                e.currentTarget.style.background = '#dc3545';
              }
            }}
            title={!canDownload() ? (language === 'TR' ? 'İndirme özelliği için Professional veya Enterprise paketi gereklidir' : 'Download feature requires Professional or Enterprise package') : ''}
          >
            <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {!canDownload() && <span>🔒</span>}
              {ui[language].download}
            </span>
          </button>
          <button 
            onClick={canDownload() ? handleDownloadWord : () => setShowLimitModal(true)}
            disabled={!canDownload()}
            style={{ 
              background: canDownload() ? '#2b579a' : '#666666', 
              color: '#ffffff', 
              padding: '12px 25px', 
              borderRadius: '10px', 
              border: 'none', 
              fontWeight: 'bold', 
              cursor: canDownload() ? 'pointer' : 'not-allowed',
              flex: '1',
              minWidth: '150px',
              opacity: canDownload() ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (canDownload()) {
                e.currentTarget.style.background = '#1e3f6f';
              }
            }}
            onMouseLeave={(e) => {
              if (canDownload()) {
                e.currentTarget.style.background = '#2b579a';
              }
            }}
            title={!canDownload() ? (language === 'TR' ? 'İndirme özelliği için Professional veya Enterprise paketi gereklidir' : 'Download feature requires Professional or Enterprise package') : ''}
          >
            <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {!canDownload() && <span>🔒</span>}
              {ui[language].downloadWord || 'Word İndir'}
            </span>
          </button>
        </div>

        {/* Legal Disclaimer */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: `${darkBlue}dd`,
          borderRadius: '12px',
          border: `1px solid ${gold}22`,
          borderLeft: `4px solid ${gold}66`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <span style={{
              fontSize: '1.2rem',
              lineHeight: '1.2'
            }}>
              ⚠️
            </span>
            <div style={{
              flex: 1,
              color: lightText,
              fontSize: '0.85rem',
              lineHeight: '1.6',
              fontStyle: 'italic',
              opacity: 0.85
            }}>
              <strong style={{ color: gold, fontStyle: 'normal' }}>
                {language === 'TR' ? 'Yasal Uyarı:' : 'Legal Disclaimer:'}
              </strong>{' '}
              {language === 'TR' 
                ? 'Veritas Q-AI, yapay zeka tabanlı bir analiz aracıdır. Sunulan raporlar ve analizler yalnızca bilgilendirme ve risk değerlendirme amaçlı olup, hukuki tavsiye niteliği taşımaz. Sistemimiz, yetkili bir avukatın profesyonel görüşünün yerini almaz. Kuantum-AI mantığı ile en yüksek doğruluk hedeflense de, hukuki yorumlar farklılık gösterebilir. Veritas Q-AI ve işletmecileri, bu analizlere dayanılarak alınan kararlardan sorumlu tutulamaz.'
                : 'Veritas Q-AI is an artificial intelligence-based analysis tool. The reports and insights provided are for informational and risk-assessment purposes only and do not constitute legal advice. Our system does not replace the professional judgment of a qualified lawyer. While we strive for 100% accuracy using Quantum-AI logic, legal interpretations may vary. Veritas Q-AI and its operators are not liable for any decisions made based on this analysis.'}
            </div>
          </div>
        </div>
      </div>
      
      {showLegislationModal && selectedLegislation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}
        onClick={() => setShowLegislationModal(false)}
        >
          <div style={{
            background: midBlue,
            border: `2px solid ${gold}`,
            borderRadius: '15px',
            padding: '30px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: `0 8px 24px rgba(0,0,0,0.5)`
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: gold, fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                {selectedLegislation.title}
              </h3>
              <button
                onClick={() => setShowLegislationModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: lightText,
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              color: lightText,
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
              fontSize: '14px'
            }}>
              {selectedLegislation.content}
            </div>
          </div>
        </div>
      )}

      {(effectivePackage === 'professional' || effectivePackage === 'enterprise') && (
        <div style={{
          marginTop: '30px',
          background: midBlue,
          padding: '25px',
          borderRadius: '15px',
          border: `1px solid ${gold}44`
        }}>
          <h4 style={{ color: gold, fontSize: '1.2rem', marginBottom: '20px', fontWeight: 'bold' }}>
            {language === 'TR' ? '💬 Dosyaya Soru Sor' : '💬 Ask About Document'}
          </h4>
          
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            marginBottom: '15px',
            padding: '15px',
            background: darkBlue,
            borderRadius: '10px',
            minHeight: '150px'
          }}>
            {chatMessages.length === 0 ? (
              <div style={{ color: lightText, opacity: 0.7, textAlign: 'center', padding: '20px' }}>
                {language === 'TR' 
                  ? 'Dosya hakkında soru sorun...'
                  : 'Ask a question about the document...'}
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: '15px',
                    padding: '12px',
                    background: msg.role === 'user' ? `rgba(199, 176, 121, 0.2)` : 'transparent',
                    borderRadius: '8px',
                    textAlign: msg.role === 'user' ? 'right' : 'left'
                  }}
                >
                  <div style={{
                    color: msg.role === 'user' ? gold : lightText,
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6'
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSend();
                }
              }}
              placeholder={language === 'TR' ? 'Sorunuzu yazın...' : 'Type your question...'}
              style={{
                flex: 1,
                padding: '12px 15px',
                background: darkBlue,
                border: `1px solid ${gold}44`,
                borderRadius: '8px',
                color: lightText,
                fontSize: '14px'
              }}
              disabled={chatLoading}
            />
            <button
              onClick={handleChatSend}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                padding: '12px 25px',
                background: chatLoading || !chatInput.trim() ? '#666666' : gold,
                color: darkBlue,
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                opacity: chatLoading || !chatInput.trim() ? 0.6 : 1
              }}
            >
              {chatLoading ? '...' : '→'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}




