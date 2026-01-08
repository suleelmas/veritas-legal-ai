"use client";
import React from 'react';

type UserPackage = "free" | "basic" | "professional" | "enterprise" | "quantum_global" | null;

interface Reference {
  law?: string;
  section?: string;
  country?: string;
  text?: string;
}

interface AnalysisResultProps {
  data?: any; // JSON verisi (eski format için)
  result?: string;
  gold?: string;
  darkBlue?: string;
  midBlue?: string;
  lightText?: string;
  language?: string;
  activeResultTab?: 'summary' | 'detailed' | 'risks';
  setActiveResultTab?: (tab: 'summary' | 'detailed' | 'risks') => void;
  effectivePackage?: UserPackage;
  isAdmin?: boolean;
  parseAnalysisResult?: (text: string) => { summary: string; detailed: string };
  extractRiskScore?: (text: string) => number;
  getRiskColor?: (score: number) => string;
  getRiskLevel?: (score: number) => string;
  riskScore?: number | null;
  legalCitations?: Array<{source: string; citation: string; relevance: number}>;
  canViewDetailedAnalysis?: () => boolean;
  canDownload?: () => boolean;
  canAccessLegislationDetails?: () => boolean;
  handleDownloadPDF?: () => Promise<void>;
  handleDownloadWord?: () => void;
  setShowLimitModal?: (show: boolean) => void;
  detectLegislationReferences?: (text: string) => Array<{match: string; law: string; article: string}>;
  fetchLegislationDetail?: (law: string, article: string) => void;
  showLegislationModal?: boolean;
  setShowLegislationModal?: (show: boolean) => void;
  selectedLegislation?: {title: string; content: string} | null;
  chatMessages?: Array<{role: 'user' | 'assistant'; content: string}>;
  chatInput?: string;
  setChatInput?: (input: string) => void;
  chatLoading?: boolean;
  handleChatSend?: () => Promise<void>;
  ui?: any;
  globalConflicts?: Array<{
    article: string;
    [key: string]: any;
  }>;
  isGlobalPackage?: boolean;
  legalReferences?: Array<{
    country: string;
    [key: string]: any;
  }>;
  riskAssessments?: Array<{
    description: string;
    [key: string]: any;
  }>;
}

// Ülke kodlarına göre bayrak emojileri
const getCountryFlag = (lawCode: string, country?: string): string => {
  if (country) {
    const countryMap: { [key: string]: string } = {
      'TR': '🇹🇷',
      'DE': '🇩🇪',
      'US': '🇺🇸',
      'UK': '🇬🇧',
      'GB': '🇬🇧',
      'FR': '🇫🇷',
      'IT': '🇮🇹',
      'ES': '🇪🇸',
    };
    return countryMap[country.toUpperCase()] || '📜';
  }
  
  // Kanun koduna göre tahmin
  const law = lawCode.toUpperCase();
  if (law.includes('BGB') || law.includes('HGB') || law.includes('AKTG') || law.includes('STGB')) {
    return '🇩🇪';
  }
  if (law.includes('UCC') || law.includes('SCOTUS') || law.includes('FEDERAL')) {
    return '🇺🇸';
  }
  if (law.includes('KVKK') || law.includes('TBK') || law.includes('HMK') || law.includes('İİK')) {
    return '🇹🇷';
  }
  if (law.includes('UK') || law.includes('GB')) {
    return '🇬🇧';
  }
  
  return '📜';
};

// Referans metnini parse et
const parseReference = (ref: string | Reference): Reference => {
  if (typeof ref === 'string') {
    // String formatı: "BGB § 433" veya "KVKK m.8" veya "UCC § 2-201"
    const sectionMatch = ref.match(/(?:§|m\.|Section|Art\.)\s*([0-9\-]+)/i);
    const lawMatch = ref.match(/([A-Z]{2,}(?:\s+[A-Z]+)?)/);
    
    return {
      law: lawMatch ? lawMatch[1] : ref,
      section: sectionMatch ? sectionMatch[1] : undefined,
      text: ref,
    };
  }
  return ref;
};

export default function AnalysisResult({ data, result, gold, darkBlue, midBlue, lightText }: AnalysisResultProps) {
  // Önce result prop'unu kontrol et (ana analiz metni)
  const displayResult = result || data;
  
  // JSON verisinden references dizisini çıkar
  let references: (string | Reference)[] = [];
  
  // result veya data'dan references çıkar
  const sourceData = result || data;
  
  if (sourceData) {
    // Eğer sourceData bir string ise JSON parse et
    let parsedData = sourceData;
    if (typeof sourceData === 'string') {
      try {
        parsedData = JSON.parse(sourceData);
      } catch (e) {
        // JSON değilse, string içinde references aramaya çalış
        const refMatch = sourceData.match(/references?[:\s]*\[(.*?)\]/is);
        if (refMatch) {
          try {
            const refStr = '[' + refMatch[1] + ']';
            references = JSON.parse(refStr);
          } catch (e) {
            // Parse edilemezse boş bırak
          }
        }
      }
    }
    
    // Parsed data'dan references al
    if (parsedData && typeof parsedData === 'object') {
      if (parsedData.references && typeof parsedData.references === 'object') {
        // references bir obje ise, içindeki array'leri birleştir
        if (Array.isArray(parsedData.references)) {
          references = parsedData.references;
        } else {
          // Obje ise, tüm array değerlerini birleştir
          Object.values(parsedData.references).forEach((refArray: any) => {
            if (Array.isArray(refArray)) {
              references = references.concat(refArray);
            }
          });
        }
      } else if (Array.isArray(parsedData.reference)) {
        references = parsedData.reference;
      } else if (parsedData.references && typeof parsedData.references === 'string') {
        try {
          references = JSON.parse(parsedData.references);
        } catch (e) {
          // Parse edilemezse boş bırak
        }
      }
    }
  }
  
  const goldColor = gold || "#c7b079";
  const darkBlueColor = darkBlue || "#182332";
  const midBlueColor = midBlue || "#232d3c";
  const lightTextColor = lightText || "#ffffff";
  
  // Ana analiz metnini göster (result prop'u varsa)
  return (
    <div className="block min-h-[200px]" style={{ marginTop: '60px' }}>
      {/* Ana Analiz Sonucu */}
      {displayResult && (
        <div style={{
          padding: '40px',
          background: midBlueColor,
          borderRadius: '20px',
          border: `2px solid ${goldColor}44`,
          marginBottom: references.length > 0 ? '40px' : '0',
        }}>
          <h2 style={{
            color: goldColor,
            fontSize: '1.8rem',
            fontWeight: 'bold',
            marginBottom: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span>📊</span>
            <span>Analiz Sonucu</span>
          </h2>
          
          <div 
            className="block min-h-[200px] text-black"
            style={{
              color: lightTextColor,
              fontSize: '1rem',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              padding: '20px',
              background: darkBlueColor,
              borderRadius: '12px',
              border: `1px solid ${goldColor}33`,
            }}
          >
            {typeof displayResult === 'string' ? displayResult : JSON.stringify(displayResult, null, 2)}
          </div>
        </div>
      )}
      
      {/* Hukuki Referanslar (eğer varsa) */}
      {references && references.length > 0 && (
  
        <div style={{
          padding: '40px',
          background: midBlueColor,
          borderRadius: '20px',
          border: `2px solid ${goldColor}44`,
        }}>
          <h2 style={{
            color: goldColor,
            fontSize: '1.8rem',
            fontWeight: 'bold',
            marginBottom: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span>📚</span>
            <span>Hukuki Referanslar</span>
          </h2>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {references.map((ref, index) => {
          const parsed = parseReference(ref);
          const lawCode = parsed.law || parsed.text || String(ref);
          const section = parsed.section;
          const country = parsed.country;
          const flag = getCountryFlag(lawCode, country);
          
          return (
            <div
              key={index}
              style={{
                padding: '20px',
                background: darkBlueColor,
                borderRadius: '12px',
                border: `1px solid ${goldColor}33`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = goldColor;
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${goldColor}33`;
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <span style={{ fontSize: '2rem' }}>{flag}</span>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    color: goldColor,
                    fontSize: '1.3rem',
                    fontWeight: 'bold',
                  }}>
                    {lawCode}
                  </span>
                  
                  {section && (
                    <>
                      <span style={{ color: '#888', fontSize: '1.1rem' }}>•</span>
                      <span style={{
                        color: 'white',
                        fontSize: '1.2rem',
                        fontWeight: '900',
                        background: `${goldColor}22`,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${goldColor}44`,
                      }}>
                        {section.includes('-') ? `§§ ${section}` : `§ ${section}`}
                      </span>
                    </>
                  )}
                </div>
                
                {parsed.text && parsed.text !== lawCode && (
                  <div style={{
                    color: '#aaa',
                    fontSize: '0.9rem',
                    marginTop: '6px',
                    fontStyle: 'italic',
                  }}>
                    {parsed.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
      )}
    </div>
  );
}
