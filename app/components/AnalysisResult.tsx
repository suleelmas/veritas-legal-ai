"use client";
import React from 'react';

interface Reference {
  law?: string;
  section?: string;
  country?: string;
  text?: string;
}

interface AnalysisResultProps {
  data: any; // JSON verisi
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

export default function AnalysisResult({ data }: AnalysisResultProps) {
  // JSON verisinden references dizisini çıkar
  let references: (string | Reference)[] = [];
  
  if (data) {
    // Eğer data bir string ise JSON parse et
    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        // JSON değilse, string içinde references aramaya çalış
        const refMatch = data.match(/references?[:\s]*\[(.*?)\]/is);
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
      if (Array.isArray(parsedData.references)) {
        references = parsedData.references;
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
  
  // Eğer references yoksa, hiçbir şey gösterme
  if (!references || references.length === 0) {
    return null;
  }
  
  const gold = "#c7b079";
  const darkBlue = "#182332";
  const midBlue = "#232d3c";
  
  return (
    <div style={{
      marginTop: '60px',
      padding: '40px',
      background: midBlue,
      borderRadius: '20px',
      border: `2px solid ${gold}44`,
    }}>
      <h2 style={{
        color: gold,
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
                background: darkBlue,
                borderRadius: '12px',
                border: `1px solid ${gold}33`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = gold;
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${gold}33`;
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <span style={{ fontSize: '2rem' }}>{flag}</span>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    color: gold,
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
                        background: `${gold}22`,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${gold}44`,
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
  );
}
