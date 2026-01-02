"use client";
import React, { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type UserPackage = "free" | "basic" | "professional" | "enterprise" | null;

interface AnalysisResultProps {
  result: string;
  gold: string;
  darkBlue: string;
  midBlue: string;
  lightText: string;
  language: string;
  activeResultTab: 'summary' | 'detailed';
  setActiveResultTab: (tab: 'summary' | 'detailed') => void;
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
  ui
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
        </div>

        <div style={{ minHeight: '200px' }}>
          {activeResultTab === 'summary' && (
            <div style={{ color: lightText, whiteSpace: 'pre-wrap', textAlign: 'left', lineHeight: '1.8' }}>
              {summary || result}
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




