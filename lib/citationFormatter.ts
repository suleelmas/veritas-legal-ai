// Bluebook Citation Formatter - ABD Hukuk Atıf Standartları
// Bluebook 21st Edition formatı

export interface LegalCitation {
  caseName?: string;
  volume?: number;
  reporter?: string;
  firstPage?: number;
  court?: string;
  year?: number;
  type: 'case' | 'statute' | 'regulation' | 'secondary';
  title?: string; // For statutes
  section?: string; // For statutes
  url?: string;
}

/**
 * Bluebook Citation Formatı
 * Case: Case Name, Volume Reporter First Page (Court Year)
 * Statute: Title U.S.C. § Section (Year)
 * Federal Register: Volume Fed. Reg. Page Number (Year)
 */
export function formatBluebookCitation(citation: LegalCitation): string {
  if (!citation) return '';

  switch (citation.type) {
    case 'case':
      // Case Name, Volume Reporter First Page (Court Year)
      const parts: string[] = [];
      
      if (citation.caseName) {
        parts.push(citation.caseName);
      }
      
      if (citation.volume && citation.reporter && citation.firstPage) {
        parts.push(`${citation.volume} ${citation.reporter} ${citation.firstPage}`);
      }
      
      const courtYear: string[] = [];
      if (citation.court) {
        courtYear.push(citation.court);
      }
      if (citation.year) {
        courtYear.push(citation.year.toString());
      }
      
      if (courtYear.length > 0) {
        parts.push(`(${courtYear.join(' ')})`);
      }
      
      return parts.join(', ');

    case 'statute':
      // Title U.S.C. § Section (Year)
      const statuteParts: string[] = [];
      
      if (citation.title) {
        statuteParts.push(citation.title);
      }
      
      statuteParts.push('U.S.C.');
      
      if (citation.section) {
        statuteParts.push(`§ ${citation.section}`);
      }
      
      if (citation.year) {
        statuteParts.push(`(${citation.year})`);
      }
      
      return statuteParts.join(' ');

    case 'regulation':
      // Volume Fed. Reg. Page Number (Year)
      if (citation.volume && citation.firstPage && citation.year) {
        return `${citation.volume} Fed. Reg. ${citation.firstPage} (${citation.year})`;
      }
      break;

    case 'secondary':
      // For law reviews, treatises, etc.
      if (citation.title) {
        return citation.title;
      }
      break;
  }

  return '';
}

/**
 * Metadata'dan Bluebook citation oluştur
 */
export function generateCitationFromMetadata(metadata: any): string {
  const source = metadata?.source || '';
  const title = metadata?.title || '';
  const date = metadata?.date;
  const year = date ? new Date(date).getFullYear() : new Date().getFullYear();

  // Case citations
  if (['scotus', 'courtlistener', 'openjurist'].includes(source.toLowerCase())) {
    return formatBluebookCitation({
      type: 'case',
      caseName: title.replace(/^(SCOTUS|CourtListener|OpenJurist):\s*/, ''),
      court: source === 'scotus' ? 'U.S.' : 'Fed. Cir.',
      year: year
    });
  }

  // US Code citations
  if (source === 'uscode') {
    // Try to extract title and section from title or content
    const titleMatch = title.match(/Title\s+(\d+)/i);
    const sectionMatch = title.match(/§\s*(\d+[.\d]*)/i) || title.match(/Section\s+(\d+[.\d]*)/i);
    
    return formatBluebookCitation({
      type: 'statute',
      title: titleMatch ? titleMatch[1] : undefined,
      section: sectionMatch ? sectionMatch[1] : undefined,
      year: year
    });
  }

  // Federal Register
  if (source === 'federalregister') {
    return formatBluebookCitation({
      type: 'regulation',
      volume: year - 1936, // Approximate volume calculation
      firstPage: 1, // Would need actual page number from metadata
      year: year
    });
  }

  // State laws
  if (['ny', 'ca', 'de'].includes(source.toLowerCase())) {
    const stateNames: Record<string, string> = {
      'ny': 'N.Y.',
      'ca': 'Cal.',
      'de': 'Del.'
    };
    
    return formatBluebookCitation({
      type: 'statute',
      title: stateNames[source.toLowerCase()] || source.toUpperCase(),
      section: undefined,
      year: year
    });
  }

  // Default: return formatted title
  return title || '';
}

/**
 * Analiz sonucuna citation formatı ekle
 */
export function formatAnalysisWithCitations(
  analysisText: string,
  documents: Array<{ content: string; metadata: any }>
): string {
  let formatted = analysisText;

  // Her doküman için citation ekle
  const citations: string[] = [];
  documents.forEach((doc, idx) => {
    const citation = generateCitationFromMetadata(doc.metadata);
    if (citation) {
      citations.push(`${idx + 1}. ${citation}`);
    }
  });

  if (citations.length > 0) {
    formatted += '\n\n---\n\n**Citations (Bluebook Format):**\n\n' + citations.join('\n');
  }

  return formatted;
}


