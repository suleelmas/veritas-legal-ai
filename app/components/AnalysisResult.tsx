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
  extractRiskScore?: (score: number) => number;
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
  
  // VIP kontrolü
  const isVIP = isAdmin || effectivePackage === 'enterprise' || effectivePackage === 'quantum_global' || effectivePackage === 'professional';
  
  // PDF indirme fonksiyonu (eğer prop'tan gelmiyorsa)
  const handlePDFDownload = async () => {
    console.log('PDF: Fonksiyon başladı');
    
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
    
    if (handleDownloadPDF) {
      console.log('PDF: handleDownloadPDF prop kullanılıyor');
      setIsGeneratingPDF(true);
      try {
        await handleDownloadPDF();
        console.log('PDF: Prop fonksiyonu tamamlandı');
      } catch (err) {
        console.error('PDF: Prop fonksiyonu hatası:', err);
      } finally {
        setIsGeneratingPDF(false);
      }
      return;
    }
    
    if (!reportContainerRef.current) {
      console.error('PDF: Element bulunamadı - reportContainerRef.current null');
      alert(language === 'TR' 
        ? 'Rapor bulunamadı. Lütfen sayfayı yenileyin.' 
        : 'Report not found. Please refresh the page.');
      return;
    }
    
    console.log('PDF: Element bulundu:', reportContainerRef.current);
    console.log('PDF: Element ID:', reportContainerRef.current.id);
    console.log('PDF: Element görünür mü:', reportContainerRef.current.offsetWidth > 0 && reportContainerRef.current.offsetHeight > 0);
    
    setIsGeneratingPDF(true);
    
    try {
      console.log('PDF: Stil değişiklikleri başlatılıyor...');
      
      // Geçici olarak renkleri siyah yap (sadece metinler için)
      const originalStyles: { element: HTMLElement; color: string; backgroundColor: string; fill?: string; stroke?: string }[] = [];
      const allElements = reportContainerRef.current.querySelectorAll('*');
      console.log('PDF: Toplam element sayısı:', allElements.length);
      
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computedStyle = window.getComputedStyle(htmlEl);
        const originalStyle: any = {
          element: htmlEl,
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor
        };
        
        // Sadece grafik yazıları (axis, legend) için siyah yap, sütun renklerine dokunma
        const isChartText = htmlEl.classList.contains('pdf-axis-text') || 
                           htmlEl.classList.contains('recharts-text') ||
                           (htmlEl.tagName === 'text' && htmlEl.closest('svg.recharts-surface'));
        
        // SVG elementleri için fill ve stroke'u kaydet ama sadece yazılar için siyah yap
        if (htmlEl.tagName === 'path' || htmlEl.tagName === 'line' || htmlEl.tagName === 'rect' || htmlEl.tagName === 'circle' || htmlEl.tagName === 'text') {
          originalStyle.fill = (htmlEl as SVGElement).getAttribute('fill');
          originalStyle.stroke = (htmlEl as SVGElement).getAttribute('stroke');
          
          // Sadece yazılar için siyah yap, sütunlar (Bar) için dokunma
          if (isChartText || (htmlEl.tagName === 'text' && !htmlEl.closest('.recharts-bar'))) {
            (htmlEl as SVGElement).setAttribute('fill', '#000000');
            (htmlEl as SVGElement).setAttribute('stroke', '#000000');
          }
        }
        
        originalStyles.push(originalStyle);
        htmlEl.style.color = '#000000';
        htmlEl.style.backgroundColor = '#ffffff';
      });
      
      // Recharts grafiklerindeki sadece yazıları (axis, legend) siyah yap, sütun renklerine dokunma
      const svgTextElements = reportContainerRef.current.querySelectorAll('svg text.pdf-axis-text, svg .recharts-text, svg .recharts-cartesian-axis-tick-value, svg .recharts-legend-item-text');
      svgTextElements.forEach((el) => {
        const svgEl = el as SVGElement;
        // Sadece yazıları siyah yap
        if (svgEl.getAttribute('fill') && svgEl.getAttribute('fill') !== 'none') {
          svgEl.setAttribute('fill', '#000000');
        }
        if (svgEl.getAttribute('stroke') && svgEl.getAttribute('stroke') !== 'none') {
          svgEl.setAttribute('stroke', '#000000');
        }
      });
      
      // Bar (sütun) renklerini koru - pdf-bar-cell class'ına sahip elementlerin renklerini koru
      const barCells = reportContainerRef.current.querySelectorAll('.pdf-bar-cell, .recharts-bar-rectangle');
      barCells.forEach((el) => {
        const svgEl = el as SVGElement;
        // Orijinal rengi data-original-color'dan al ve geri yükle
        const originalColor = svgEl.getAttribute('data-original-color');
        if (originalColor) {
          svgEl.setAttribute('fill', originalColor);
        }
      });
      
      // Tüm SVG path/rect elementlerini kontrol et, eğer pdf-bar-cell değilse ve text değilse siyah yapma
      const allSvgElements = reportContainerRef.current.querySelectorAll('svg path, svg rect, svg circle');
      allSvgElements.forEach((el) => {
        const svgEl = el as SVGElement;
        // Eğer bar cell değilse ve text değilse, axis grid çizgileri için siyah yap
        if (!svgEl.classList.contains('pdf-bar-cell') && 
            !svgEl.closest('.recharts-bar') &&
            svgEl.closest('.recharts-cartesian-grid')) {
          // Grid çizgileri için siyah yap
          if (svgEl.getAttribute('stroke')) {
            svgEl.setAttribute('stroke', '#000000');
          }
        }
      });
      
      (reportContainerRef.current as HTMLElement).style.backgroundColor = '#ffffff';
      (reportContainerRef.current as HTMLElement).style.color = '#000000';
      
      console.log('PDF: Canvas oluşturuluyor...');
      console.log('PDF: html2canvas ayarları:', {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: true,
        useCORS: true
      });

      // html2canvas için sabit genişlik ayarla (A4 genişliği: 1200px)
      const fixedWidth = 1200;
      const originalWidth = reportContainerRef.current.offsetWidth;
      const originalHeight = reportContainerRef.current.offsetHeight;
      
      // Geçici olarak genişliği sabitle
      (reportContainerRef.current as HTMLElement).style.width = `${fixedWidth}px`;
      (reportContainerRef.current as HTMLElement).style.maxWidth = `${fixedWidth}px`;
      
      const canvas = await html2canvas(reportContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: true,
        useCORS: true,
        allowTaint: false,
        removeContainer: false,
        width: fixedWidth,
        windowWidth: fixedWidth,
        windowHeight: reportContainerRef.current.scrollHeight
      });
      
      // Orijinal genişliği geri yükle
      (reportContainerRef.current as HTMLElement).style.width = '';
      (reportContainerRef.current as HTMLElement).style.maxWidth = '';
      
      console.log('PDF: Canvas oluşturuldu, boyutlar:', canvas.width, 'x', canvas.height);
      
      const imgData = canvas.toDataURL('image/png');
      console.log('PDF: Image data oluşturuldu, uzunluk:', imgData.length);
      
      const pdf = new jsPDF({
        unit: 'pt',
        format: 'a4',
        orientation: 'portrait'
      });
      console.log('PDF: jsPDF instance oluşturuldu (A4 format, pt unit)');
      
      // PDF sayfa boyutları (A4: 595.28 x 841.89 pt)
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 40; // 40px margin
      const contentWidth = pageWidth - (margin * 2);
      
      // Logo ekle - üstten boşluk bırak
      try {
        console.log('PDF: Logo yükleniyor...');
        const logoResponse = await fetch('/vq.png');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });
          // Logo boyutları: 120px genişlik, aspect-ratio korunur
          const logoWidthPt = 120 * 0.75; // px to pt conversion (1px ≈ 0.75pt)
          const logoHeightPt = logoWidthPt; // Aspect ratio korunur
          pdf.addImage(logoDataUrl, 'PNG', margin, margin + 20, logoWidthPt, logoHeightPt);
          console.log('PDF: Logo eklendi (üstten boşluk ile)');
        } else {
          console.warn('PDF: Logo yüklenemedi, status:', logoResponse.status);
        }
      } catch (logoError) {
        console.warn('PDF: Logo hatası:', logoError);
      }
      
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin + 80; // Logo için boşluk (üstten 40px margin + 40px logo alanı)
      
      console.log('PDF: İlk sayfa ekleniyor, pozisyon:', position, 'yükseklik:', imgHeight);
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - position - margin);
      
      let pageCount = 1;
      while (heightLeft >= 0) {
        position = margin + 20; // Her yeni sayfada üstten margin
        pdf.addPage();
        pageCount++;
        console.log('PDF: Sayfa', pageCount, 'ekleniyor, pozisyon:', position);
        
        // Her sayfaya logo ekle
        try {
          const logoResponse = await fetch('/vq.png');
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            const logoDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(logoBlob);
            });
            const logoWidthPt = 120 * 0.75;
            const logoHeightPt = logoWidthPt;
            pdf.addImage(logoDataUrl, 'PNG', margin, margin + 20, logoWidthPt, logoHeightPt);
          }
        } catch (logoError) {
          // Logo eklenemezse devam et
        }
        
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin - position);
      }
      
      console.log('PDF: Toplam sayfa sayısı:', pageCount);
      console.log('PDF: Dosya kaydediliyor...');
      pdf.save('veritas-report.pdf');
      console.log('PDF: Dosya başarıyla kaydedildi!');
      
      // Orijinal stilleri geri yükle
      originalStyles.forEach(({ element, color, backgroundColor, fill, stroke }) => {
        element.style.color = color;
        element.style.backgroundColor = backgroundColor;
        // SVG elementleri için fill ve stroke'u geri yükle
        if (fill !== undefined && (element as SVGElement).setAttribute) {
          (element as SVGElement).setAttribute('fill', fill || '');
        }
        if (stroke !== undefined && (element as SVGElement).setAttribute) {
          (element as SVGElement).setAttribute('stroke', stroke || '');
        }
      });
      (reportContainerRef.current as HTMLElement).style.backgroundColor = midBlueColor;
      (reportContainerRef.current as HTMLElement).style.color = lightTextColor;
    } catch (err) {
      console.error('PDF download error:', err);
      alert(language === 'TR' 
        ? 'PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.' 
        : 'An error occurred while generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  return (
    <div ref={reportContainerRef} id="analysis-report" className="block min-h-[200px]" style={{ marginTop: '60px', position: 'relative', pageBreakInside: 'avoid', breakInside: 'avoid', margin: '40px' }}>
      <style>{`
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
        #analysis-report div[style*="whiteSpace"] {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
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
          {(handleDownloadPDF || handlePDFDownload) && (
            <button
              onClick={handlePDFDownload}
              disabled={isGeneratingPDF}
              className="pdf-download-button"
              data-html2canvas-ignore="true"
              style={{
                padding: '12px 24px',
                background: isVIP ? goldColor : '#666',
                color: isVIP ? '#FDF2E9' : '#ffffff',
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
          background: `linear-gradient(135deg, ${goldColor}22, #000000 80%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          flexDirection: 'column',
          gap: '20px',
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${goldColor}33, #1a1a1a)`,
            padding: '40px 60px',
            borderRadius: '16px',
            border: `2px solid ${goldColor}66`,
            textAlign: 'center',
            boxShadow: `0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px ${goldColor}44`,
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
            <div style={{ color: '#FFFFFF', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '10px', textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' }}>
              {language === 'TR' ? 'PDF Hazırlanıyor...' : language === 'EN' ? 'Generating PDF...' : 'PDF wird erstellt...'}
            </div>
            <div style={{ color: '#FFFFFF', fontSize: '0.95rem', lineHeight: '1.6', opacity: 0.9, textShadow: '0 1px 4px rgba(0, 0, 0, 0.5)' }}>
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
        <div style={{
          marginTop: '30px',
          padding: '24px',
          background: darkBlueColor,
          borderRadius: '12px',
          border: `2px solid ${goldColor}44`,
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}>
          <div style={{ color: goldColor, fontSize: '1.1rem', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
            {language === 'TR' ? 'Risk Dağılım Grafiği' : language === 'EN' ? 'Risk Distribution Chart' : language === 'DE' ? 'Risikoverteilungsdiagramm' : 'Risk Distribution Chart'}
          </div>
          <ResponsiveContainer width="100%" height={300}>
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
                    tick={{ fill: lightTextColor }}
                    className="pdf-axis-text"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    stroke={lightTextColor}
                    style={{ fontSize: '12px' }}
                    tick={{ fill: lightTextColor }}
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
                  <Bar dataKey="value" className="pdf-bar-chart">
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
                      borderBottom: `1px solid ${goldColor}33`
                    }}>
                      {/* Logo - Sol taraf */}
                      <div style={{ 
                        width: '120px',
                        height: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0
                      }}>
                        <img 
                          src="/vq.png" 
                          alt="Veritas Logo" 
                          style={{ 
                            width: '120px',
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
                <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '2rem' }}>
                  <SectionHeader title={t.summary} icon="📋" />
                  <div style={{
                    ...panelStyle,
                    color: lightTextColor,
                    fontSize: '1rem',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}>
                    {enrichTextWithTooltips(parsedData.summary)}
                  </div>
                </div>
              )}
              
              {/* Hukuki Risk Analizi */}
              {parsedData.risk_cards && Array.isArray(parsedData.risk_cards) && parsedData.risk_cards.length > 0 && (
                <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '2rem' }}>
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
                          }}>
                            {enrichTextWithTooltips(risk.description)}
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
                            }}>
                              {risk.potential_consequences}
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
                            }}>
                              {risk.mitigation_suggestions}
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
                <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '2rem' }}>
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
                <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '2rem' }}>
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
                        }}>
                          {parsedData.legal_opinion.enforceability}
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
                        }}>
                          {parsedData.legal_opinion.alternative_approaches}
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
  );
}
