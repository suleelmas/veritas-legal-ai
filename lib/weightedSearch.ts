// Ağırlıklı Arama - UCC ve Delaware Law için öncelik
// Ticari sözleşmelerde belirli kaynaklara daha fazla ağırlık ver

export interface WeightedDocument {
  document: any;
  weight: number;
  originalIndex: number;
}

/**
 * Ticari sözleşme anahtar kelimeleri
 */
const COMMERCIAL_KEYWORDS = [
  'contract', 'agreement', 'sale', 'purchase', 'lease', 'licensing',
  'merchant', 'commercial', 'transaction', 'business', 'corporation',
  'LLC', 'partnership', 'UCC', 'uniform commercial code',
  'delaware', 'incorporation', 'corporate', 'securities', 'trade'
];

/**
 * Belirli kaynaklar için ağırlık çarpanları
 */
const SOURCE_WEIGHTS: Record<string, number> = {
  // UCC ve Commercial Law için kritik kaynaklar
  'de': 1.2, // Delaware General Corporation Law (+20%)
  'ucc': 1.2, // Uniform Commercial Code (+20%)
  'uscode': 1.1, // US Code genel (+10%)
  'govinfo': 1.1,
  
  // Diğer kaynaklar için normal ağırlık
  'congress': 1.0,
  'scotus': 1.0,
  'courtlistener': 1.0,
  'openjurist': 1.0,
  'loc': 1.0,
  'ny': 1.0,
  'ca': 1.0,
  'federalregister': 1.0,
};

/**
 * Metadata'dan UCC veya Delaware referansı var mı kontrol et
 */
function hasCommercialReference(metadata: any): boolean {
  const source = (metadata?.source || '').toLowerCase();
  const content = metadata?.title || '';
  const lowerContent = content.toLowerCase();
  
  // Delaware
  if (source === 'de') return true;
  
  // UCC referansları
  if (lowerContent.includes('ucc') || 
      lowerContent.includes('uniform commercial code') ||
      source.includes('ucc')) {
    return true;
  }
  
  // Commercial law referansları
  if (lowerContent.includes('commercial') ||
      lowerContent.includes('corporation') ||
      lowerContent.includes('corporate law')) {
    return true;
  }
  
  return false;
}

/**
 * Belge içeriğinde ticari sözleşme terimleri var mı kontrol et
 */
export function isCommercialContract(text: string): boolean {
  const upperText = text.toUpperCase();
  
  return COMMERCIAL_KEYWORDS.some(keyword => 
    upperText.includes(keyword.toUpperCase())
  );
}

/**
 * Dokümanları ağırlıklı olarak sırala
 */
export function applyWeightedRanking(
  documents: Array<{ content: string; metadata: any }>,
  queryText: string = ''
): WeightedDocument[] {
  const isCommercial = isCommercialContract(queryText);
  
  const weighted: WeightedDocument[] = documents.map((doc, index) => {
    const metadata = doc.metadata || {};
    const source = (metadata.source || '').toLowerCase();
    
    // Başlangıç ağırlığı
    let weight = 1.0;
    
    // Ticari sözleşme ise özel ağırlık uygula
    if (isCommercial) {
      // Kaynak bazlı ağırlık
      const sourceWeight = SOURCE_WEIGHTS[source] || 1.0;
      weight *= sourceWeight;
      
      // UCC veya Delaware referansı varsa ekstra ağırlık
      if (hasCommercialReference(metadata)) {
        weight *= 1.2; // +20% ekstra
      }
      
      // Delaware state law ise
      if (source === 'de' && metadata.state === 'de') {
        weight *= 1.3; // +30% (ticari hukuk için en kritik)
      }
      
      // US Code'da commercial law bölümü
      if (source === 'uscode') {
        const title = (metadata.title || '').toLowerCase();
        if (title.includes('commercial') || 
            title.includes('ucc') ||
            title.includes('corporation')) {
          weight *= 1.25; // +25%
        }
      }
    }
    
    // Live fetch edilen dokümanlara biraz daha ağırlık ver (güncel)
    if (metadata.live) {
      weight *= 1.1;
    }
    
    // Tarih bazlı ağırlık (daha güncel = daha yüksek ağırlık)
    if (metadata.date) {
      try {
        const docDate = new Date(metadata.date);
        const now = new Date();
        const daysDiff = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // 1 yıldan eski dokümanlara daha az ağırlık
        if (daysDiff > 365) {
          weight *= 0.9;
        } else if (daysDiff < 90) {
          // 3 aydan yeni dokümanlara daha fazla ağırlık
          weight *= 1.15;
        }
      } catch {
        // Tarih parse edilemezse ağırlık değişmez
      }
    }
    
    return {
      document: doc,
      weight,
      originalIndex: index
    };
  });
  
  // Ağırlığa göre sırala (yüksek ağırlık önce)
  weighted.sort((a, b) => b.weight - a.weight);
  
  return weighted;
}

/**
 * Ağırlıklı dokümanları orijinal formata çevir
 */
export function getWeightedDocuments(
  weightedDocs: WeightedDocument[]
): Array<{ content: string; metadata: any; weight?: number }> {
  return weightedDocs.map(wd => ({
    ...wd.document,
    weight: wd.weight
  }));
}

