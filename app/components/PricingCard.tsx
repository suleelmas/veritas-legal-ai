import React, { useState } from "react";
import { tr } from "@/lib/translations";

const PLAN_CONTENT: Record<string, Record<string, { name: string; description: string; features: string[]; button: string }>> = {
  TR: {
    'Single Quantum Scan': {
      name: 'Tek Kuantum Taraması',
      description: 'Tek seferlik uluslararası sözleşme kontrolleri için ideal. Bir belge için TR, US, UK ve DE veritabanlarına tam erişim içerir.',
      features: ['1 Kuantum Analizi','TR, US, UK, DE veritabanlarına tam erişim','Tek seferlik uluslararası sözleşme kontrolü için ideal','Temel Risk Analizi (Tek Ülke)','PDF/Word rapor indirme'],
      button: 'Satın Al'
    },
    Professional: {
      name: 'Profesyonel',
      description: 'Ayda 5 kuantum analizi ile profesyonel hukuki süreçlerinizi hızlandırın.',
      features: ['Ayda 5 Kuantum Analizi','TR, US, UK, DE veritabanlarına tam erişim','Temel Risk Analizi (Tek Ülke)','Belge Sürüm Karşılaştırması (Aynı Dil)','PDF/Word rapor indirme','Analiz geçmişi erişimi'],
      button: 'Abone Ol'
    },
    'Quantum Global': {
      name: 'Kuantum Global',
      description: 'Sınırsız kuantum analizi ve sınır ötesi risk haritalama ile kurumsal çözüm.',
      features: ['Sınırsız Kuantum Analizi','Sınır Ötesi Risk Haritalama','TR, US, UK, DE veritabanlarına tam erişim','Gelişmiş Kuantum Risk Haritalama (Çok Ülkeli Çapraz Kontrol)','Diller Arası Belge Karşılaştırması ve Çeviri Doğruluğu Kontrolü','PDF/Word rapor indirme','Sınırsız analiz geçmişi'],
      button: 'Sınırsızlığa Geç'
    }
  },
  EN: {
    'Single Quantum Scan': { name: 'Single Quantum Scan', description: 'Perfect for one-time international contract checks. Includes full access to TR, US, UK, and DE databases for one document.', features: ['1 Quantum Scan','Full access to TR, US, UK, DE databases','Perfect for one-time international contract checks','Basic Risk Analysis (Single Country)','PDF/Word report download'], button: 'Buy Now' },
    Professional: { name: 'Professional', description: 'Accelerate your professional legal processes with 5 quantum scans per month.', features: ['5 Quantum Scans Per Month','Full access to TR, US, UK, DE databases','Basic Risk Analysis (Single Country)','Document Version Comparison (Same Language)','PDF/Word report download','Analysis history access'], button: 'Subscribe' },
    'Quantum Global': { name: 'Quantum Global', description: 'Unlimited quantum scans and cross-border risk mapping for enterprise solutions.', features: ['Unlimited Quantum Scans','Cross-Border Risk Mapping','Full access to TR, US, UK, DE databases','Advanced Quantum Risk Mapping (Multi-Country Cross-Check)','Cross-Language Document Comparison & Translation Accuracy Check','PDF/Word report download','Unlimited analysis history'], button: 'Get Unlimited Access' }
  },
  DE: {
    'Single Quantum Scan': { name: 'Einzelner Quantum-Scan', description: 'Ideal für einmalige internationale Vertragsprüfungen. Beinhaltet vollständigen Zugriff auf die Datenbanken TR, US, UK und DE für ein Dokument.', features: ['1 Quantum-Analyse','Vollständiger Zugriff auf die Datenbanken TR, US, UK und DE','Ideal für einmalige internationale Vertragsprüfungen','Grundlegende Risikoanalyse (Ein Land)','PDF/Word-Bericht herunterladen'], button: 'Jetzt kaufen' },
    Professional: { name: 'Professionell', description: 'Beschleunigen Sie Ihre professionellen Rechtsprozesse mit 5 Quantum-Analysen pro Monat.', features: ['5 Quantum-Analysen pro Monat','Vollständiger Zugriff auf die Datenbanken TR, US, UK und DE','Grundlegende Risikoanalyse (Ein Land)','Vergleich von Dokumentversionen (Gleiche Sprache)','PDF/Word-Bericht herunterladen','Zugriff auf den Analyseverlauf'], button: 'Abonnieren' },
    'Quantum Global': { name: 'Quantum Global', description: 'Unbegrenzte Quantum-Analysen und grenzüberschreitende Risikokartierung für Unternehmenslösungen.', features: ['Unbegrenzte Quantum-Analysen','Grenzüberschreitende Risikokartierung','Vollständiger Zugriff auf die Datenbanken TR, US, UK und DE','Erweiterte Quantum-Risikokartierung (Länderübergreifender Abgleich)','Mehrsprachiger Dokumentvergleich und Prüfung der Übersetzungsgenauigkeit','PDF/Word-Bericht herunterladen','Unbegrenzter Analyseverlauf'], button: 'Unbegrenzten Zugriff erhalten' }
  },
  FR: {
    'Single Quantum Scan': { name: 'Analyse Quantique Unique', description: 'Idéal pour les vérifications ponctuelles de contrats internationaux. Comprend un accès complet aux bases de données TR, US, UK et DE pour un document.', features: ['1 analyse quantique','Accès complet aux bases de données TR, US, UK et DE','Idéal pour une vérification ponctuelle de contrat international','Analyse de risque de base (un seul pays)','Téléchargement du rapport PDF/Word'], button: 'Acheter maintenant' },
    Professional: { name: 'Professionnel', description: 'Accélérez vos processus juridiques professionnels avec 5 analyses quantiques par mois.', features: ['5 analyses quantiques par mois','Accès complet aux bases de données TR, US, UK et DE','Analyse de risque de base (un seul pays)','Comparaison des versions de documents (même langue)','Téléchargement du rapport PDF/Word','Accès à l’historique des analyses'], button: 'S’abonner' },
    'Quantum Global': { name: 'Quantique Global', description: 'Analyses quantiques illimitées et cartographie des risques transfrontaliers pour les solutions d’entreprise.', features: ['Analyses quantiques illimitées','Cartographie des risques transfrontaliers','Accès complet aux bases de données TR, US, UK et DE','Cartographie avancée des risques quantiques (vérification multi-pays)','Comparaison multilingue de documents et contrôle de la précision de traduction','Téléchargement du rapport PDF/Word','Historique des analyses illimité'], button: 'Obtenir un accès illimité' }
  }
};

type PricingCardProps = {
  gold: string;
  plan: string;
  priceTR: string;
  priceGlobal: string;
  features: string[];
  featuresGlobal?: string[];
  popular?: boolean;
  fullName?: string;
  fullNameGlobal?: string;
  description?: string;
  descriptionGlobal?: string;
  buttonText?: string;
  buttonTextGlobal?: string;
  shopierLink?: string;
  lemonSqueezyLink?: string;
  language?: string;
  ui?: any;
  testMode?: boolean | null;
};

export default function PricingCard({ gold, plan, priceTR, priceGlobal, features, featuresGlobal, popular, fullName, fullNameGlobal, description, descriptionGlobal, buttonText, buttonTextGlobal, shopierLink, lemonSqueezyLink, language = 'EN', ui, testMode }: PricingCardProps) {
  const [country, setCountry] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && testMode === null) {
      setLoading(true);
      try {
        fetch('https://ipapi.co/json/')
          .then(r => r.json())
          .then(info => {
            setCountry(info.country_code === 'TR' ? 'TR' : 'GLOBAL');
            setLoading(false);
          })
          .catch(() => {
            setCountry('GLOBAL');
            setLoading(false);
          });
      } catch { 
        setCountry('GLOBAL');
        setLoading(false);
      }
    } else if (testMode !== null) {
      setCountry(testMode ? 'TR' : 'GLOBAL');
      setLoading(false);
    }
  }, [testMode]);

  const isTurkey = country === 'TR';
  const displayPrice = isTurkey ? priceTR : priceGlobal;
  const localized = PLAN_CONTENT[language]?.[plan] || PLAN_CONTENT.EN?.[plan];
  const displayFullName = localized?.name || fullName || fullNameGlobal || plan;
  const displayDescription = localized?.description || description || descriptionGlobal;
  const displayFeatures = localized?.features || features || featuresGlobal || [];
  const displayButtonText = localized?.button || buttonText || tr(language, 'getStarted');
  const buttonLink = isTurkey ? shopierLink : lemonSqueezyLink;
  
  return (
    <div style={{ position: 'relative', overflow: 'visible', display: 'flex', flexDirection: 'column', height: '100%', flex: '1 1 0', paddingTop: '50px' }}>
      {popular && (
        <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', background: '#182332', color: gold, padding: '10px 26px', borderRadius: 14, fontWeight: 800, fontSize: '.98rem', boxShadow: `0 2px 9px ${gold}22, 0 0 0 4px #182332`, zIndex: 30, whiteSpace: 'nowrap', border: `2px solid ${gold}`, lineHeight: '1.2', marginTop: '0' }}>
          {ui?.[language]?.popularBadge || tr(language, 'popularBadge')}
        </div>
      )}
      <div style={{ background: popular ? `linear-gradient(135deg, ${gold}22 0%, #313950 100%)` : `rgba(23,28,45,0.7)`, border: popular ? `3px solid ${gold}` : `1.5px solid #414564`, color: '#f8fafc', borderRadius: 18, padding: '36px', boxShadow: popular ? `0 10px 36px ${gold}44` : 'none', minWidth: 280, maxWidth: 'none', position: 'relative', overflow: 'visible', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', flex: '1 1 auto', minHeight: '600px' }}>
        <div style={{ fontSize: 27, fontWeight: 900, color: gold, marginBottom: 10 }}>{displayFullName}</div>
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 10, color: gold }}>{loading ? '...' : displayPrice}</div>
        {displayDescription && <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 18, color: '#f1efca', lineHeight: '1.5' }}>{displayDescription}</div>}
        <ul style={{ padding: 0, margin: 0, listStyle: 'none', marginBottom: 18, flex: '1 1 auto' }}>
          {displayFeatures.map((f, idx) => <li key={idx} style={{ marginBottom: 7, color: '#f1efca', fontWeight: 700, paddingLeft: '4px' }}>&#10003; {f}</li>)}
        </ul>
        <div style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!loading && shopierLink && lemonSqueezyLink ? (
            <>
              <a href={lemonSqueezyLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '12px 0', background: '#c7b079', color: '#000000', fontWeight: 'bold', fontSize: '0.9rem', border: 'none', borderRadius: 12, cursor: 'pointer', textDecoration: 'none', textAlign: 'center', transition: 'all 0.3s ease', boxShadow: `0 4px 12px rgba(199, 176, 121, 0.3)` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}><span>💳</span><span>{tr(language, 'payGlobal')}</span></div>
              </a>
              <a href={shopierLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '12px 0', background: 'transparent', color: gold, fontWeight: 'bold', fontSize: '0.9rem', border: `2px solid ${gold}`, borderRadius: 12, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}><span>{tr(language, 'payTR')}</span><span style={{ fontSize: '0.65rem', background: `${gold}33`, color: gold, padding: '2px 8px', borderRadius: '8px', fontWeight: '600', marginTop: '2px' }}>{tr(language, 'installmentAvailable')}</span></div>
              </a>
              {isTurkey && <div style={{ marginTop: '8px', padding: '8px 12px', textAlign: 'center', fontSize: '0.7rem', color: '#a0a0a0', lineHeight: '1.4', opacity: 0.85 }}><div>💳 {tr(language, 'installmentInfo')}</div><div style={{ marginTop: 4 }}>Bonus • World • Maximum • Axess {tr(language, 'andOtherCards')}</div></div>}
              <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(199, 176, 121, 0.08)', borderRadius: '8px', border: `1px solid ${gold}22`, fontSize: '0.7rem', color: '#a0a0a0', lineHeight: '1.4', fontStyle: 'italic' }}>⚠️ {tr(language, 'paymentDisclaimer')}</div>
            </>
          ) : !loading && buttonLink ? (
            <a href={buttonLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '15px 0', background: '#c7b079', color: '#000000', fontWeight: 'bold', fontSize: '1rem', border: 'none', borderRadius: 15, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' }}>{displayButtonText}</a>
          ) : (
            <button disabled style={{ width: '100%', padding: '15px 0', background: '#666666', color: '#ffffff', fontWeight: 'bold', fontSize: '1rem', border: 'none', borderRadius: 15, cursor: 'not-allowed', opacity: 0.6 }}>{loading ? '...' : displayButtonText}</button>
          )}
          {(!loading && buttonLink) && <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(199, 176, 121, 0.08)', borderRadius: '8px', border: `1px solid ${gold}22`, fontSize: '0.7rem', color: '#a0a0a0', lineHeight: '1.4', fontStyle: 'italic' }}>⚠️ {tr(language, 'paymentDisclaimer')}</div>}
        </div>
      </div>
    </div>
  );
}
