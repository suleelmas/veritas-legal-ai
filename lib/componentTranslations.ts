import { getLanguage, type Language } from './translations';

const componentTranslations: Record<Language, Record<string, string>> = {
  TR: {
    betaMessage: 'Veritas Q-AI Beta: Hata bul, bildir ve Professional pakette %50 indirim kazan!',
    reportBug: 'Hata Bildir',
    close: 'Kapat',
    aboutDescription: 'Veritas Legal AI, hukuk profesyonelleri için belgeleri saniyeler içinde analiz eden gelişmiş bir yapay zeka sistemidir.',
    back: 'Geri Dön',
    comparisonResults: 'Dosya Karşılaştırma Sonuçları',
    crossLanguageComparison: 'Çapraz Dil Karşılaştırması (Quantum Global)',
    document1: 'İlk Dosya:', document2: 'İkinci Dosya:', detectedDifferences: 'Tespit Edilen Farklar',
    section: 'Madde/Bölüm', changeType: 'Değişiklik Tipi', riskImpact: 'Risk Etkisi', description: 'Açıklama',
    detailedComparisonReport: 'Detaylı Karşılaştırma Raporu'
  },
  EN: {
    betaMessage: 'Veritas Q-AI Beta: Find bugs, report them and get 50% off the Professional package!',
    reportBug: 'Report Bug', close: 'Close',
    aboutDescription: 'Veritas Legal AI is an advanced artificial intelligence system that analyzes documents for legal professionals in seconds.',
    back: 'Back', comparisonResults: 'Document Comparison Results', crossLanguageComparison: 'Cross-Language Comparison (Quantum Global)',
    document1: 'Document 1:', document2: 'Document 2:', detectedDifferences: 'Detected Differences', section: 'Section', changeType: 'Change Type', riskImpact: 'Risk Impact', description: 'Description', detailedComparisonReport: 'Detailed Comparison Report'
  },
  DE: {
    betaMessage: 'Veritas Q-AI Beta: Fehler finden, melden und 50 % Rabatt auf das Professional-Paket erhalten!',
    reportBug: 'Fehler melden', close: 'Schließen',
    aboutDescription: 'Veritas Legal AI ist ein fortschrittliches KI-System, das Dokumente für Rechtsexperten in Sekundenschnelle analysiert.',
    back: 'Zurück', comparisonResults: 'Ergebnisse des Dokumentvergleichs', crossLanguageComparison: 'Sprachübergreifender Vergleich (Quantum Global)',
    document1: 'Dokument 1:', document2: 'Dokument 2:', detectedDifferences: 'Erkannte Unterschiede', section: 'Abschnitt', changeType: 'Änderungstyp', riskImpact: 'Risikoauswirkung', description: 'Beschreibung', detailedComparisonReport: 'Detaillierter Vergleichsbericht'
  },
  FR: {
    betaMessage: 'Veritas Q-AI Beta : trouvez et signalez des bugs et obtenez 50 % de réduction sur le forfait Professional !',
    reportBug: 'Signaler un bug', close: 'Fermer',
    aboutDescription: 'Veritas Legal AI est un système avancé d’intelligence artificielle qui analyse en quelques secondes des documents pour les professionnels du droit.',
    back: 'Retour', comparisonResults: 'Résultats de la comparaison des documents', crossLanguageComparison: 'Comparaison multilingue (Quantum Global)',
    document1: 'Document 1 :', document2: 'Document 2 :', detectedDifferences: 'Différences détectées', section: 'Section', changeType: 'Type de modification', riskImpact: 'Impact sur le risque', description: 'Description', detailedComparisonReport: 'Rapport de comparaison détaillé'
  }
};

export function ct(language: string, key: string): string {
  const lang = getLanguage(language);
  return componentTranslations[lang]?.[key] ?? componentTranslations.EN[key] ?? key;
}
