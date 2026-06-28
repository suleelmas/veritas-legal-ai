"use client";
import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

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

// Severity'ye göre renk döndür
const getSeverityColor = (severity: string): string => {
  const sev = severity?.toLowerCase() || '';
  if (sev.includes('high') || sev.includes('yüksek') || sev.includes('kritik') || sev.includes('critical')) {
    return '#ef4444'; // Kırmızı
  }
  if (sev.includes('medium') || sev.includes('orta')) {
    return '#f97316'; // Turuncu
  }
  if (sev.includes('low') || sev.includes('düşük')) {
    return '#3b82f6'; // Mavi
  }
  return '#6b7280'; // Varsayılan gri
};

// Severity'ye göre badge rengi
const getSeverityBadgeColor = (severity: string): string => {
  const sev = severity?.toLowerCase() || '';
  if (sev.includes('high') || sev.includes('yüksek') || sev.includes('kritik') || sev.includes('critical')) {
    return 'rgba(239, 68, 68, 0.2)'; // Kırmızı arka plan
  }
  if (sev.includes('medium') || sev.includes('orta')) {
    return 'rgba(249, 115, 22, 0.2)'; // Turuncu arka plan
  }
  if (sev.includes('low') || sev.includes('düşük')) {
    return 'rgba(59, 130, 246, 0.2)'; // Mavi arka plan
  }
  return 'rgba(107, 114, 128, 0.2)'; // Varsayılan gri
};

export default function AnalysisResult({ 
  data, 
  result, 
  gold, 
  darkBlue, 
  midBlue, 
  lightText, 
  language = 'TR', 
  effectivePackage, 
  handleDownloadPDF, 
  isAdmin,
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  handleChatSend,
  activeResultTab,
  setActiveResultTab,
  parseAnalysisResult,
  extractRiskScore,
  getRiskColor,
  getRiskLevel,
  riskScore,
  legalCitations,
  canViewDetailedAnalysis,
  canDownload,
  canAccessLegislationDetails,
  handleDownloadWord,
  setShowLimitModal,
  detectLegislationReferences,
  fetchLegislationDetail,
  showLegislationModal,
  setShowLegislationModal,
  selectedLegislation,
  ui,
  globalConflicts,
  isGlobalPackage,
  legalReferences,
  riskAssessments
}: AnalysisResultProps) {
  // Önce result prop'unu kontrol et (ana analiz metni)
  const displayResult = result || data;
  
  // JSON verisini parse et
  let parsedData: any = null;
  let isJson = false;
  
  if (displayResult) {
    if (typeof displayResult === 'string') {
      try {
        parsedData = JSON.parse(displayResult);
        isJson = true;
      } catch (e) {
        // JSON değilse, string içinde JSON aramaya çalış
        const jsonStart = displayResult.indexOf('{');
        const jsonEnd = displayResult.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          try {
            parsedData = JSON.parse(displayResult.substring(jsonStart, jsonEnd));
            isJson = true;
          } catch (e2) {
            // Parse edilemezse ham string olarak kullan
            parsedData = null;
          }
        }
      }
    } else if (typeof displayResult === 'object') {
      parsedData = displayResult;
      isJson = true;
    }
  }
  
  // JSON verisinden references dizisini çıkar
  let references: (string | Reference)[] = [];
  
  if (parsedData && isJson) {
    if (parsedData.references && typeof parsedData.references === 'object') {
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
  
  const goldColor = gold || "#c7b079";
  const darkBlueColor = darkBlue || "#182332";
  const midBlueColor = midBlue || "#232d3c";
  const lightTextColor = lightText || "#ffffff";
  
  // Dil çevirileri
  const translations: any = {
    TR: {
      summary: "Kapsamlı Özet",
      riskAnalysis: "Hukuki Risk Analizi",
      legalOpinion: "Hukuki Görüş",
      actionPlan: "Eylem Planı",
      complianceStatus: "Uyumluluk Durumu",
      legalReferences: "Hukuki Referanslar",
      documentType: "Belge Türü",
      parties: "Taraflar",
      applicableLaws: "Uygulanabilir Yasal Düzenlemeler",
      severity: "Şiddet",
      probability: "Olasılık",
      impact: "Etki",
      urgency: "Aciliyet",
      potentialConsequences: "Potansiyel Sonuçlar",
      mitigationSuggestions: "Azaltma Önerileri",
      affectedArticles: "Etkilenen Maddeler",
      priority: "Öncelik",
      action: "Eylem",
      legalBasis: "Yasal Dayanak",
      deadline: "Zamanlama",
      responsibleParty: "Sorumlu Taraf",
      implementationSteps: "Uygulama Adımları",
      estimatedCost: "Tahmini Maliyet",
      expectedOutcome: "Beklenen Sonuç",
      validity: "Geçerlilik",
      enforceability: "Uygulanabilirlik",
      recommendations: "Öneriler",
      alternativeApproaches: "Alternatif Yaklaşımlar",
      overall: "Genel Durum",
      details: "Detaylar",
      criticalIssues: "Kritik Sorunlar"
    },
    EN: {
      summary: "Comprehensive Summary",
      riskAnalysis: "Legal Risk Analysis",
      legalOpinion: "Legal Opinion",
      actionPlan: "Action Plan",
      complianceStatus: "Compliance Status",
      legalReferences: "Legal References",
      documentType: "Document Type",
      parties: "Parties",
      applicableLaws: "Applicable Laws",
      severity: "Severity",
      probability: "Probability",
      impact: "Impact",
      urgency: "Urgency",
      potentialConsequences: "Potential Consequences",
      mitigationSuggestions: "Mitigation Suggestions",
      affectedArticles: "Affected Articles",
      priority: "Priority",
      action: "Action",
      legalBasis: "Legal Basis",
      deadline: "Deadline",
      responsibleParty: "Responsible Party",
      implementationSteps: "Implementation Steps",
      estimatedCost: "Estimated Cost",
      expectedOutcome: "Expected Outcome",
      validity: "Validity",
      enforceability: "Enforceability",
      recommendations: "Recommendations",
      alternativeApproaches: "Alternative Approaches",
      overall: "Overall Status",
      details: "Details",
      criticalIssues: "Critical Issues"
    },
    DE: {
      summary: "Umfassende Zusammenfassung",
      riskAnalysis: "Rechtliche Risikoanalyse",
      legalOpinion: "Rechtliche Meinung",
      actionPlan: "Aktionsplan",
      complianceStatus: "Compliance-Status",
      legalReferences: "Rechtliche Referenzen",
      documentType: "Dokumenttyp",
      parties: "Parteien",
      applicableLaws: "Anwendbare Gesetze",
      severity: "Schweregrad",
      probability: "Wahrscheinlichkeit",
      impact: "Auswirkung",
      urgency: "Dringlichkeit",
      potentialConsequences: "Potenzielle Konsequenzen",
      mitigationSuggestions: "Minderungsvorschläge",
      affectedArticles: "Betroffene Artikel",
      priority: "Priorität",
      action: "Aktion",
      legalBasis: "Rechtliche Grundlage",
      deadline: "Frist",
      responsibleParty: "Verantwortliche Partei",
      implementationSteps: "Umsetzungsschritte",
      estimatedCost: "Geschätzte Kosten",
      expectedOutcome: "Erwartetes Ergebnis",
      validity: "Gültigkeit",
      enforceability: "Durchsetzbarkeit",
      recommendations: "Empfehlungen",
      alternativeApproaches: "Alternative Ansätze",
      overall: "Gesamtstatus",
      details: "Details",
      criticalIssues: "Kritische Probleme"
    }
  };
  
  const t = translations[language] || translations.TR;
  
  // Bölüm başlığı komponenti
  const SectionHeader = ({ title, icon }: { title: string; icon?: string }) => (
    <h2 style={{
      color: goldColor,
      fontSize: '2rem',
      fontWeight: 'bold',
      marginBottom: '24px',
      marginTop: '40px',
      paddingBottom: '16px',
      borderBottom: `3px solid ${goldColor}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      {icon && <span style={{ fontSize: '1.8rem' }}>{icon}</span>}
      <span>{title}</span>
    </h2>
  );
  
  // Profesyonel panel stili
  const panelStyle = {
    padding: '24px',
    background: darkBlueColor,
    borderRadius: '12px',
    border: `1px solid ${goldColor}33`,
    marginBottom: '20px',
    lineHeight: '1.8',
  };
  
  // Liste item stili
  const listItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
    paddingLeft: '8px',
  };
  
  // Kritik risk kontrolü
  const hasCriticalRisk = parsedData && isJson && parsedData.risk_cards && Array.isArray(parsedData.risk_cards) && 
    parsedData.risk_cards.some((risk: any) => {
      const sev = (risk.severity || '').toLowerCase();
      return sev.includes('high') || sev.includes('yüksek') || sev.includes('kritik') || sev.includes('critical');
    });
  
  // Risk skoru hesaplama
  const calculateRiskScore = (): number => {
    if (!parsedData || !isJson || !parsedData.risk_cards || !Array.isArray(parsedData.risk_cards)) return 0;
    const highRiskCount = parsedData.risk_cards.filter((risk: any) => {
      const sev = (risk.severity || '').toLowerCase();
      return sev.includes('high') || sev.includes('yüksek') || sev.includes('kritik') || sev.includes('critical');
    }).length;
    return parsedData.risk_cards.length > 0 ? Math.round((highRiskCount / parsedData.risk_cards.length) * 100) : 0;
  };
  
  // Uyumluluk skoru hesaplama
  const calculateComplianceScore = (): number => {
    if (!parsedData || !isJson || !parsedData.compliance_status) return 0;
    const status = parsedData.compliance_status.compliance_score;
    if (!status || typeof status !== 'object') return 0;
    
    const scores: any = {
      'uyumlu': 100,
      'compliant': 100,
      'kısmen_uyumlu': 50,
      'partially_compliant': 50,
      'uyumsuz': 0,
      'non_compliant': 0
    };
    
    const overall = status.Overall || status.overall || parsedData.compliance_status.overall;
    if (typeof overall === 'string') {
      return scores[overall.toLowerCase()] || 50;
    }
    return 50;
  };
  
  // Güven endeksi hesaplama (100 - risk skoru)
  const calculateTrustIndex = (): number => {
    return Math.max(0, 100 - calculateRiskScore());
  };
  
  // Hukuki terim sözlüğü
  const legalTerms: { [key: string]: { [key: string]: string } } = {
    TR: {
      'BGB': 'Bürgerliches Gesetzbuch - Almanya Medeni Kanunu',
      'GDPR': 'General Data Protection Regulation - AB Genel Veri Koruma Yönetmeliği',
      'TCO': 'Türk Ticaret Kanunu',
      'TBK': 'Türk Borçlar Kanunu',
      'KVKK': 'Kişisel Verilerin Korunması Kanunu',
      'UCC': 'Uniform Commercial Code - ABD Birleşik Ticaret Kanunu',
      'CISG': 'United Nations Convention on Contracts for the International Sale of Goods',
      'Force Majeure': 'Mücbir Sebep - Tarafların kontrolü dışındaki olağanüstü durumlar',
      'Data Protection': 'Veri Koruma',
      'Compliance': 'Uyumluluk',
      'Risk Assessment': 'Risk Değerlendirmesi'
    },
    EN: {
      'BGB': 'Bürgerliches Gesetzbuch - German Civil Code',
      'GDPR': 'General Data Protection Regulation - EU Regulation 2016/679',
      'TCO': 'Turkish Commercial Code',
      'TBK': 'Turkish Code of Obligations',
      'KVKK': 'Personal Data Protection Law (Turkey)',
      'UCC': 'Uniform Commercial Code - US Commercial Law',
      'CISG': 'United Nations Convention on Contracts for the International Sale of Goods',
      'Force Majeure': 'Unforeseeable circumstances preventing contract fulfillment',
      'Data Protection': 'Legal framework for protecting personal data',
      'Compliance': 'Adherence to legal requirements',
      'Risk Assessment': 'Evaluation of potential legal risks'
    },
    DE: {
      'BGB': 'Bürgerliches Gesetzbuch - Deutsches Zivilgesetzbuch',
      'GDPR': 'Datenschutz-Grundverordnung - EU-Verordnung 2016/679',
      'TCO': 'Türkisches Handelsgesetzbuch',
      'TBK': 'Türkisches Obligationenrecht',
      'KVKK': 'Türkisches Datenschutzgesetz',
      'UCC': 'Uniform Commercial Code - US-Handelsrecht',
      'CISG': 'UN-Kaufrecht - Übereinkommen über internationale Warenkaufverträge',
      'Force Majeure': 'Höhere Gewalt - Unvorhersehbare Umstände',
      'Data Protection': 'Datenschutz',
      'Compliance': 'Rechtliche Einhaltung',
      'Risk Assessment': 'Risikobewertung'
    }
  };
  
  // Ham Markdown benzeri metni başlık, kalın, liste olarak formatla (npm paketi yok, saf React)
  const formatText = (text: string | string[] | undefined | null, gold: string): React.ReactNode => {
    if (text == null || text === '') return null;
    const str: string = Array.isArray(text) ? text.join('\n') : typeof text === 'string' ? text : String(text);
    if (!str.trim()) return null;
    const lines = str.split(/\r?\n/);
    const headingColor = gold;
    const listItemStyle = { marginLeft: '20px', marginBottom: '6px', display: 'flex', gap: '8px' as const };
    const paragraphStyle = { marginBottom: '12px', lineHeight: 1.6 };

    const formatInline = (s: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const re = /\*\*(.+?)\*\*/g;
      let m;
      while ((m = re.exec(s)) !== null) {
        if (m.index > lastIndex) parts.push(s.slice(lastIndex, m.index));
        parts.push(<strong key={`b-${m.index}`}>{m[1]}</strong>);
        lastIndex = re.lastIndex;
      }
      if (lastIndex < s.length) parts.push(s.slice(lastIndex));
      return parts.length === 1 ? parts[0] : <>{parts}</>;
    };

    const out: React.ReactNode[] = [];
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (/^###\s+/.test(line)) {
        out.push(<h3 key={idx} style={{ color: headingColor, fontSize: '1.25rem', fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }}>{formatInline(trimmed.replace(/^###\s+/, ''))}</h3>);
      } else if (/^##\s+/.test(line)) {
        out.push(<h2 key={idx} style={{ color: headingColor, fontSize: '1.4rem', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px' }}>{formatInline(trimmed.replace(/^##\s+/, ''))}</h2>);
      } else if (/^#\s+/.test(line)) {
        out.push(<h1 key={idx} style={{ color: headingColor, fontSize: '1.6rem', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>{formatInline(trimmed.replace(/^#\s+/, ''))}</h1>);
      } else if (/^-\s+/.test(line)) {
        out.push(<div key={idx} style={listItemStyle}><span style={{ color: headingColor }}>•</span><span>{formatInline(trimmed.replace(/^-\s+/, ''))}</span></div>);
      } else if (trimmed === '') {
        out.push(<div key={idx} style={{ height: '8px' }} />);
      } else {
        out.push(<p key={idx} style={paragraphStyle}>{formatInline(trimmed)}</p>);
      }
    });
    return <>{out}</>;
  };

  // Metni tooltip'li terimlerle zenginleştir
  const enrichTextWithTooltips = (text: string): React.ReactNode => {
    if (!text || typeof text !== 'string') return text;
    
    const terms = legalTerms[language] || legalTerms.TR;
    const termKeys = Object.keys(terms).sort((a, b) => b.length - a.length); // Uzun terimler önce
    
    let parts: (string | React.ReactElement)[] = [text];
    
    termKeys.forEach(term => {
      const newParts: (string | React.ReactElement)[] = [];
      parts.forEach(part => {
        if (typeof part === 'string') {
          const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          const matches = [...part.matchAll(regex)];
          
          if (matches.length > 0) {
            let lastIndex = 0;
            matches.forEach((match, idx) => {
              if (match.index !== undefined) {
                // Önceki kısmı ekle
                if (match.index > lastIndex) {
                  newParts.push(part.substring(lastIndex, match.index));
                }
                // Tooltip'li terimi ekle (benzersiz key)
                const uniqueKey = `${term}-${idx}-${Math.random().toString(36).substr(2, 9)}`;
                newParts.push(
                  <TooltipTerm key={uniqueKey} term={term} definition={terms[term]}>
                    {match[0]}
                  </TooltipTerm>
                );
                lastIndex = match.index + match[0].length;
              }
            });
            // Kalan kısmı ekle
            if (lastIndex < part.length) {
              newParts.push(part.substring(lastIndex));
            }
          } else {
            newParts.push(part);
          }
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });
    
    return <>{parts}</>;
  };
  
  // Tooltip komponenti
  const TooltipTerm = ({ term, definition, children }: { term: string; definition: string; children: React.ReactNode }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    return (
      <span
        style={{
          position: 'relative',
          color: goldColor,
          fontWeight: 'bold',
          cursor: 'help',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
        {showTooltip && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '8px',
              padding: '12px 16px',
              background: darkBlueColor,
              color: lightTextColor,
              borderRadius: '8px',
              border: `2px solid ${goldColor}`,
              fontSize: '0.9rem',
              maxWidth: '300px',
              zIndex: 1000,
              boxShadow: `0 4px 12px rgba(0, 0, 0, 0.3)`,
              whiteSpace: 'normal',
              wordWrap: 'break-word',
            }}
          >
            <strong style={{ color: goldColor, display: 'block', marginBottom: '4px' }}>{term}</strong>
            {definition}
          </div>
        )}
      </span>
    );
  };
  
  // Ana analiz metnini göster
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // VIP kontrolü
  const isVIP = isAdmin || effectivePackage === 'enterprise' || effectivePackage === 'quantum_global' || effectivePackage === 'professional';
  
  // PDF indirme fonksiyonu (eğer prop'tan gelmiyorsa)
  const handlePDFDownload = () => {
    console.log('PDF: window.print() yöntemi ile yazdırma başlatılıyor...');
    
    // VIP kontrolü
    if (!isVIP) {
      console.log('PDF: VIP kontrolü başarısız');
      alert(language === 'TR' 
        ? 'Bu özellik sadece VIP kullanıcılar içindir. Lütfen paketinizi yükseltin.' 
        : language === 'EN' 
        ? 'This feature is only available for VIP users. Please upgrade your plan.'
        : 'Diese Funktion ist nur für VIP-Benutzer verfügbar. Bitte upgraden Sie Ihren Plan.');
      return;
    }
    
    console.log('PDF: VIP kontrolü başarılı');
    
    // React State Strategy: Yazdırma modunu aç
    setIsPrinting(true);
    
    // Grafiklerin render olması için bekleme süresi
    setTimeout(() => {
      window.print();
      // Yazdırma bitince modu kapat
      setTimeout(() => {
        setIsPrinting(false);
      }, 500);
    }, 1000); // Render olması için 1 saniye bekle
  };
  
  return (
    <>
    <div ref={reportContainerRef} id="analysis-report" className="block min-h-[200px]" style={{ marginTop: '60px', position: 'relative', pageBreakInside: 'avoid', breakInside: 'avoid', margin: '40px' }}>
      <style>{`
        /* PDF İndir butonunun rengini koru */
        .pdf-download-button {
          color: #f5f3e8 !important;
        }
        .pdf-download-button:disabled {
          color: #f5f3e8 !important;
        }
        .pdf-download-button span {
          color: inherit !important;
        }
        
        /* @media print - Spotlight (Sahne Işığı) Tekniği */
        @page {
          size: auto;
          margin: 10mm;
        }
        
        @media print {
          /* 1. Önce sayfadaki HER ŞEYİ görünmez yap (ama yok etme, visibility kullan) */
          body * {
            visibility: hidden;
          }

          /* 2. Sadece "analysis-report" ID'li raporu GÖRÜNÜR yap */
          #analysis-report, #analysis-report * {
            visibility: visible !important;
          }

          /* 3. Raporu sayfanın en tepesine yerleştir */
          #analysis-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background-color: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
            max-width: none !important;
          }

          /* 4. Renkleri Zorla: Beyaz Kağıt, Siyah Yazı */
          #analysis-report * {
            color: #000000 !important;
            background-color: transparent !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
          
          #analysis-report h1, 
          #analysis-report h2, 
          #analysis-report h3,
          #analysis-report h4,
          #analysis-report h5,
          #analysis-report h6,
          #analysis-report p,
          #analysis-report div,
          #analysis-report span {
            color: #000000 !important;
          }

          /* 5. Gereksiz butonları ve chat'i gizle (Display none burada güvenli çünkü raporun içinde değiller) */
          button,
          .no-print,
          .pdf-download-button,
          .download-button,
          [id*="chat"],
          [class*="chat"],
          [class*="Chat"],
          .download-section,
          aside,
          nav,
          footer,
          [data-html2canvas-ignore="true"],
          header:not(#analysis-report header) {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* 6. Grafikleri Görünür Kıl (SVG Fix) */
          #analysis-report .recharts-wrapper,
          #analysis-report .recharts-surface,
          #analysis-report .chart-container,
          #analysis-report svg {
            width: 100% !important;
            height: auto !important;
            min-height: 300px !important;
            display: block !important;
            overflow: visible !important;
            visibility: visible !important;
            max-width: none !important;
          }
          
          /* Grafik yazılarını siyah yap */
          #analysis-report tspan,
          #analysis-report text,
          #analysis-report svg text,
          #analysis-report svg tspan,
          #analysis-report .recharts-cartesian-axis-tick-value,
          #analysis-report .recharts-text,
          #analysis-report .recharts-legend-item-text {
            fill: #000000 !important;
            stroke: none !important;
            color: #000000 !important;
          }
          
          /* Grafik çizgilerini siyah yap */
          #analysis-report path,
          #analysis-report line {
            stroke: #000000 !important;
          }
          
          /* 6a. Document Type Başlık Hizalaması - Flex yapısını kır */
          #analysis-report [style*="justify-content"],
          #analysis-report [style*="display: flex"],
          #analysis-report [style*="display:flex"],
          #analysis-report [class*="flex"] {
            display: block !important;
          }
          
          /* Document Type başlığını sola yasla */
          #analysis-report [id*="document-info"],
          #analysis-report [id*="pdf-section-document-info"],
          #analysis-report [style*="Document Type"],
          #analysis-report [style*="Belge Türü"],
          #analysis-report [style*="textAlign: 'right'"] {
            text-align: left !important;
            margin-left: 0 !important;
            width: 100% !important;
          }
          
          /* Document Type içindeki flex container'ları block yap */
          #analysis-report [style*="justifyContent: 'space-between'"],
          #analysis-report [style*="justifyContent: 'flex-end'"],
          #analysis-report [style*="justifyContent: 'flex-start'"] {
            display: block !important;
            text-align: left !important;
          }
          
          /* 7. Başlıkların sayfa sonuna denk gelip bölünmemesi */
          #analysis-report h1,
          #analysis-report h2,
          #analysis-report h3,
          #analysis-report h4,
          #analysis-report h5,
          #analysis-report h6 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          
          /* 8. Sayfa bölünmelerini önle */
          #analysis-report section,
          #analysis-report .panel,
          #analysis-report > div > div {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* 9. Logo düzenlemesi - PDF'in en başında zarif görünüm */
          #analysis-report img[src*="vq.png"],
          #analysis-report img[src*="logo"] {
            display: block !important;
            width: 120px !important;
            height: auto !important;
            margin-bottom: 20px !important;
            object-fit: contain !important;
            visibility: visible !important;
          }
          
          /* 10. Flex ve container kısıtlamalarını kaldır */
          #analysis-report [class*="flex"],
          #analysis-report [style*="display: flex"],
          #analysis-report [class*="max-w"],
          #analysis-report [style*="max-width"] {
            max-width: none !important;
            width: 100% !important;
          }
        }
        
        #analysis-report section,
        #analysis-report .panel,
        #analysis-report > div > div,
        #analysis-report [style*="padding"],
        #analysis-report [style*="background"][style*="borderRadius"] {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        #analysis-report > div {
          position: relative !important;
          margin-bottom: 32px !important;
        }
        #analysis-report p,
        #analysis-report div[style*="whiteSpace"],
        #analysis-report span,
        #analysis-report div {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          orphans: 3 !important;
          widows: 3 !important;
          word-break: normal !important;
          hyphens: none !important;
        }
        /* Harflerin ve kelimelerin bölünmesini engelle */
        #analysis-report * {
          word-break: keep-all !important;
          overflow-wrap: break-word !important;
          hyphens: none !important;
        }
        /* Satırların bölünmesini engelle */
        #analysis-report p,
        #analysis-report div,
        #analysis-report span {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          orphans: 2 !important;
          widows: 2 !important;
        }
      `}</style>
      {/* Header: Banner ve PDF Butonu - Flex Layout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '30px',
        alignItems: 'stretch',
      }}>
        {/* Üst satır: Banner ve PDF Butonu yan yana */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '16px',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          {/* Kritik Uyarı Banner'ı - Sol taraf */}
          {hasCriticalRisk && (
            <div
              className="animate-pulse"
              data-html2canvas-ignore="true"
              style={{
                background: '#ef4444',
                color: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                boxShadow: `0 4px 12px rgba(239, 68, 68, 0.4)`,
                flex: '1',
                maxWidth: 'calc(100% - 200px)', // PDF butonu için yer bırak
                minWidth: '300px',
              }}
            >
              🚨 {language === 'TR' ? 'Kritik Riskler Tespit Edildi!' : language === 'EN' ? 'Critical Risks Detected!' : language === 'DE' ? 'Kritische Risiken erkannt!' : 'Critical Risks Detected!'}
            </div>
          )}
          
          {/* PDF İndir Butonu - Sağ üst köşe */}
          {displayResult && !isPrinting && (
            <button
              onClick={handlePDFDownload}
              disabled={isGeneratingPDF}
              className="pdf-download-button no-print"
              data-html2canvas-ignore="true"
              style={{
                padding: '12px 24px',
                background: isVIP ? goldColor : '#666',
                color: isVIP ? '#f5f3e8' : '#ffffff', // Beyaza yakın gold
                border: `1px solid ${isVIP ? goldColor : '#666'}`,
                borderRadius: '8px',
                fontWeight: '500',
                cursor: isGeneratingPDF ? 'wait' : (isVIP ? 'pointer' : 'not-allowed'),
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isVIP ? `0 2px 8px rgba(199, 176, 121, 0.2)` : 'none',
                transition: 'all 0.3s ease',
                zIndex: 10,
                opacity: isGeneratingPDF ? 0.7 : 1,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                letterSpacing: '0.3px',
              }}
              onMouseEnter={(e) => {
                if (isVIP && !isGeneratingPDF) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px rgba(199, 176, 121, 0.3)`;
                  e.currentTarget.style.background = `${goldColor}dd`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isVIP ? `0 2px 8px rgba(199, 176, 121, 0.2)` : 'none';
                e.currentTarget.style.background = isVIP ? goldColor : '#666';
                e.currentTarget.style.color = `${isVIP ? '#f5f3e8' : '#ffffff'} !important`; // Rengi koru
              }}
              title={!isVIP ? (language === 'TR' ? 'Bu özellik sadece VIP kullanıcılar içindir' : 'This feature is only available for VIP users') : ''}
            >
              <Download size={16} strokeWidth={2} />
              <span>
                {isGeneratingPDF 
                  ? (language === 'TR' ? 'PDF Hazırlanıyor...' : language === 'EN' ? 'Generating PDF...' : 'PDF wird erstellt...')
                  : (language === 'TR' ? 'PDF İndir' : language === 'EN' ? 'Download PDF' : language === 'DE' ? 'PDF Herunterladen' : 'Download PDF')
                }
              </span>
            </button>
          )}
        </div>
      </div>
      
      {/* Loading Overlay */}
      {isGeneratingPDF && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(245, 243, 232, 0.95)', // Beyaza yakın gold
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          flexDirection: 'column',
          gap: '20px',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.98)',
            padding: '50px 70px',
            borderRadius: '20px',
            border: '1px solid #d4af37',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), 0 0 20px rgba(212, 175, 55, 0.2)',
          }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '24px',
              color: '#1a365d',
              animation: 'spin 2s linear infinite'
            }}>⏳</div>
            <div style={{ 
              color: '#1a365d', 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              marginBottom: '12px',
              letterSpacing: '0.5px'
            }}>
              {language === 'TR' ? 'PDF Hazırlanıyor...' : language === 'EN' ? 'Generating PDF...' : 'PDF wird erstellt...'}
            </div>
            <div style={{ 
              color: '#1a365d', 
              fontSize: '0.95rem', 
              lineHeight: '1.6', 
              opacity: 0.8,
              letterSpacing: '0.3px'
            }}>
              {language === 'TR' ? 'Lütfen bekleyin, bu işlem birkaç saniye sürebilir.' : language === 'EN' ? 'Please wait, this may take a few seconds.' : 'Bitte warten Sie, dies kann einige Sekunden dauern.'}
            </div>
          </div>
        </div>
      )}
      
      {/* Analiz Skor Kartı (Dashboard) */}
      {isJson && parsedData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          position: 'relative',
        }}>
          {/* Risk Skoru */}
          <div style={{
            padding: '24px',
            background: darkBlueColor,
            borderRadius: '12px',
            border: `2px solid ${goldColor}44`,
            textAlign: 'center',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}>
            <div style={{ color: goldColor, fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>
              {language === 'TR' ? 'Risk Skoru' : language === 'EN' ? 'Risk Score' : language === 'DE' ? 'Risikobewertung' : 'Risk Score'}
            </div>
            <div style={{ 
              color: calculateRiskScore() >= 70 ? '#dc2626' : calculateRiskScore() >= 40 ? '#ea580c' : '#3b82f6', 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              marginBottom: '8px' 
            }}>
              {calculateRiskScore()}
            </div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>/ 100</div>
          </div>
          
          {/* Uyumluluk Yüzdesi */}
          <div style={{
            padding: '24px',
            background: darkBlueColor,
            borderRadius: '12px',
            border: `2px solid ${goldColor}44`,
            textAlign: 'center',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}>
            <div style={{ color: goldColor, fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>
              {language === 'TR' ? 'Uyumluluk Yüzdesi' : language === 'EN' ? 'Compliance Percentage' : language === 'DE' ? 'Compliance-Prozentsatz' : 'Compliance Percentage'}
            </div>
            <div style={{ 
              color: calculateComplianceScore() >= 80 ? '#16a34a' : calculateComplianceScore() >= 50 ? '#ea580c' : '#dc2626', 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              marginBottom: '8px' 
            }}>
              {calculateComplianceScore()}%
            </div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>
              {parsedData.compliance_status?.overall || 'N/A'}
            </div>
          </div>
          
          {/* Güven Endeksi */}
          <div style={{
            padding: '24px',
            background: darkBlueColor,
            borderRadius: '12px',
            border: `2px solid ${goldColor}44`,
            textAlign: 'center',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}>
            <div style={{ color: goldColor, fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>
              {language === 'TR' ? 'Güven Endeksi' : language === 'EN' ? 'Trust Index' : language === 'DE' ? 'Vertrauensindex' : 'Trust Index'}
            </div>
            <div style={{ 
              color: calculateTrustIndex() >= 70 ? '#16a34a' : calculateTrustIndex() >= 40 ? '#ea580c' : '#dc2626', 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              marginBottom: '8px' 
            }}>
              {calculateTrustIndex()}
            </div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>/ 100</div>
          </div>
        </div>
      )}

      {/* Risk Dağılım Grafiği */}
      {isJson && parsedData && (
        <div id="pdf-section-chart" style={{
          marginTop: '30px',
          padding: '24px',
          background: darkBlueColor,
          borderRadius: '12px',
          border: `2px solid ${goldColor}44`,
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          width: '100%',
          height: isPrinting ? '500px' : 'auto',
          minHeight: isPrinting ? '500px' : 'auto',
        }}>
          <div style={{ color: goldColor, fontSize: '1.1rem', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
            {language === 'TR' ? 'Risk Dağılım Grafiği' : language === 'EN' ? 'Risk Distribution Chart' : language === 'DE' ? 'Risikoverteilungsdiagramm' : 'Risk Distribution Chart'}
          </div>
          <ResponsiveContainer width="100%" height={isPrinting ? 500 : 300}>
            {(() => {
              const riskScore = calculateRiskScore();
              const complianceScore = calculateComplianceScore();
              const trustIndex = calculateTrustIndex();
              const chartData = [
                {
                  name: language === 'TR' ? 'Risk Skoru' : language === 'EN' ? 'Risk Score' : 'Risk Score',
                  value: riskScore,
                  color: riskScore >= 70 ? '#dc2626' : riskScore >= 40 ? '#ea580c' : '#3b82f6'
                },
                {
                  name: language === 'TR' ? 'Uyumluluk' : language === 'EN' ? 'Compliance' : 'Compliance',
                  value: complianceScore,
                  color: complianceScore >= 80 ? '#16a34a' : complianceScore >= 50 ? '#ea580c' : '#dc2626'
                },
                {
                  name: language === 'TR' ? 'Güven' : language === 'EN' ? 'Trust' : 'Trust',
                  value: trustIndex,
                  color: trustIndex >= 70 ? '#16a34a' : trustIndex >= 40 ? '#ea580c' : '#dc2626'
                }
              ];
              return (
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={goldColor} opacity={0.2} />
                  <XAxis 
                    dataKey="name" 
                    stroke={lightTextColor}
                    style={{ fontSize: '12px' }}
                    tick={{ fill: '#f5f3e8', fontSize: 12 }} // Beyaza yakın gold
                    className="pdf-axis-text"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    stroke={lightTextColor}
                    style={{ fontSize: '12px' }}
                    tick={{ fill: '#f5f3e8', fontSize: 12 }} // Beyaza yakın gold
                    className="pdf-axis-text"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: darkBlueColor, 
                      border: `1px solid ${goldColor}`, 
                      borderRadius: '8px',
                      color: lightTextColor
                    }}
                  />
                  <Bar dataKey="value" className="pdf-bar-chart" isAnimationActive={false}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} className="pdf-bar-cell" data-original-color={entry.color || '#8884d8'} />
                    ))}
                  </Bar>
                </BarChart>
              );
            })()}
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Ana Analiz Sonucu */}
      {displayResult && (
        <div style={{
          padding: '40px',
          background: midBlueColor,
          borderRadius: '20px',
          border: `2px solid ${goldColor}44`,
          marginBottom: references.length > 0 ? '40px' : '0',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          position: 'relative',
        }}>
          {/* JSON formatında ise hiyerarşik düzen */}
          {isJson && parsedData ? (
            <>
              {/* Belge Türü ve Temel Bilgiler - Header with Logo */}
              {(parsedData.document_type || parsedData.parties || parsedData.applicable_laws) && (
                <div style={{...panelStyle, pageBreakInside: 'avoid', breakInside: 'avoid', position: 'relative', marginBottom: '32px', paddingTop: '40px', paddingBottom: '20px'}}>
                  {/* Header: Logo ve Belge Türü */}
                  {parsedData.document_type && (
                    <div style={{ 
                      marginBottom: '24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '20px',
                      paddingBottom: '16px',
                      border: 'none !important',
                      boxShadow: 'none !important'
                      // Border ve box-shadow kaldırıldı - çirkin siyah çizgi yok
                    }}>
                      {/* Logo - Sol taraf - Küçük ve zarif */}
                      <div style={{ 
                        width: '30px',
                        height: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        marginTop: '40px' // Üst boşluk
                      }}>
                        <img 
                          src="/vq.png" 
                          alt="Veritas Logo" 
                          style={{ 
                            width: '30px',
                            height: 'auto',
                            objectFit: 'contain',
                            display: 'block'
                          }}
                        />
                      </div>
                      {/* Belge Türü - Sağ taraf */}
                      <div style={{ 
                        flex: 1, 
                        textAlign: 'right',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end'
                      }}>
                        <div>
                          <strong style={{ color: goldColor, fontSize: '1.1rem' }}>{t.documentType}:</strong>
                          <span style={{ color: lightTextColor, marginLeft: '12px', fontSize: '1rem' }}>
                            {parsedData.document_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {parsedData.parties && Array.isArray(parsedData.parties) && parsedData.parties.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <strong style={{ color: goldColor, fontSize: '1.1rem' }}>{t.parties}:</strong>
                      <div style={{ color: lightTextColor, marginLeft: '12px', marginTop: '8px' }}>
                        {parsedData.parties.map((party: string, idx: number) => (
                          <div key={`party-${idx}-${party.substring(0, 10)}`} style={listItemStyle}>
                            <span style={{ color: goldColor }}>•</span>
                            <span>{party}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {parsedData.applicable_laws && Array.isArray(parsedData.applicable_laws) && parsedData.applicable_laws.length > 0 && (
                    <div>
                      <strong style={{ color: goldColor, fontSize: '1.1rem' }}>{t.applicableLaws}:</strong>
                      <div style={{ color: lightTextColor, marginLeft: '12px', marginTop: '8px' }}>
                        {parsedData.applicable_laws.map((law: string, idx: number) => (
                          <div key={`law-${idx}-${law.substring(0, 10)}`} style={listItemStyle}>
                            <span style={{ color: goldColor }}>•</span>
                            <span>{law}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Kapsamlı Özet */}
              {parsedData.summary && (
                <div id="pdf-section-summary" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '2rem' }}>
                  <SectionHeader title={t.summary} icon="📋" />
                  <div style={{
                    ...panelStyle,
                    color: lightTextColor,
                    fontSize: '1rem',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                    wordBreak: 'keep-all',
                    hyphens: 'none',
                    orphans: 3,
                    widows: 3,
                  }}>
                    {formatText(parsedData.summary, goldColor)}
                  </div>
                </div>
              )}
              
              {/* Hukuki Risk Analizi */}
              {parsedData.risk_cards && Array.isArray(parsedData.risk_cards) && parsedData.risk_cards.length > 0 && (
                <div id="pdf-section-risk-analysis" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '2rem' }}>
                  <SectionHeader title={t.riskAnalysis} icon="⚠️" />
                  {parsedData.risk_cards.map((risk: any, index: number) => {
                    const severityColor = getSeverityColor(risk.severity || '');
                    const badgeColor = getSeverityBadgeColor(risk.severity || '');
                    const riskId = risk.id || risk.title || `risk-${index}`;
                    
                    return (
                      <div
                        key={`risk-card-${index}-${riskId.substring(0, 20)}`}
                        style={{
                          ...panelStyle,
                          borderLeft: `4px solid ${severityColor}`,
                          paddingLeft: '28px',
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                        }}
                      >
                        {/* Risk Başlığı ve Badge'ler */}
                        <div style={{ marginBottom: '16px' }}>
                          <h3 style={{
                            color: goldColor,
                            fontSize: '1.3rem',
                            fontWeight: 'bold',
                            marginBottom: '12px',
                          }}>
                            {risk.title || `Risk ${index + 1}`}
                          </h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                            {risk.severity && (
                              <span style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: badgeColor,
                                color: severityColor,
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                border: `1px solid ${severityColor}44`,
                              }}>
                                {t.severity}: {risk.severity}
                              </span>
                            )}
                            {risk.probability && (
                              <span style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: `${goldColor}22`,
                                color: goldColor,
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                border: `1px solid ${goldColor}44`,
                              }}>
                                {t.probability}: {risk.probability}
                              </span>
                            )}
                            {risk.impact && (
                              <span style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: `${goldColor}22`,
                                color: goldColor,
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                border: `1px solid ${goldColor}44`,
                              }}>
                                {t.impact}: {risk.impact}
                              </span>
                            )}
                            {risk.urgency && (
                              <span style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: `${goldColor}22`,
                                color: goldColor,
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                border: `1px solid ${goldColor}44`,
                              }}>
                                {t.urgency}: {risk.urgency}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Risk Açıklaması */}
                        {risk.description && (
                          <div style={{
                            color: lightTextColor,
                            fontSize: '1rem',
                            marginBottom: '20px',
                            lineHeight: '1.8',
                            whiteSpace: 'pre-wrap',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                            wordBreak: 'keep-all',
                            hyphens: 'none',
                            orphans: 3,
                            widows: 3,
                          }}>
                            {formatText(risk.description, goldColor)}
                          </div>
                        )}
                        
                        {/* Etkilenen Maddeler */}
                        {risk.affected_articles && typeof risk.affected_articles === 'object' && (
                          <div style={{ marginBottom: '20px' }}>
                            <strong style={{ color: goldColor, fontSize: '1.1rem', display: 'block', marginBottom: '12px' }}>
                              {t.affectedArticles}:
                            </strong>
                            {Object.entries(risk.affected_articles).map(([law, articles]: [string, any], lawIdx: number) => {
                              if (!Array.isArray(articles) || articles.length === 0) return null;
                              return (
                                <div key={`affected-articles-${index}-${law}-${lawIdx}`} style={{ marginBottom: '12px', marginLeft: '20px' }}>
                                  <strong style={{ color: goldColor }}>{law}:</strong>
                                  <div style={{ marginTop: '8px' }}>
                                    {articles.map((article: string, artIdx: number) => (
                                      <div key={`article-${index}-${law}-${artIdx}-${article.substring(0, 15)}`} style={listItemStyle}>
                                        <span style={{ color: goldColor }}>•</span>
                                        <span style={{ color: lightTextColor }}>{article}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Potansiyel Sonuçlar */}
                        {risk.potential_consequences && (
                          <div style={{ marginBottom: '20px' }}>
                            <strong style={{ color: goldColor, fontSize: '1.1rem', display: 'block', marginBottom: '12px' }}>
                              {t.potentialConsequences}:
                            </strong>
                            <div style={{
                              color: lightTextColor,
                              fontSize: '1rem',
                              lineHeight: '1.8',
                              whiteSpace: 'pre-wrap',
                              pageBreakInside: 'avoid',
                              breakInside: 'avoid',
                              wordBreak: 'keep-all',
                              hyphens: 'none',
                              orphans: 3,
                              widows: 3,
                            }}>
                              {formatText(risk.potential_consequences, goldColor)}
                            </div>
                          </div>
                        )}
                        
                        {/* Azaltma Önerileri */}
                        {risk.mitigation_suggestions && (
                          <div>
                            <strong style={{ color: goldColor, fontSize: '1.1rem', display: 'block', marginBottom: '12px' }}>
                              {t.mitigationSuggestions}:
                            </strong>
                            <div style={{
                              color: lightTextColor,
                              fontSize: '1rem',
                              lineHeight: '1.8',
                              whiteSpace: 'pre-wrap',
                              pageBreakInside: 'avoid',
                              breakInside: 'avoid',
                              wordBreak: 'keep-all',
                              hyphens: 'none',
                              orphans: 3,
                              widows: 3,
                            }}>
                              {formatText(risk.mitigation_suggestions, goldColor)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Eylem Planı */}
              {parsedData.action_plan && Array.isArray(parsedData.action_plan) && parsedData.action_plan.length > 0 && (
                <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '2rem' }}>
                  <SectionHeader title={t.actionPlan} icon="📝" />
                  {parsedData.action_plan.map((action: any, index: number) => {
                    const actionId = action.id || action.action || `action-${index}`;
                    return (
                    <div key={`action-plan-${index}-${String(actionId).substring(0, 20)}`} style={{...panelStyle, pageBreakInside: 'avoid', breakInside: 'avoid'}}>
                      <h3 style={{
                        color: goldColor,
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        marginBottom: '16px',
                      }}>
                        {action.priority && (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: `${goldColor}22`,
                            color: goldColor,
                            fontSize: '0.9rem',
                            marginRight: '12px',
                            border: `1px solid ${goldColor}44`,
                          }}>
                            {t.priority}: {action.priority}
                          </span>
                        )}
                        {action.action || `Eylem ${index + 1}`}
                      </h3>
                      
                      {action.legal_basis && (
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: goldColor }}>{t.legalBasis}:</strong>
                          <span style={{ color: lightTextColor, marginLeft: '12px' }}>{action.legal_basis}</span>
                        </div>
                      )}
                      
                      {action.deadline_note && (
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: goldColor }}>{t.deadline}:</strong>
                          <span style={{ color: lightTextColor, marginLeft: '12px' }}>{action.deadline_note}</span>
                        </div>
                      )}
                      
                      {action.responsible_party && (
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: goldColor }}>{t.responsibleParty}:</strong>
                          <span style={{ color: lightTextColor, marginLeft: '12px' }}>{action.responsible_party}</span>
                        </div>
                      )}
                      
                      {action.implementation_steps && Array.isArray(action.implementation_steps) && action.implementation_steps.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: goldColor, display: 'block', marginBottom: '8px' }}>{t.implementationSteps}:</strong>
                          {action.implementation_steps.map((step: string, stepIdx: number) => (
                            <div key={`step-${index}-${stepIdx}-${step.substring(0, 15)}`} style={listItemStyle}>
                              <span style={{ color: goldColor, fontSize: '1.2rem' }}>•</span>
                              <span style={{ color: lightTextColor }}>{step}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {action.estimated_cost && (
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: goldColor }}>{t.estimatedCost}:</strong>
                          <span style={{ color: lightTextColor, marginLeft: '12px' }}>{action.estimated_cost}</span>
                        </div>
                      )}
                      
                      {action.expected_outcome && (
                        <div>
                          <strong style={{ color: goldColor }}>{t.expectedOutcome}:</strong>
                          <span style={{ color: lightTextColor, marginLeft: '12px' }}>{action.expected_outcome}</span>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
              
              {/* Uyumluluk Durumu */}
              {parsedData.compliance_status && (
                <div id="pdf-section-compliance" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '2rem' }}>
                  <SectionHeader title={t.complianceStatus} icon="✅" />
                  <div style={{...panelStyle, pageBreakInside: 'avoid', breakInside: 'avoid'}}>
                    {parsedData.compliance_status.overall && (
                      <div style={{ marginBottom: '16px' }}>
                        <strong style={{ color: goldColor, fontSize: '1.1rem' }}>{t.overall}:</strong>
                        <span style={{ color: lightTextColor, marginLeft: '12px', fontSize: '1rem' }}>
                          {parsedData.compliance_status.overall}
                        </span>
                      </div>
                    )}
                    
                    {parsedData.compliance_status.details && (
                      <div style={{
                        color: lightTextColor,
                        fontSize: '1rem',
                        lineHeight: '1.8',
                        whiteSpace: 'pre-wrap',
                        marginBottom: '20px',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                        wordBreak: 'keep-all',
                        hyphens: 'none',
                        orphans: 3,
                        widows: 3,
                      }}>
                        {parsedData.compliance_status.details}
                      </div>
                    )}
                    
                    {parsedData.compliance_status.critical_issues && Array.isArray(parsedData.compliance_status.critical_issues) && parsedData.compliance_status.critical_issues.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <strong style={{ color: goldColor, fontSize: '1.1rem', display: 'block', marginBottom: '12px' }}>
                          {t.criticalIssues}:
                        </strong>
                        {parsedData.compliance_status.critical_issues.map((issue: string, idx: number) => (
                          <div key={`critical-issue-${idx}-${issue.substring(0, 20)}`} style={listItemStyle}>
                            <span style={{ color: '#ef4444', fontSize: '1.2rem' }}>⚠</span>
                            <span style={{ color: lightTextColor }}>{issue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {parsedData.compliance_status.recommendations && Array.isArray(parsedData.compliance_status.recommendations) && parsedData.compliance_status.recommendations.length > 0 && (
                      <div>
                        <strong style={{ color: goldColor, fontSize: '1.1rem', display: 'block', marginBottom: '12px' }}>
                          {t.recommendations}:
                        </strong>
                        {parsedData.compliance_status.recommendations.map((rec: string, idx: number) => (
                          <div key={`recommendation-${idx}-${rec.substring(0, 20)}`} style={listItemStyle}>
                            <span style={{ color: goldColor, fontSize: '1.2rem' }}>•</span>
                            <span style={{ color: lightTextColor }}>{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Hukuki Görüş */}
              {parsedData.legal_opinion && (
                <div id="pdf-section-legal-opinion" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '2rem' }}>
                  <SectionHeader title={t.legalOpinion} icon="⚖️" />
                  <div style={{...panelStyle, pageBreakInside: 'avoid', breakInside: 'avoid'}}>
                    {parsedData.legal_opinion.validity && (
                      <div style={{ marginBottom: '20px' }}>
                        <strong style={{ color: goldColor, fontSize: '1.1rem', display: 'block', marginBottom: '12px' }}>
                          {t.validity}:
                        </strong>
                        <div style={{
                          color: lightTextColor,
                          fontSize: '1rem',
                          lineHeight: '1.8',
                          whiteSpace: 'pre-wrap',
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                          wordBreak: 'keep-all',
                          hyphens: 'none',
                          orphans: 3,
                          widows: 3,
                        }}>
                          {parsedData.legal_opinion.validity}
                        </div>
                      </div>
                    )}
                    
                    {parsedData.legal_opinion.enforceability && (
                      <div style={{ marginBottom: '20px' }}>
                        <strong style={{ color: goldColor, fontSize: '1.1rem', display: 'block', marginBottom: '12px' }}>
                          {t.enforceability}:
                        </strong>
                        <div style={{
                          color: lightTextColor,
                          fontSize: '1rem',
                          lineHeight: '1.8',
                          whiteSpace: 'pre-wrap',
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                          wordBreak: 'keep-all',
                          hyphens: 'none',
                          orphans: 3,
                          widows: 3,
                        }}>
                          {formatText(parsedData.legal_opinion.enforceability, goldColor)}
                        </div>
                      </div>
                    )}
                    
                    {parsedData.legal_opinion.recommendations && (
                      <div style={{ marginBottom: '20px' }}>
                        <strong style={{ color: goldColor, fontSize: '1.1rem', display: 'block', marginBottom: '12px' }}>
                          {t.recommendations}:
                        </strong>
                        <div style={{
                          color: lightTextColor,
                          fontSize: '1rem',
                          lineHeight: '1.8',
                          whiteSpace: 'pre-wrap',
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                          wordBreak: 'keep-all',
                          hyphens: 'none',
                          orphans: 3,
                          widows: 3,
                        }}>
                          {parsedData.legal_opinion.recommendations}
                        </div>
                      </div>
                    )}
                    
                    {parsedData.legal_opinion.alternative_approaches && (
                      <div>
                        <strong style={{ color: goldColor, fontSize: '1.1rem', display: 'block', marginBottom: '12px' }}>
                          {t.alternativeApproaches}:
                        </strong>
                        <div style={{
                          color: lightTextColor,
                          fontSize: '1rem',
                          lineHeight: '1.8',
                          whiteSpace: 'pre-wrap',
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                          wordBreak: 'keep-all',
                          hyphens: 'none',
                          orphans: 3,
                          widows: 3,
                        }}>
                          {formatText(parsedData.legal_opinion.alternative_approaches, goldColor)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            // JSON değilse, ham metin göster
            <>
              <SectionHeader title="Analiz Sonucu" icon="📊" />
              <div 
                className="block min-h-[200px]"
                style={{
                  ...panelStyle,
                  color: lightTextColor,
                  fontSize: '1rem',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                }}
              >
                {typeof displayResult === 'string' ? displayResult : JSON.stringify(displayResult, null, 2)}
              </div>
            </>
          )}
        </div>
      )}

      {/* AI'ya Sor (Chat) */}
      {displayResult && chatMessages !== undefined && chatInput !== undefined && setChatInput && handleChatSend && chatLoading !== undefined && (
        <div 
          data-html2canvas-ignore="true"
          style={{
            marginTop: '40px',
            padding: '30px',
            background: midBlueColor,
            borderRadius: '20px',
            border: `2px solid ${goldColor}44`,
          }}
        >
          <div style={{
            color: goldColor,
            fontSize: '1.3rem',
            fontWeight: 'bold',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>💬</span>
            <span>{language === 'TR' ? 'Bu Analiz Hakkında Sorunuz mu Var?' : language === 'EN' ? 'Do You Have Questions About This Analysis?' : language === 'DE' ? 'Haben Sie Fragen zu dieser Analyse?' : 'Do You Have Questions About This Analysis?'}</span>
          </div>

          {/* Chat Mesajları */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            marginBottom: '20px',
            padding: '15px',
            background: darkBlueColor,
            borderRadius: '12px',
            border: `1px solid ${goldColor}33`,
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {chatMessages.length === 0 ? (
              <div style={{
                color: lightTextColor,
                opacity: 0.7,
                textAlign: 'center',
                padding: '20px',
                fontSize: '0.9rem'
              }}>
                {language === 'TR' 
                  ? 'Analiz hakkında sorularınızı buraya yazabilirsiniz. AI, analiz sonuçlarına göre yanıt verecektir.' 
                  : language === 'EN'
                  ? 'You can ask questions about the analysis here. AI will respond based on the analysis results.'
                  : 'Sie können hier Fragen zur Analyse stellen. Die KI wird basierend auf den Analyseergebnissen antworten.'}
              </div>
            ) : (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{
                    maxWidth: '75%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: msg.role === 'user' 
                      ? `${goldColor}33` 
                      : darkBlueColor,
                    border: `1px solid ${msg.role === 'user' ? goldColor : `${goldColor}22`}`,
                    color: lightTextColor,
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}>
                    <div style={{
                      color: goldColor,
                      fontSize: '0.75rem',
                      marginBottom: '5px',
                      fontWeight: 'bold'
                    }}>
                      {msg.role === 'user' 
                        ? (language === 'TR' ? 'Siz' : language === 'EN' ? 'You' : 'Sie')
                        : 'AI'}
                    </div>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '10px'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: darkBlueColor,
                  border: `1px solid ${goldColor}22`,
                  color: lightTextColor,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>🤔</span>
                  <span>{language === 'TR' ? 'Düşünüyor...' : language === 'EN' ? 'Thinking...' : 'Denke nach...'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end'
          }}>
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
              placeholder={language === 'TR' 
                ? 'Sorunuzu buraya yazın...' 
                : language === 'EN'
                ? 'Type your question here...'
                : 'Geben Sie hier Ihre Frage ein...'}
              disabled={chatLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: darkBlueColor,
                border: `1px solid ${goldColor}44`,
                borderRadius: '10px',
                color: lightTextColor,
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = goldColor;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = `${goldColor}44`;
              }}
            />
            <button
              onClick={handleChatSend}
              disabled={!chatInput.trim() || chatLoading}
              style={{
                padding: '12px 24px',
                background: (!chatInput.trim() || chatLoading) 
                  ? '#666' 
                  : `linear-gradient(135deg, ${goldColor}, #d4c08a)`,
                border: `2px solid ${goldColor}`,
                borderRadius: '10px',
                color: (!chatInput.trim() || chatLoading) ? '#999' : darkBlueColor,
                fontSize: '0.95rem',
                fontWeight: 'bold',
                cursor: (!chatInput.trim() || chatLoading) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: (!chatInput.trim() || chatLoading) 
                  ? 'none' 
                  : `0 4px 12px ${goldColor}44`
              }}
              onMouseEnter={(e) => {
                if (chatInput.trim() && !chatLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 16px ${goldColor}66`;
                }
              }}
              onMouseLeave={(e) => {
                if (chatInput.trim() && !chatLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${goldColor}44`;
                }
              }}
            >
              {chatLoading 
                ? (language === 'TR' ? 'Gönderiliyor...' : language === 'EN' ? 'Sending...' : 'Wird gesendet...')
                : (language === 'TR' ? 'Gönder' : language === 'EN' ? 'Send' : 'Senden')}
            </button>
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
          marginTop: '40px',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}>
          <SectionHeader title={t.legalReferences} icon="📚" />
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
              const refId = `${lawCode}-${section || ''}-${country || ''}-${index}`;
              
              return (
                <div
                  key={`reference-${index}-${refId}`}
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
    
    {/* PDF İndir Butonu - #analysis-report dışında (PDF'te görünmemesi için) */}
    {displayResult && !isPrinting && (
      <button
        onClick={handlePDFDownload}
        disabled={isGeneratingPDF}
        className="pdf-download-button no-print"
        data-html2canvas-ignore="true"
        style={{
          padding: '12px 24px',
          background: isVIP ? goldColor : '#666',
          color: isVIP ? '#f5f3e8' : '#ffffff', // Beyaza yakın gold
          border: `1px solid ${isVIP ? goldColor : '#666'}`,
          borderRadius: '8px',
          fontWeight: '500',
          cursor: isGeneratingPDF ? 'wait' : (isVIP ? 'pointer' : 'not-allowed'),
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: isVIP ? `0 2px 8px rgba(199, 176, 121, 0.2)` : 'none',
          transition: 'all 0.3s ease',
          zIndex: 10,
          opacity: isGeneratingPDF ? 0.7 : 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          letterSpacing: '0.3px',
          position: 'absolute',
          top: '20px',
          right: '20px',
        }}
        onMouseEnter={(e) => {
          if (isVIP && !isGeneratingPDF) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 4px 12px rgba(199, 176, 121, 0.3)`;
            e.currentTarget.style.background = `${goldColor}dd`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = isVIP ? `0 2px 8px rgba(199, 176, 121, 0.2)` : 'none';
          e.currentTarget.style.background = isVIP ? goldColor : '#666';
          e.currentTarget.style.color = `${isVIP ? '#f5f3e8' : '#ffffff'} !important`; // Rengi koru
        }}
        title={!isVIP ? (language === 'TR' ? 'Bu özellik sadece VIP kullanıcılar içindir' : 'This feature is only available for VIP users') : ''}
      >
        <Download size={16} strokeWidth={2} />
        <span>
          {isGeneratingPDF 
            ? (language === 'TR' ? 'PDF Hazırlanıyor...' : language === 'EN' ? 'Generating PDF...' : 'PDF wird erstellt...')
            : (language === 'TR' ? 'PDF İndir' : language === 'EN' ? 'Download PDF' : language === 'DE' ? 'PDF Herunterladen' : 'Download PDF')
          }
        </span>
      </button>
    )}
    </>
  );
}
