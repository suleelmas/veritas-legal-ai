// Jurisdiction Detection (Yargı Alanı Tespiti)
// Belge içeriğinden otomatik olarak yargı alanını tespit et

import { createClient } from '@/utils/supabase/server';

export interface JurisdictionScore {
  country: 'TR' | 'US' | 'UK' | 'DE' | 'OTHER';
  score: number;
  confidence: 'high' | 'medium' | 'low';
  indicators: string[];
}

export interface JurisdictionResult {
  primary_country: 'TR' | 'US' | 'UK' | 'DE' | 'OTHER';
  secondary_countries?: ('TR' | 'US' | 'UK' | 'DE')[];
  scores: JurisdictionScore[];
  cross_border: boolean;
  needs_user_confirmation: boolean;
}

/**
 * Para birimi tespiti
 */
function detectCurrency(text: string): { currency: string; country?: string }[] {
  const currencies: Array<{ symbol: string; country: string }> = [
    { symbol: '$', country: 'US' },
    { symbol: '€', country: 'DE' }, // Almanya ve diğer AB ülkeleri
    { symbol: '₺', country: 'TR' },
    { symbol: '£', country: 'UK' },
    { symbol: 'USD', country: 'US' },
    { symbol: 'EUR', country: 'DE' },
    { symbol: 'TRY', country: 'TR' },
    { symbol: 'GBP', country: 'UK' }
  ];
  
  const found: Array<{ currency: string; country?: string }> = [];
  
  for (const curr of currencies) {
    const regex = new RegExp(`\\${curr.symbol}|${curr.symbol}`, 'g');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      found.push({ currency: curr.symbol, country: curr.country });
    }
  }
  
  return found;
}

/**
 * Tarih formatı tespiti
 */
function detectDateFormat(text: string): { format: string; country?: string }[] {
  const formats: Array<{ pattern: RegExp; country: string }> = [
    { pattern: /\d{1,2}\.\d{1,2}\.\d{4}/g, country: 'DE' }, // DD.MM.YYYY (Almanya)
    { pattern: /\d{1,2}\/\d{1,2}\/\d{4}/g, country: 'US' }, // MM/DD/YYYY (ABD)
    { pattern: /\d{4}-\d{2}-\d{2}/g, country: 'TR' }, // YYYY-MM-DD (ISO, Türkiye)
    { pattern: /\d{1,2}\/\d{1,2}\/\d{4}/g, country: 'UK' }, // DD/MM/YYYY (İngiltere)
  ];
  
  const found: Array<{ format: string; country?: string }> = [];
  
  for (const fmt of formats) {
    const matches = text.match(fmt.pattern);
    if (matches && matches.length > 0) {
      found.push({ format: fmt.pattern.source, country: fmt.country });
    }
  }
  
  return found;
}

/**
 * Hukuki terminoloji tespiti
 */
function detectLegalTerminology(text: string): Record<string, number> {
  const upperText = text.toUpperCase();
  
  // Türkiye (TR) göstergeleri
  const trIndicators = [
    'MADDE', 'FIKRA', 'BENT', 'TÜRK', 'TÜRKİYE', 'TÜRKİYE BÜYÜK MİLLET MECLİSİ',
    'TBMM', 'YARGITAY', 'DANIŞTAY', 'ANAYASA MAHKEMESİ', 'AYM', 'KVKK',
    'TBK', 'HMK', 'İİK', 'BORÇLAR KANUNU', 'MEDENİ KANUN', 'TİCARET KANUNU',
    'RESMİ GAZETE', 'MEVZUAT', 'KARAR', 'İÇTİHAT'
  ];
  
  // Almanya (DE) göstergeleri
  const deIndicators = [
    '§', 'BGB', 'HGB', 'AKTG', 'STGB', 'BGH', 'BVERFG',
    'BÜRGERLICHES GESETZBUCH', 'HANDELSGESETZBUCH', 'AKTIENGESETZ',
    'STRAFGESETZBUCH', 'BUNDESGERICHTSHOF', 'BUNDESVERFASSUNGSGERICHT',
    'DEUTSCHLAND', 'GESELLSCHAFT', 'VERMÖGEN', 'SCHULDVERHÄLTNIS',
    'KAUFVERTRAG', 'MIETE', 'PACHT', 'BÜRGSCHAFT', 'HYPOTHEK',
    'GRUNDSCHULD', 'VERKÄUFER', 'KÄUFER', 'EIGENTUM', 'SACHMÄNGEL',
    'RECHTSMÄNGEL', 'GMBH', 'GESCHÄFTSFÜHRER'
  ];
  
  // İngiltere (UK) göstergeleri
  const ukIndicators = [
    'LIMITED', 'LTD', 'LLP', 'PLC', 'UK', 'UNITED KINGDOM', 'ENGLAND',
    'WALES', 'SCOTLAND', 'NORTHERN IRELAND', 'EWHC', 'EWCA', 'UKSC',
    'HIGH COURT', 'COURT OF APPEAL', 'SUPREME COURT', 'HOUSE OF LORDS',
    'STATUTORY INSTRUMENT', 'SI ', 'ACT ', 'LEGISLATION.GOV.UK',
    'RETAINED EU LAW', 'BREXIT', 'DEED', 'COVENANT', 'INDEMNITY'
  ];
  
  // ABD (US) göstergeleri
  const usIndicators = [
    'SCOTUS', 'SUPREME COURT', 'CONGRESS', 'FEDERAL', 'US CODE', 'U.S.C.',
    'FEDERAL REGISTER', 'CONSTITUTION', 'AMENDMENT', 'STATE', 'DELAWARE',
    'NEW YORK', 'CALIFORNIA', 'LLC', 'CORPORATION', 'INC.', 'UCC',
    'UNIFORM COMMERCIAL CODE', 'DELAWARE GENERAL CORPORATION LAW',
    'COURTLISTENER', 'OPENJURIST', 'GOVINFO', 'LIBRARY OF CONGRESS'
  ];
  
  const scores: Record<string, number> = {
    TR: 0,
    DE: 0,
    UK: 0,
    US: 0
  };
  
  // TR skorları
  trIndicators.forEach(term => {
    const matches = upperText.match(new RegExp(term, 'g'));
    if (matches) {
      scores.TR += matches.length;
    }
  });
  
  // DE skorları
  deIndicators.forEach(term => {
    const matches = upperText.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    if (matches) {
      scores.DE += matches.length;
    }
  });
  
  // UK skorları
  ukIndicators.forEach(term => {
    const matches = upperText.match(new RegExp(term, 'g'));
    if (matches) {
      scores.UK += matches.length;
    }
  });
  
  // US skorları
  usIndicators.forEach(term => {
    const matches = upperText.match(new RegExp(term, 'g'));
    if (matches) {
      scores.US += matches.length;
    }
  });
  
  return scores;
}

/**
 * Vektör onayı - Supabase metadata ile karşılaştırma
 */
async function vectorConfirmation(text: string, topN: number = 3): Promise<Record<string, number>> {
  try {
    const supabase = await createClient();
    
    // İlk 500 kelimeyi al
    const words = text.split(/\s+/).slice(0, 500).join(' ');
    
    // OpenAI embedding oluştur (multilingual model)
    const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: words,
        model: 'text-embedding-3-small' // Multilingual support
      })
    });
    
    if (!embeddingResp.ok) {
      return {};
    }
    
    const embeddingData = await embeddingResp.json();
    if (!embeddingData.data || !embeddingData.data[0]) {
      return {};
    }
    
    const queryEmbedding = embeddingData.data[0].embedding;
    
    // Supabase'de benzer belgeleri bul
    try {
      const { data: documents } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.6, // Daha düşük threshold (genel benzerlik için)
        match_count: topN * 10 // Daha fazla sonuç al
      });
      
      if (!documents || documents.length === 0) {
        return {};
      }
      
      // Country bazlı skorlama
      const countryScores: Record<string, number> = {
        TR: 0,
        DE: 0,
        UK: 0,
        US: 0
      };
      
      documents.forEach((doc: any) => {
        const country = doc.metadata?.country;
        if (country && ['TR', 'DE', 'UK', 'US'].includes(country)) {
          // Similarity score'u kullan (eğer varsa)
          const similarity = doc.similarity || 1.0;
          countryScores[country] += similarity;
        }
      });
      
      return countryScores;
    } catch (rpcError) {
      console.log('RPC function not found, using direct query');
      return {};
    }
  } catch (err) {
    console.error('Vector confirmation error:', err);
    return {};
  }
}

/**
 * Çapraz kontrol - Cross-border tespiti
 */
function detectCrossBorder(text: string, primaryCountry: string): {
  isCrossBorder: boolean;
  referencedCountries: string[];
} {
  const upperText = text.toUpperCase();
  const referencedCountries: string[] = [];
  
  // Ülke referansları
  const countryPatterns: Record<string, RegExp[]> = {
    TR: [/TÜRK[İI]YE?/g, /TURKEY/g, /TÜRK HUKUKU/g, /TURKISH LAW/g],
    DE: [/DEUTSCHLAND/g, /GERMANY/g, /ALMANYA/g, /GERMAN LAW/g, /DEUTSCHES RECHT/g],
    UK: [/UNITED KINGDOM/g, /ENGLAND/g, /WALES/g, /SCOTLAND/g, /UK LAW/g, /ENGLISH LAW/g],
    US: [/UNITED STATES/g, /USA/g, /AMERICA/g, /US LAW/g, /AMERICAN LAW/g]
  };
  
  // Tahkim yeri, uygulanacak hukuk, yargı yetkisi gibi ifadeler
  const jurisdictionKeywords = [
    'TAHKİM YERİ', 'ARBITRATION', 'SCHIEDSGERICHT',
    'UYGULANACAK HUKUK', 'APPLICABLE LAW', 'GELTENDES RECHT',
    'YARGI YETKİSİ', 'JURISDICTION', 'GERICHTSSTAND',
    'GOVERNING LAW', 'CHOICE OF LAW'
  ];
  
  const hasJurisdictionClause = jurisdictionKeywords.some(keyword => 
    upperText.includes(keyword)
  );
  
  // Her ülke için referans kontrolü
  Object.keys(countryPatterns).forEach(country => {
    if (country === primaryCountry) return; // Primary country'yi atla
    
    const patterns = countryPatterns[country];
    const found = patterns.some(pattern => pattern.test(upperText));
    
    if (found) {
      referencedCountries.push(country);
    }
  });
  
  const isCrossBorder = hasJurisdictionClause && referencedCountries.length > 0;
  
  return {
    isCrossBorder,
    referencedCountries
  };
}

/**
 * Ana fonksiyon - Jurisdiction Detection
 */
export async function detectJurisdiction(
  text: string,
  options: {
    useVectorConfirmation?: boolean;
    minConfidence?: 'high' | 'medium' | 'low';
  } = {}
): Promise<JurisdictionResult> {
  const { useVectorConfirmation = true, minConfidence = 'low' } = options;
  
  // 1. Para birimi tespiti
  const currencies = detectCurrency(text);
  const currencyScores: Record<string, number> = { TR: 0, DE: 0, UK: 0, US: 0 };
  currencies.forEach(curr => {
    if (curr.country) {
      currencyScores[curr.country] += 2; // Para birimi güçlü gösterge
    }
  });
  
  // 2. Tarih formatı tespiti
  const dateFormats = detectDateFormat(text);
  const dateScores: Record<string, number> = { TR: 0, DE: 0, UK: 0, US: 0 };
  dateFormats.forEach(fmt => {
    if (fmt.country) {
      dateScores[fmt.country] += 1;
    }
  });
  
  // 3. Hukuki terminoloji tespiti
  const terminologyScores = detectLegalTerminology(text);
  
  // 4. Özel karakterler ve işaretler
  const specialCharScores: Record<string, number> = { TR: 0, DE: 0, UK: 0, US: 0 };
  
  // § işareti (Almanya)
  if (text.includes('§')) {
    specialCharScores.DE += 5; // Çok güçlü gösterge
  }
  
  // Umlaut karakterleri (Almanya)
  if (/[äöüßÄÖÜ]/.test(text)) {
    specialCharScores.DE += 3;
  }
  
  // 5. Vektör onayı (opsiyonel)
  let vectorScores: Record<string, number> = {};
  if (useVectorConfirmation) {
    vectorScores = await vectorConfirmation(text, 5);
    // Vector scores'u normalize et (0-10 arası)
    const maxVectorScore = Math.max(...Object.values(vectorScores), 1);
    Object.keys(vectorScores).forEach(country => {
      vectorScores[country] = (vectorScores[country] / maxVectorScore) * 10;
    });
  }
  
  // 6. Toplam skorları hesapla
  const totalScores: Record<string, number> = { TR: 0, DE: 0, UK: 0, US: 0 };
  
  ['TR', 'DE', 'UK', 'US'].forEach(country => {
    totalScores[country] = 
      currencyScores[country] +
      dateScores[country] +
      terminologyScores[country] +
      specialCharScores[country] +
      (vectorScores[country] || 0);
  });
  
  // 7. En yüksek skoru bul
  const sortedCountries = Object.entries(totalScores)
    .sort((a, b) => b[1] - a[1])
    .map(([country, score]) => ({ country: country as 'TR' | 'US' | 'UK' | 'DE', score }));
  
  const primaryCountry = sortedCountries[0].country;
  const primaryScore = sortedCountries[0].score;
  const secondaryScore = sortedCountries[1]?.score || 0;
  
  // 8. Confidence hesapla
  const scoreDifference = primaryScore - secondaryScore;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  if (primaryScore > 20 && scoreDifference > 10) {
    confidence = 'high';
  } else if (primaryScore > 10 && scoreDifference > 5) {
    confidence = 'medium';
  }
  
  // 9. Çapraz kontrol
  const crossBorder = detectCrossBorder(text, primaryCountry);
  
  // 10. Kullanıcı onayı gerekip gerekmediğini belirle
  const needsUserConfirmation = 
    confidence === 'low' || 
    (confidence === 'medium' && scoreDifference < 8) ||
    crossBorder.isCrossBorder;
  
  // 11. Secondary countries (eğer skorları yeterince yüksekse)
  const secondaryCountries = sortedCountries
    .slice(1)
    .filter(item => item.score > primaryScore * 0.5) // Primary'den en az %50 skor
    .map(item => item.country);
  
  // 12. Indicators topla
  const indicators: Record<string, string[]> = {
    TR: [],
    DE: [],
    UK: [],
    US: []
  };
  
  if (currencyScores.TR > 0) indicators.TR.push('Para birimi: ₺');
  if (dateScores.TR > 0) indicators.TR.push('Tarih formatı: YYYY-MM-DD');
  if (terminologyScores.TR > 0) indicators.TR.push(`Terminoloji: ${terminologyScores.TR} eşleşme`);
  
  if (currencyScores.DE > 0) indicators.DE.push('Para birimi: €');
  if (dateScores.DE > 0) indicators.DE.push('Tarih formatı: DD.MM.YYYY');
  if (specialCharScores.DE > 0) indicators.DE.push('§ paragraf işareti');
  if (/[äöüßÄÖÜ]/.test(text)) indicators.DE.push('Umlaut karakterleri');
  if (terminologyScores.DE > 0) indicators.DE.push(`Terminoloji: ${terminologyScores.DE} eşleşme`);
  
  if (currencyScores.UK > 0) indicators.UK.push('Para birimi: £');
  if (dateScores.UK > 0) indicators.UK.push('Tarih formatı: DD/MM/YYYY');
  if (terminologyScores.UK > 0) indicators.UK.push(`Terminoloji: ${terminologyScores.UK} eşleşme`);
  
  if (currencyScores.US > 0) indicators.US.push('Para birimi: $');
  if (dateScores.US > 0) indicators.US.push('Tarih formatı: MM/DD/YYYY');
  if (terminologyScores.US > 0) indicators.US.push(`Terminoloji: ${terminologyScores.US} eşleşme`);
  
  const scores: JurisdictionScore[] = sortedCountries.map(item => ({
    country: item.country,
    score: item.score,
    confidence: item.country === primaryCountry ? confidence : 'low',
    indicators: indicators[item.country] || []
  }));
  
  return {
    primary_country: primaryCountry,
    secondary_countries: secondaryCountries.length > 0 ? secondaryCountries : undefined,
    scores,
    cross_border: crossBorder.isCrossBorder,
    needs_user_confirmation: needsUserConfirmation
  };
}

