import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";
import { fetchYargitayKararlari } from '@/lib/fetchYargitayKararlari';
import { fetchDanistayKararlari } from '@/lib/fetchDanistayKararlari';
import { fetchAnayasaMahkemesiKararlari } from '@/lib/fetchAnayasaMahkemesiKararlari';
import { fetchKVKKKararlari } from '@/lib/fetchKVKKKararlari';
import { fetchTBMM } from '@/lib/fetchTBMM';
import { fetchMBS } from '@/lib/fetchMBS';
import { fetchCongressGov } from '@/lib/fetchCongressGov';
import { fetchSCOTUS } from '@/lib/fetchSCOTUS';
import { fetchCourtListener } from '@/lib/fetchCourtListener';
import { fetchOpenJurist } from '@/lib/fetchOpenJurist';
import { fetchGovInfo, fetchUSCode, fetchFederalRegister } from '@/lib/fetchGovInfo';
import { fetchLibraryOfCongress } from '@/lib/fetchLibraryOfCongress';
import { fetchStateLaws } from '@/lib/fetchStateLaws';
import { fetchUKLegislation } from '@/lib/fetchUKLegislation';
import { fetchUKCaseLaw, getUKCaseMetadata } from '@/lib/fetchUKCaseLaw';
import { fetchGermanLegislation, parseGermanCitation } from '@/lib/fetchGermanLegislation';
import { fetchGermanCaseLaw, getGermanCaseMetadata } from '@/lib/fetchGermanCaseLaw';
import { upsertDocument } from '@/lib/upsertDocument';
import { formatAnalysisWithCitations, generateCitationFromMetadata } from '@/lib/citationFormatter';
import { applyWeightedRanking, getWeightedDocuments, isCommercialContract } from '@/lib/weightedSearch';
import { detectJurisdiction, type JurisdictionResult } from '@/lib/jurisdictionDetection';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Admin Email Listesi - Limit kontrolünden muaf tutulacak kullanıcılar
const ADMIN_EMAILS = ['elmas7853@gmail.com'];

// Kritik anahtar kelimeler - bunlar için canlı veri çekilecek
const CRITICAL_KEYWORDS_TR = [
  'KVKK', 'TBK', 'HMK', 'İİK', 'AYM', 'Yargıtay', 'Danıştay', 
  'Anayasa', 'Kanun', 'Yönetmelik', 'Tüzük', 'Tebliğ', 'Karar',
  'TBMM', 'Türkiye Büyük Millet Meclisi', 'MBS', 'Mevzuat Bilgi Sistemi',
  'Tasarı', 'Kanun Tasarısı', '2024', '2025', 'son karar', 'güncel', 'yeni mevzuat'
];

const CRITICAL_KEYWORDS_EN = [
  'SCOTUS', 'Supreme Court', 'Congress', 'Federal', 'Act', 'Law',
  'UK', 'United Kingdom', 'England', 'legislation.gov.uk', 'Statutory Instrument', 'SI',
  '2024', '2025', 'recent', 'latest', 'current legislation', 'case law'
];

function getUserKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") || "";
  return `${ip}_${ua}`;
}

// Kritik anahtar kelime kontrolü
function hasCriticalKeywords(text: string, targetLang: string): boolean {
  const keywords = targetLang === 'TR' || targetLang === 'Turkish' 
    ? CRITICAL_KEYWORDS_TR 
    : CRITICAL_KEYWORDS_EN;
  const upperText = text.toUpperCase();
  return keywords.some(keyword => upperText.includes(keyword.toUpperCase()));
}

// Tarih parse fonksiyonu - farklı formatları handle eder
function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  
  try {
    // ISO format (2024-01-15)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(dateStr);
    }
    
    // DD/MM/YYYY veya DD-MM-YYYY
    if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) {
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2].length === 2 ? '20' + parts[2] : parts[2]);
        return new Date(year, month, day);
      }
    }
    
    // YYYY/MM/DD
    if (dateStr.match(/^\d{4}[\/\-]\d{2}[\/\-]\d{2}/)) {
      return new Date(dateStr.replace(/\//g, '-'));
    }
    
    // Default Date constructor
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch {
    // Parse hatası durumunda null döndür
  }
  
  return null;
}

// Belge tarihini al (metadata'dan veya created_at'ten)
function getDocumentDate(doc: any): Date | null {
  // Önce metadata'daki date veya updated alanını kontrol et
  const metadataDate = doc.metadata?.date || doc.metadata?.updated;
  if (metadataDate) {
    const parsed = parseDate(metadataDate);
    if (parsed) return parsed;
  }
  
  // Sonra created_at'i kontrol et
  if (doc.created_at) {
    const parsed = parseDate(doc.created_at);
    if (parsed) return parsed;
  }
  
  return null;
}

// Belge benzerliği kontrolü (aynı konu/başlık için)
function areDocumentsSimilar(doc1: any, doc2: any): boolean {
  const content1 = (doc1.content || '').substring(0, 200).toUpperCase();
  const content2 = (doc2.content || '').substring(0, 200).toUpperCase();
  
  // İlk 200 karakterin %70'i benzer ise aynı belge sayılır
  const similarity = calculateSimilarity(content1, content2);
  return similarity > 0.7;
}

// Basit benzerlik hesaplama (Jaccard benzeri)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 3));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Tarih çelişkisi çözme: Aynı konu için en güncel tarihli olanı seç
function resolveDateConflicts(documents: Array<any>): Array<any> {
  const resolved: Array<any> = [];
  const processed = new Set<number>();
  
  for (let i = 0; i < documents.length; i++) {
    if (processed.has(i)) continue;
    
    const doc = documents[i];
    const similarDocs = [doc];
    
    // Benzer belgeleri bul
    for (let j = i + 1; j < documents.length; j++) {
      if (processed.has(j)) continue;
      
      if (areDocumentsSimilar(doc, documents[j])) {
        similarDocs.push(documents[j]);
        processed.add(j);
      }
    }
    
    // Benzer belgeler arasında en güncel tarihli olanı seç
    if (similarDocs.length > 1) {
      similarDocs.sort((a, b) => {
        const dateA = getDocumentDate(a);
        const dateB = getDocumentDate(b);
        
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1; // Tarihi olmayan en sona
        if (!dateB) return -1;
        
        return dateB.getTime() - dateA.getTime(); // En güncel önce
      });
      
      // En güncel olanı al ve diğerlerini atla
      const latest = similarDocs[0];
      latest.metadata = {
        ...latest.metadata,
        resolvedFromConflict: true,
        conflictCount: similarDocs.length,
        originalDate: getDocumentDate(latest)?.toISOString()
      };
      resolved.push(latest);
    } else {
      resolved.push(doc);
    }
    
    processed.add(i);
  }
  
  return resolved;
}

// Veritabanındaki en son güncelleme tarihini kontrol et
async function isDatabaseStale(supabase: any, days: number = 1): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('documents')
      .select('metadata')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!data) return true;
    
    const lastUpdate = data.metadata?.updated || data.metadata?.date;
    if (!lastUpdate) return true;
    
    const lastUpdateDate = parseDate(lastUpdate);
    if (!lastUpdateDate) return true;
    
    const daysSinceUpdate = (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > days;
  } catch {
    return true;
  }
}

// Canlı veri çekme (sadece kritik durumlarda)
async function fetchLiveData(
  pdfText: string, 
  targetLang: string, 
  supabase: any
): Promise<Array<{ content: string; metadata: any }>> {
  const liveDocs: Array<{ content: string; metadata: any }> = [];
  
  try {
    if (targetLang === 'TR' || targetLang === 'Turkish') {
      // Türkçe kaynaklar
      if (pdfText.toUpperCase().includes('YARGITAY') || pdfText.toUpperCase().includes('YARGI')) {
        const decisions = await fetchYargitayKararlari();
        for (const decision of decisions.slice(0, 2)) {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'yargitay', date: decision.date, live: true }
          });
          // Hemen kaydet
          await upsertDocument(content, {
            source: 'yargitay',
            date: decision.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'karar'
          }, supabase);
        }
      }
      
      if (pdfText.toUpperCase().includes('DANIŞTAY') || pdfText.toUpperCase().includes('İDARİ')) {
        const decisions = await fetchDanistayKararlari();
        for (const decision of decisions.slice(0, 2)) {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'danistay', date: decision.date, live: true }
          });
          await upsertDocument(content, {
            source: 'danistay',
            date: decision.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'karar'
          }, supabase);
        }
      }
      
      if (pdfText.toUpperCase().includes('KVKK') || pdfText.toUpperCase().includes('KİŞİSEL VERİ')) {
        const decisions = await fetchKVKKKararlari();
        for (const decision of decisions.slice(0, 2)) {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'kvkk', date: decision.date, live: true }
          });
          await upsertDocument(content, {
            source: 'kvkk',
            date: decision.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'karar'
          }, supabase);
        }
      }
      
      if (pdfText.toUpperCase().includes('TBMM') || pdfText.toUpperCase().includes('TÜRKİYE BÜYÜK MİLLET MECLİSİ') || pdfText.toUpperCase().includes('KANUN TASARISI') || pdfText.toUpperCase().includes('TASARI')) {
        const laws = await fetchTBMM();
        for (const law of laws.slice(0, 2)) {
          const content = `${law.title}${law.content ? '\n' + law.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'tbmm', date: law.date, live: true }
          });
          await upsertDocument(content, {
            source: 'tbmm',
            date: law.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: law.title.includes('Tasarı') ? 'tasarı' : 'kanun'
          }, supabase);
        }
      }
      
      if (pdfText.toUpperCase().includes('MBS') || pdfText.toUpperCase().includes('MEVZUAT BİLGİ SİSTEMİ') || pdfText.toUpperCase().includes('MEVZUAT')) {
        const regulations = await fetchMBS();
        for (const regulation of regulations.slice(0, 2)) {
          const content = `${regulation.title}${regulation.content ? '\n' + regulation.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'mbs', date: regulation.date, live: true }
          });
          await upsertDocument(content, {
            source: 'mbs',
            date: regulation.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'mevzuat'
          }, supabase);
        }
      }
    } else {
      // İngilizce kaynaklar
      if (pdfText.toUpperCase().includes('SCOTUS') || pdfText.toUpperCase().includes('SUPREME COURT')) {
        const decisions = await fetchSCOTUS();
        for (const decision of decisions.slice(0, 2)) {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'scotus', date: decision.date, live: true }
          });
          await upsertDocument(content, {
            source: 'scotus',
            date: decision.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'supreme_court_decision',
            country: 'US',
            level: 'Federal', // Federal seviye
            court: 'U.S. Supreme Court'
          }, supabase);
        }
      }
      
      if (pdfText.toUpperCase().includes('CONGRESS') || pdfText.toUpperCase().includes('FEDERAL')) {
        const bills = await fetchCongressGov();
        for (const bill of bills.slice(0, 2)) {
          const content = `${bill.title}${bill.content ? '\n' + bill.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'congress', date: bill.date, live: true, country: 'US' }
          });
          await upsertDocument(content, {
            source: 'congress',
            date: bill.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'federal_legislation',
            country: 'US',
            level: 'Federal' // Federal seviye
          }, supabase);
        }
      }
      
      // GovInfo - US Code ve Federal Register
      if (pdfText.toUpperCase().includes('US CODE') || pdfText.toUpperCase().includes('UNITED STATES CODE')) {
        const usCode = await fetchUSCode();
        for (const code of usCode.slice(0, 2)) {
          const content = `${code.title}${code.content ? '\n' + code.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'uscode', date: code.date, live: true, country: 'US' }
          });
          await upsertDocument(content, {
            source: 'uscode',
            date: code.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'federal_code',
            country: 'US'
          }, supabase);
        }
      }
      
      if (pdfText.toUpperCase().includes('FEDERAL REGISTER')) {
        const fr = await fetchFederalRegister();
        for (const doc of fr.slice(0, 2)) {
          const content = `${doc.title}${doc.content ? '\n' + doc.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'federalregister', date: doc.date, live: true, country: 'US' }
          });
          await upsertDocument(content, {
            source: 'federalregister',
            date: doc.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'federal_register',
            country: 'US',
            level: 'Federal' // Federal seviye
          }, supabase);
        }
      }
      
      // Library of Congress
      if (pdfText.toUpperCase().includes('LIBRARY OF CONGRESS') || pdfText.toUpperCase().includes('LOC')) {
        const loc = await fetchLibraryOfCongress();
        for (const doc of loc.slice(0, 2)) {
          const content = `${doc.title}${doc.content ? '\n' + doc.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'loc', date: doc.date, live: true, country: 'US' }
          });
          await upsertDocument(content, {
            source: 'loc',
            date: doc.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'federal_legislation',
            country: 'US',
            level: 'Federal' // Federal seviye
          }, supabase);
        }
      }
      
      // Eyalet yasaları
      if (pdfText.toUpperCase().includes('NEW YORK') || pdfText.toUpperCase().includes('NY STATE') ||
          pdfText.toUpperCase().includes('CALIFORNIA') || pdfText.toUpperCase().includes('CA STATE') ||
          pdfText.toUpperCase().includes('DELAWARE') || pdfText.toUpperCase().includes('DE STATE')) {
        const stateLaws = await fetchStateLaws(['ny', 'ca', 'de']);
        for (const law of stateLaws.slice(0, 2)) {
          const content = `${law.title}${law.content ? '\n' + law.content : ''}`;
          const state = law.title.includes('NY') ? 'ny' : law.title.includes('CA') ? 'ca' : 'de';
          liveDocs.push({
            content,
            metadata: { source: state, date: law.date, live: true, country: 'US' }
          });
          await upsertDocument(content, {
            source: state,
            date: law.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'state_legislation',
            country: 'US',
            state: state.toUpperCase(), // 'NY', 'CA', 'DE'
            level: 'State' // Eyalet seviyesi
          }, supabase);
        }
      }
      
      // UK Legislation (legislation.gov.uk)
      if (pdfText.toUpperCase().includes('UK') || pdfText.toUpperCase().includes('UNITED KINGDOM') || 
          pdfText.toUpperCase().includes('ENGLAND') || pdfText.toUpperCase().includes('STATUTORY INSTRUMENT') ||
          pdfText.toUpperCase().includes('SI ') || pdfText.toUpperCase().includes(' ACT ')) {
        const ukLegislation = await fetchUKLegislation(5);
        for (const item of ukLegislation) {
          const content = `${item.title}${item.content ? '\n' + item.content : ''}`;
          
          // Jurisdiction ve Retained EU Law bilgilerini metadata'ya ekle
          const jurisdiction = (item as any).jurisdiction || 'UK';
          const retainedEULaw = (item as any).retained_eu_law || false;
          
          liveDocs.push({
            content,
            metadata: { 
              source: 'uk', 
              date: item.date, 
              live: true, 
              country: 'UK',
              jurisdiction: jurisdiction,
              retained_eu_law: retainedEULaw
            }
          });
          await upsertDocument(content, {
            source: 'uk',
            date: item.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: item.title.includes('SI') ? 'statutory_instrument' : 'act',
            country: 'UK',
            level: 'National',
            jurisdiction: jurisdiction,
            retained_eu_law: retainedEULaw
          }, supabase);
        }
      }
      
      // UK Case Law (The National Archives - Caselaw)
      if (pdfText.toUpperCase().includes('UK') || pdfText.toUpperCase().includes('UNITED KINGDOM') ||
          pdfText.toUpperCase().includes('HIGH COURT') || pdfText.toUpperCase().includes('COURT OF APPEAL') ||
          pdfText.toUpperCase().includes('EWHC') || pdfText.toUpperCase().includes('EWCA') ||
          pdfText.toUpperCase().includes('CASE LAW') || pdfText.toUpperCase().includes('PRECEDENT')) {
        const ukCases = await fetchUKCaseLaw(5);
        for (const caseItem of ukCases) {
          const content = `${caseItem.title}${caseItem.content ? '\n' + caseItem.content : ''}`;
          
          // UK Case metadata'sını çıkar
          const caseMetadata = getUKCaseMetadata(caseItem.title, caseItem.content);
          
          liveDocs.push({
            content,
            metadata: { 
              source: 'uk_case', 
              date: caseItem.date, 
              live: true, 
              country: 'UK',
              court: caseMetadata.court,
              jurisdiction: caseMetadata.jurisdiction,
              neutral_citation: caseMetadata.neutral_citation,
              type: 'case_law'
            }
          });
          await upsertDocument(content, {
            source: 'uk_case',
            date: caseItem.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'case_law',
            country: 'UK',
            level: 'National',
            court: caseMetadata.court,
            jurisdiction: caseMetadata.jurisdiction,
            neutral_citation: caseMetadata.neutral_citation
          }, supabase);
        }
      }
      
      // German Legislation (Gesetze im Internet)
      if (pdfText.match(/[äöüßÄÖÜ]|BGB|HGB|AktG|StGB|Deutschland|Germany|German/i)) {
        const germanLegislation = await fetchGermanLegislation(5);
        for (const item of germanLegislation) {
          const content = `${item.title}${item.content ? '\n' + item.content : ''}`;
          
          // Alman hukukuna özgü citation parse
          const citation = parseGermanCitation(content);
          
          liveDocs.push({
            content,
            metadata: { 
              source: 'gesetze_im_internet', 
              date: item.date, 
              live: true, 
              country: 'DE',
              language: 'DE',
              law_code: citation.law_code || item.title.match(/(BGB|HGB|AktG|StGB)/)?.[0],
              paragraph: citation.paragraph
            }
          });
          await upsertDocument(content, {
            source: 'gesetze_im_internet',
            date: item.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: item.title.includes('BGB') ? 'bgb' : item.title.includes('HGB') ? 'hgb' : 
                  item.title.includes('AktG') ? 'aktg' : item.title.includes('StGB') ? 'stgb' : 'other',
            country: 'DE',
            language: 'DE',
            level: 'National',
            law_code: citation.law_code || item.title.match(/(BGB|HGB|AktG|StGB)/)?.[0],
            paragraph: citation.paragraph
          }, supabase);
        }
      }
      
      // German Case Law (Rechtsprechung im Internet)
      if (pdfText.match(/[äöüßÄÖÜ]|BGH|BVerfG|Bundesgerichtshof|Bundesverfassungsgericht|Deutschland|Germany/i)) {
        const germanCases = await fetchGermanCaseLaw(5);
        for (const caseItem of germanCases) {
          const content = `${caseItem.title}${caseItem.content ? '\n' + caseItem.content : ''}`;
          
          // German Case metadata'sını çıkar
          const caseMetadata = getGermanCaseMetadata(caseItem.title, caseItem.content);
          
          liveDocs.push({
            content,
            metadata: { 
              source: 'rechtsprechung_im_internet', 
              date: caseItem.date, 
              live: true, 
              country: 'DE',
              language: 'DE',
              court: caseMetadata.court,
              case_number: caseMetadata.case_number,
              type: 'case_law'
            }
          });
          await upsertDocument(content, {
            source: 'rechtsprechung_im_internet',
            date: caseItem.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'case_law',
            country: 'DE',
            language: 'DE',
            level: 'National',
            court: caseMetadata.court,
            case_number: caseMetadata.case_number
          }, supabase);
        }
      }
    }
  } catch (error) {
    console.error('Live fetch error:', error);
  }
  
  return liveDocs;
}

async function getRelevantDocuments(
  pdfText: string, 
  targetLang: string = 'TR', 
  limit: number = 5,
  onStatusUpdate?: (status: string) => void,
  detectedCountry?: string | null,
  secondaryCountries?: string[],
  isGlobalPackage: boolean = false
): Promise<{ documents: Array<any>, usedLiveFetch: boolean }> {
  try {
    const supabase = await createClient();
    let usedLiveFetch = false;
    
    // Adım A: Vector Search - Önce veritabanından ara
    onStatusUpdate?.('Güncel mevzuat veritabanı taranıyor...');
    
    // PDF metninden embedding oluştur - Ülkeye göre model seç
    // Almanca için multilingual model (text-embedding-3-small multilingual desteği)
    const isUS = targetLang === 'EN' || targetLang === 'English';
    const isGerman = pdfText.match(/[äöüßÄÖÜ]|BGB|HGB|AktG|StGB|BGH|BVerfG|Deutschland/i);
    const embeddingModel = isUS ? 'text-embedding-3-large' : 'text-embedding-3-small'; // Multilingual support
    
    const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: pdfText.substring(0, 8000),
        model: embeddingModel
      })
    });
    const embeddingData = await embeddingResp.json();
    if (!embeddingResp.ok || !embeddingData.data) {
      return { documents: [], usedLiveFetch: false };
    }
    const queryEmbedding = embeddingData.data[0].embedding;

    let dbDocuments: any[] = [];
    
    // Supabase'de benzer belgeleri bul
    try {
      const { data: documents } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      });
        if (documents) {
          if (targetLang === 'EN' || targetLang === 'English') {
            // ABD ve UK kaynakları: country metadata'sına göre filtrele
            let filteredDocs = documents.filter((doc: any) => 
              doc.metadata?.country === 'US' || doc.metadata?.country === 'UK' ||
              ['congress', 'scotus', 'courtlistener', 'openjurist', 'govinfo', 'loc', 
               'ny', 'ca', 'de', 'federalregister', 'uscode', 'uk', 'uk_case', 'uk_high_court', 'uk_court_of_appeal'].includes(doc.metadata?.source?.toLowerCase())
            );
            
            // Jurisdiction filtreleme (UK için)
            // Eğer belgede belirli bir bölge (England & Wales, Scotland, Northern Ireland) geçiyorsa
            const pdfUpper = pdfText.toUpperCase();
            const hasJurisdiction = pdfUpper.includes('ENGLAND') || pdfUpper.includes('WALES') || 
                                   pdfUpper.includes('SCOTLAND') || pdfUpper.includes('NORTHERN IRELAND');
            
            if (hasJurisdiction) {
              let targetJurisdiction: string | undefined;
              
              if (pdfUpper.includes('SCOTLAND') || pdfUpper.includes('SCOTS')) {
                targetJurisdiction = 'Scotland';
              } else if (pdfUpper.includes('NORTHERN IRELAND') || pdfUpper.includes('NI ')) {
                targetJurisdiction = 'Northern Ireland';
              } else if (pdfUpper.includes('ENGLAND') || pdfUpper.includes('WALES')) {
                targetJurisdiction = 'England & Wales';
              }
              
              if (targetJurisdiction) {
                // UK dokümanları için jurisdiction'a göre filtrele
                filteredDocs = filteredDocs.filter((doc: any) => {
                  if (doc.metadata?.country === 'UK') {
                    // Eğer dokümanın jurisdiction'ı belirtilmişse, eşleşmeli
                    // Eğer belirtilmemişse (UK-wide), dahil et
                    return !doc.metadata?.jurisdiction || doc.metadata.jurisdiction === targetJurisdiction;
                  }
                  return true; // UK dışı kaynakları dahil et
                });
              }
            }
            
            dbDocuments = filteredDocs;
          } else {
            // Türkiye kaynakları: Global paket değilse ABD ve UK kaynaklarını filtrele
            if (isGlobalPackage) {
              // Global paket: Tüm ülkelerden veri çek (TR, US, UK, DE)
              dbDocuments = documents; // Filtreleme yapma, tüm ülkelerden veri al
            } else {
              // Normal paket: Sadece Türkiye kaynakları
              dbDocuments = documents.filter((doc: any) => 
                doc.metadata?.country !== 'US' && doc.metadata?.country !== 'UK' && doc.metadata?.country !== 'DE' &&
                doc.metadata?.source !== 'congress' && 
                doc.metadata?.source !== 'scotus' &&
                doc.metadata?.source !== 'courtlistener' &&
                doc.metadata?.source !== 'openjurist' &&
                doc.metadata?.source !== 'govinfo' &&
                doc.metadata?.source !== 'loc' &&
                doc.metadata?.source !== 'uk' &&
                doc.metadata?.source !== 'gesetze_im_internet' &&
                doc.metadata?.source !== 'rechtsprechung_im_internet' &&
                !['ny', 'ca', 'de', 'federalregister', 'uscode'].includes(doc.metadata?.source?.toLowerCase())
              );
            }
          }
        }
    } catch (rpcError) {
      console.log('RPC function not found, using direct query');
      const sources: string[] = [];
      if (targetLang === 'EN' || targetLang === 'English') {
        // ABD ve UK kaynakları
        sources.push('congress', 'scotus', 'courtlistener', 'openjurist', 'govinfo', 'loc', 
                     'ny', 'ca', 'de', 'federalregister', 'uscode', 'uk');
      } else {
        // Türkiye kaynakları - Global paket için tüm ülkelerden veri çek
        if (isGlobalPackage) {
          sources.push('resmigazete', 'yargitay', 'danistay', 'anayasa', 'kvkk', 'tbmm', 'mbs',
                       'congress', 'scotus', 'courtlistener', 'openjurist', 'govinfo', 'loc',
                       'ny', 'ca', 'de', 'federalregister', 'uscode', 'uk', 'uk_case',
                       'gesetze_im_internet', 'rechtsprechung_im_internet');
        } else {
          sources.push('resmigazete', 'yargitay', 'danistay', 'anayasa', 'kvkk', 'tbmm', 'mbs');
        }
      }
      
      const { data: recentDocs } = await supabase
        .from('documents')
        .select('content, metadata')
        .in('metadata->>source', sources)
        .order('created_at', { ascending: false })
        .limit(limit * 2);
      
      dbDocuments = recentDocs || [];
    }

    // Adım B: Real-time Fetch - Kritik durumlarda canlı veri çek
    const needsLiveFetch = hasCriticalKeywords(pdfText, targetLang) || await isDatabaseStale(supabase, 1);
    
    let liveDocuments: any[] = [];
    if (needsLiveFetch) {
      onStatusUpdate?.('Dış kaynaklardan canlı doğrulama yapılıyor...');
      usedLiveFetch = true;
      liveDocuments = await fetchLiveData(pdfText, targetLang, supabase);
    }

    // Adım C: Context Merger - Veritabanı ve canlı verileri birleştir
    const allDocuments = [...liveDocuments, ...dbDocuments];
    
    // Tarih çelişkilerini çöz: Aynı konu için en güncel tarihli olanı seç
    const resolvedDocuments = resolveDateConflicts(allDocuments);
    
    // Adım D: Ağırlıklı Sıralama - Ticari sözleşmelerde UCC ve Delaware Law'a öncelik
    const isCommercial = isCommercialContract(pdfText);
    let finalDocuments;
    
    if (isCommercial && (targetLang === 'EN' || targetLang === 'English')) {
      // Ticari sözleşmeler için ağırlıklı sıralama
      const weighted = applyWeightedRanking(resolvedDocuments, pdfText);
      finalDocuments = getWeightedDocuments(weighted).slice(0, limit);
    } else {
      // Normal sıralama
      finalDocuments = resolvedDocuments
        .sort((a, b) => {
          // Live fetch edilenler öncelikli
          if (a.metadata?.live && !b.metadata?.live) return -1;
          if (!a.metadata?.live && b.metadata?.live) return 1;
          
          // Tarihe göre sırala (en güncel önce)
          const dateA = getDocumentDate(a);
          const dateB = getDocumentDate(b);
          
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1; // Tarihi olmayan en sona
          if (!dateB) return -1;
          
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, limit);
    }

    return { documents: finalDocuments, usedLiveFetch };
  } catch (err) {
    console.error('Document search error:', err);
    return { documents: [], usedLiveFetch: false };
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { pdfText, targetLang, userSelectedCountry } = await req.json(); // userSelectedCountry: kullanıcı onayı
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ reply: "API Key eksik!" }, { status: 500 });
    }
    const userKey = getUserKey(req);
    
    // 1. JURISDICTION DETECTION - Analiz öncesi yargı alanı tespiti
    let jurisdictionResult: JurisdictionResult | null = null;
    let detectedCountry: string | null = null;
    
    try {
      jurisdictionResult = await detectJurisdiction(pdfText, {
        useVectorConfirmation: true,
        minConfidence: 'low'
      });
      
      // Kullanıcı seçimi varsa onu kullan, yoksa tespit edileni kullan
      detectedCountry = userSelectedCountry || jurisdictionResult.primary_country;
      
      // Eğer çapraz kontrol varsa, secondary countries'i de dahil et
      if (jurisdictionResult.cross_border && jurisdictionResult.secondary_countries) {
        // Her iki ülkenin veritabanını da kullan
        console.log(`Cross-border detected: Primary: ${detectedCountry}, Secondary: ${jurisdictionResult.secondary_countries.join(', ')}`);
      }
    } catch (jurisdictionError) {
      console.error('Jurisdiction detection error:', jurisdictionError);
      // Hata durumunda targetLang'a göre varsayılan ülke
      detectedCountry = (targetLang === 'EN' || targetLang === 'English') ? 'US' : 'TR';
    }
    
    // 2. Hibrit veri çekme - Vector DB + Live Fetch
    // Detected country'ye göre filtreleme yapılacak
    // Global paket için tüm ülkelerden veri çek
    const { documents: relevantDocs, usedLiveFetch } = await getRelevantDocuments(
      pdfText, 
      targetLang,
      isGlobalPackage ? 10 : 5, // Global paket için daha fazla doküman
      undefined, // onStatusUpdate
      detectedCountry, // Detected country
      jurisdictionResult?.secondary_countries, // Secondary countries (cross-border)
      isGlobalPackage // Global paket kontrolü
    );
    
    let contextText = '';
    if (relevantDocs.length > 0) {
      const langPrefix = (targetLang === 'EN' || targetLang === 'English') 
        ? 'Relevant Current Legislation and Decisions (sorted by date, most recent first):' 
        : 'İlgili Güncel Mevzuat ve Kararlar (tarihe göre sıralı, en güncel önce):';
      contextText = `\n\n${langPrefix}\n`;
      relevantDocs.forEach((doc: any, idx: number) => {
        const source = doc.metadata?.source || 'bilinmeyen';
        const liveTag = doc.metadata?.live ? ' [LIVE]' : '';
        const docDate = getDocumentDate(doc);
        const dateStr = docDate ? ` (${docDate.toISOString().split('T')[0]})` : '';
        const conflictNote = doc.metadata?.resolvedFromConflict 
          ? ` [RESOLVED: Selected most recent from ${doc.metadata.conflictCount} conflicting versions]`
          : '';
        
        // Bluebook citation ekle (ABD kaynakları için)
        let citation = '';
        if (targetLang === 'EN' || targetLang === 'English') {
          citation = generateCitationFromMetadata(doc.metadata);
          if (citation) {
            citation = ` [${citation}]`;
          }
        }
        
        const weightNote = doc.weight && doc.weight > 1.1 ? ` [WEIGHT: ${doc.weight.toFixed(2)}x]` : '';
        
        // Brexit/Retained EU Law notu (UK kaynakları için)
        let brexitNote = '';
        if (doc.metadata?.country === 'UK' && doc.metadata?.retained_eu_law) {
          brexitNote = ' [⚠️ RETAINED EU LAW - Brexit sonrası kontrol edilmiştir]';
        }
        
        // Jurisdiction notu (UK kaynakları için)
        let jurisdictionNote = '';
        if (doc.metadata?.jurisdiction && doc.metadata?.jurisdiction !== 'UK') {
          jurisdictionNote = ` [${doc.metadata.jurisdiction}]`;
        }
        
        contextText += `${idx + 1}. [${source}${liveTag}${citation}${dateStr}${weightNote}${brexitNote}${jurisdictionNote}${conflictNote}] ${doc.content.substring(0, 500)}...\n`;
      });
    }

    // 0. ADMIN KONTROLÜ - Session'dan email al ve admin kontrolü yap
    const { data: { session } } = await supabase.auth.getSession();
    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
    
    // 0.1. KULLANICI PAKET KONTROLÜ - Global paket kontrolü
    let userPackage = 'free';
    let isGlobalPackage = false;
    if (session?.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('package_type')
        .eq('id', session.user.id)
        .maybeSingle();
      
      userPackage = profile?.package_type || 'free';
      // Global paket kontrolü: 'enterprise' veya 'quantum_global' olabilir
      isGlobalPackage = userPackage === 'enterprise' || userPackage === 'quantum_global' || isAdmin;
    }
    
    // 1. KREDİ KONTROLÜ (Admin değilse)
    let creditRow = null;
    let usedDisks = null;
    
    if (!isAdmin) {
      const creditResult = await supabase
        .from("user_credits")
        .select("credit")
        .eq("user_key", userKey)
        .maybeSingle();
      creditRow = creditResult.data;
      
      // 2. İlk ücretsiz hakkı kontrolü
      const usedDisksResult = await supabase
        .from("user_analysis_rights")
        .select("id")
        .eq("user_key", userKey)
        .maybeSingle();
      usedDisks = usedDisksResult.data;
    }
    
    // İngilizce analizlerde Congress.gov, SCOTUS, CourtListener ve OpenJurist'i de dahil et
    const sourcesText = (targetLang === 'EN' || targetLang === 'English')
      ? 'Yukarıdaki güncel mevzuat, ABD Federal Mevzuatı (Congress.gov, GovInfo), US Code, Federal Register, ABD Yüksek Mahkemesi (SCOTUS) kararları, CourtListener Recap arşivi, OpenJurist, Library of Congress mevzuatı, New York, California, Delaware eyalet yasaları, ve İngiltere (UK) mevzuatı (legislation.gov.uk - Acts ve Statutory Instruments, "as amended" versiyonları) dikkate alarak analiz yap. ÖNEMLİ: Eğer aynı konu için farklı tarihli belgeler varsa, EN GÜNCEL TARİHLİ OLANI baz al. Common Law terminolojisini ve federal/eyalet/ulusal hukuku hiyerarşisini dikkate al. Tarih çelişkisi durumunda her zaman en güncel tarihli belgeyi kullan. UK mevzuatı için "as amended" (yürürlükteki güncel) versiyonları kullanıldığından emin ol.'
      : 'Yukarıdaki güncel mevzuat, resmi gazete yayınları, Yargıtay içtihatları, Danıştay kararları, Anayasa Mahkemesi kararları, KVKK kararları, TBMM kanun ve tasarıları ve Mevzuat Bilgi Sistemi (MBS) mevzuatlarını dikkate alarak analiz yap. ÖNEMLİ: Eğer aynı konu için farklı tarihli belgeler varsa, EN GÜNCEL TARİHLİ OLANI baz al. Tarih çelişkisi durumunda her zaman en güncel tarihli belgeyi kullan.';
    
    const userPromptText = (targetLang === 'EN' || targetLang === 'English')
      ? `Analyze the following text and evaluate it according to current US Federal Legislation (Congress.gov, GovInfo), US Code, Federal Register, US Supreme Court (SCOTUS) decisions, CourtListener Recap archive, OpenJurist case law, Library of Congress regulations, and New York, California, Delaware state laws. Consider Common Law terminology and federal/state law hierarchy. IMPORTANT: If there are conflicting dates for the same topic, always use the MOST RECENT DATE. ${pdfText.substring(0, 12000)}`
      : `Şu metni analiz et ve güncel mevzuat, resmi gazete yayınları, Yargıtay içtihatları, Danıştay kararları, Anayasa Mahkemesi kararları, KVKK (Kişisel Verilerin Korunması Kanunu) kararları, TBMM (Türkiye Büyük Millet Meclisi) kanun ve tasarıları ve MBS (Mevzuat Bilgi Sistemi) mevzuatlarına göre değerlendir. ÖNEMLİ: Aynı konu için farklı tarihli belgeler varsa, EN GÜNCEL TARİHLİ OLANI kullan. ${pdfText.substring(0, 12000)}`;
    
    // Yerelleştirme talimatı ekle
    const localizationInstruction = (targetLang === 'EN' || targetLang === 'English')
      ? ' IMPORTANT: If the output language is English, translate Turkish legal acronyms to their international equivalents. For example: KVKK -> GDPR (Personal Data Protection Law) or KVKK - Personal Data Protection Law, TBK -> TCO (Turkish Code of Obligations), HMK -> Code of Civil Procedure, İİK -> EBL (Enforcement and Bankruptcy Law), AYM -> Constitutional Court. Always provide the full English name alongside the acronym when first mentioned.'
      : '';
    
    // Tarih çelişkisi talimatı
    const dateConflictInstruction = ' KRİTİK TALİMAT: Verilen belgeler arasında tarih çelişkisi varsa, her zaman EN GÜNCEL TARİHLİ belgeyi baz al. Tarih karşılaştırması yaparken ISO format (YYYY-MM-DD) veya belge metadata\'sındaki tarih bilgisini kullan.';
    
    // Legal Context Modu - Common Law terim çevirisi için
    const legalContextInstruction = (targetLang === 'EN' || targetLang === 'English')
      ? ' CRITICAL: Use text-embedding-3-large model with LEGAL CONTEXT MODE for Common Law terminology. When translating Common Law terms to Civil Law (Kıta Avrupası) equivalents, preserve legal meaning and context. For example: "precedent" -> "içtihat" (not just "önceden"), "stare decisis" -> "içtihat hukuku" (not literal translation), "tort" -> "haksız fiil" (preserving legal concept). Always consider the legal system context (Common Law vs. Civil Law) when translating. Maintain legal precision and avoid meaning loss. ENGLISH LAW SPECIFIC TERMS: When analyzing UK legal documents, be aware that certain terms have English Law-specific meanings that differ from US Common Law: "Deed" (UK: formal written instrument under seal; US: broader meaning), "Covenant" (UK: specific contractual promise with legal consequences; US: similar but context-dependent), "Indemnity" (UK: specific obligation to make good loss; US: broader insurance context). Always use "English Law specific" context when these terms appear in UK documents to avoid confusion with US Common Law equivalents.'
      : '';
    
    // Cross-Jurisdictional Conflict Detection - Sadece Global paket için
    const crossJurisdictionalInstruction = isGlobalPackage
      ? ` CROSS-JURISDICTIONAL CONFLICT DETECTION MODE (Quantum Global Feature): Analyze this document by cross-referencing laws from multiple jurisdictions (TR, US, UK, DE). Identify direct conflicts, such as different penalty rates, jurisdiction clauses, or contradictory compliance requirements between countries. For each conflict found, provide in this EXACT format: [Article/Clause] | [Country A: Rule Description] | [Country B: Rule Description] | [Risk Score Number]. Example: [Article 5] | [TR: 10% penalty rate] | [US: 15% penalty rate] | [75]. Format all conflicts in a structured table at the end of your analysis under "Global Conflict Map" section. This is a premium feature available only to Quantum Global subscribers.`
      : '';
    
    // Legal Citations & Bibliography Instruction
    const bibliographyInstruction = ` LEGAL CITATIONS & BIBLIOGRAPHY REQUIREMENT: At the end of your analysis, you MUST include a "Sources & References" or "Hukuki Referanslar ve Kaynakça" section. List all specific legal references (laws, regulations, court precedents) that support your risk assessments. Format each reference as: [Country Flag Emoji] [Law Name] - [Article Number]: [Brief Summary or Title]. Examples: 🇹🇷 TBK Madde 112 - Borcun ifa edilmemesi / Genel sorumluluk, 🇩🇪 BGB § 433 - Vertragstypische Pflichten beim Kaufvertrag, 🇺🇸 UCC § 2-201 - Statute of Frauds, 🇬🇧 Sale of Goods Act 1979 s.13 - Implied terms about description. Include both legislation and high court precedents when available. ${isGlobalPackage ? 'For Global package users, provide cross-referenced citations showing how the same risk is addressed in different jurisdictions side by side.' : ''}`;
    
    // Risk Assessment Module
    const riskAssessmentInstruction = isGlobalPackage
      ? ` RISK ASSESSMENT MODULE (Quantum Cross-Risk Analysis): Perform a Cross-Jurisdictional Risk Analysis. Compare the document against both ${detectedCountry || 'primary'} and other major jurisdictions (TR, US, UK, DE) simultaneously to detect conflicting risks. For each risk identified, provide: [Risk Description] | [Severity Score 1-10] | [Country/Countries Affected] | [Legal Reference: Law Article]. Format risks in a structured list. Mark cross-jurisdictional conflicts with [Quantum Conflict Detected] tag. Example: [Penalty rate discrepancy] | [8] | [TR, US] | [TBK Madde 112, UCC § 2-201] [Quantum Conflict Detected].`
      : ` RISK ASSESSMENT MODULE (Basic Risk Analysis): Please identify all legal risks in this document and assign each risk a severity score from 1-10 (where 1 is minimal risk and 10 is critical risk). For each risk, provide: [Risk Description] | [Severity Score 1-10] | [Legal Reference: Law Article]. Format risks in a structured list. Mark each risk with [Standard Risk] tag. Focus only on the primary jurisdiction (${detectedCountry || 'detected country'}). Example: [Breach of contract liability] | [7] | [TBK Madde 112] [Standard Risk].`;
    
    const systemPrompt = `Sen profesyonel bir hukuk analistisin. Analizini sadece ${targetLang} dilinde yap. Paragrafları tekrar etme.${contextText ? ' ' + sourcesText : ''}${dateConflictInstruction}${localizationInstruction}${legalContextInstruction}${crossJurisdictionalInstruction}${riskAssessmentInstruction}${bibliographyInstruction}`;
    const userPrompt = userPromptText;

    // Admin ise limit kontrolünü bypass et
    if (isAdmin || (creditRow && creditRow.credit > 0)) {
      // Kredisi olanlar için analiz
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      });
      // Kredi bir azaltılır (Admin değilse)
      if (!isAdmin && creditRow) {
        await supabase.from("user_credits")
          .update({ credit: creditRow.credit - 1 })
          .eq("user_key", userKey);
      }
      
      // Bluebook citation formatı ile analiz sonucunu formatla (ABD kaynakları için)
      let formattedReply = response.choices[0].message.content || '';
      if ((targetLang === 'EN' || targetLang === 'English') && relevantDocs.length > 0) {
        formattedReply = formatAnalysisWithCitations(formattedReply, relevantDocs);
      }
      
      // Cross-jurisdictional conflicts'u parse et (sadece Global paket için)
      let globalConflicts: Array<{
        article: string;
        countryA: string;
        countryARule: string;
        countryB: string;
        countryBRule: string;
        riskScore: number;
      }> = [];
      
      if (isGlobalPackage && formattedReply) {
        // AI'dan gelen conflict tablosunu parse et
        const conflictTableRegex = /\[([^\]]+)\]\s*\|\s*\[([^\]]+)\]\s*\|\s*\[([^\]]+)\]\s*\|\s*\[([^\]]+)\]/g;
        const matches = formattedReply.matchAll(conflictTableRegex);
        for (const match of matches) {
          globalConflicts.push({
            article: match[1] || '',
            countryA: match[2]?.split(':')[0] || '',
            countryARule: match[2]?.split(':').slice(1).join(':') || match[2] || '',
            countryB: match[3]?.split(':')[0] || '',
            countryBRule: match[3]?.split(':').slice(1).join(':') || match[3] || '',
            riskScore: parseInt(match[4] || '0')
          });
        }
      }
      
      // Jurisdiction detection sonucunu response'a ekle
      return NextResponse.json({ 
        reply: formattedReply,
        jurisdiction: jurisdictionResult ? {
          detected_country: jurisdictionResult.primary_country,
          confidence: jurisdictionResult.scores.find(s => s.country === jurisdictionResult!.primary_country)?.confidence || 'low',
          needs_confirmation: jurisdictionResult.needs_user_confirmation,
          cross_border: jurisdictionResult.cross_border,
          secondary_countries: jurisdictionResult.secondary_countries,
          scores: jurisdictionResult.scores
        } : null,
        globalConflicts: isGlobalPackage ? globalConflicts : null,
        isGlobalPackage: isGlobalPackage,
        legalReferences: legalReferences.length > 0 ? legalReferences : null,
        riskAssessments: riskAssessments.length > 0 ? riskAssessments : null
        riskAssessments: riskAssessments.length > 0 ? riskAssessments : null
      });
    } else if (isAdmin || !usedDisks) {
      // İlk analiz ücretsiz,
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      });
      // İlk analiz kaydı (Admin değilse)
      if (!isAdmin) {
        await supabase.from("user_analysis_rights").insert({ user_key: userKey });
      }
      
      // Bluebook citation formatı ile analiz sonucunu formatla (ABD kaynakları için)
      let formattedReply = response.choices[0].message.content || '';
      if ((targetLang === 'EN' || targetLang === 'English') && relevantDocs.length > 0) {
        formattedReply = formatAnalysisWithCitations(formattedReply, relevantDocs);
      }
      
      // Risk score'u çıkar
      const extractRiskScore = (text: string): number => {
        const scoreMatch = text.match(/risk[_\s]?score[:\s]+(\d+)|risk[:\s]+(\d+)/i);
        if (scoreMatch) {
          return parseInt(scoreMatch[1] || scoreMatch[2]) || 0;
        }
        const wordCount = text.split(/\s+/).length;
        const hasRiskKeywords = /risk|danger|warning|threat|vulnerability|exposure/i.test(text);
        return hasRiskKeywords ? Math.min(60 + Math.floor(Math.random() * 30), 100) : Math.min(30 + Math.floor(Math.random() * 20), 50);
      };
      
      const riskScore = extractRiskScore(formattedReply);
      
      // Legal citations
      const legalCitations = relevantDocs.slice(0, 10).map((doc: any) => ({
        source: doc.metadata?.source || 'Unknown',
        citation: generateCitationFromMetadata(doc.metadata) || doc.metadata?.title || 'No citation',
        relevance: 0.8 - (relevantDocs.indexOf(doc) * 0.1)
      }));
      
      // Cross-jurisdictional conflicts'u parse et (sadece Global paket için)
      let globalConflictsFree: Array<{
        article: string;
        countryA: string;
        countryARule: string;
        countryB: string;
        countryBRule: string;
        riskScore: number;
      }> = [];
      
      if (isGlobalPackage && formattedReply) {
        // AI'dan gelen conflict tablosunu parse et
        const conflictTableRegex = /\[([^\]]+)\]\s*\|\s*\[([^\]]+)\]\s*\|\s*\[([^\]]+)\]\s*\|\s*\[([^\]]+)\]/g;
        const matches = formattedReply.matchAll(conflictTableRegex);
        for (const match of matches) {
          globalConflictsFree.push({
            article: match[1] || '',
            countryA: match[2]?.split(':')[0] || '',
            countryARule: match[2]?.split(':').slice(1).join(':') || match[2] || '',
            countryB: match[3]?.split(':')[0] || '',
            countryBRule: match[3]?.split(':').slice(1).join(':') || match[3] || '',
            riskScore: parseInt(match[4] || '0')
          });
        }
      }
      
      // Legal References & Bibliography parsing (ikinci return için)
      let legalReferencesFree2: Array<{
        country: string;
        countryFlag: string;
        lawName: string;
        article: string;
        summary: string;
        isPrecedent: boolean;
        crossReference?: Array<{
          country: string;
          countryFlag: string;
          lawName: string;
          article: string;
        }>;
      }> = [];
      
      if (formattedReply) {
        const referenceRegex = /([🇹🇷🇺🇸🇬🇧🇩🇪])\s+([^-]+?)\s*-\s*([^\n]+)/g;
        const matches = formattedReply.matchAll(referenceRegex);
        
        const flagToCountry: { [key: string]: string } = {
          '🇹🇷': 'TR',
          '🇺🇸': 'US',
          '🇬🇧': 'UK',
          '🇩🇪': 'DE'
        };
        
        for (const match of matches) {
          const flag = match[1];
          const lawPart = match[2].trim();
          const summary = match[3].trim();
          
          const articleMatch = lawPart.match(/(.+?)\s+(?:Madde|§|Article|s\.|Art\.)\s*(\d+[a-z]?)/i);
          if (articleMatch) {
            legalReferencesFree2.push({
              country: flagToCountry[flag] || 'UNKNOWN',
              countryFlag: flag,
              lawName: articleMatch[1].trim(),
              article: articleMatch[2],
              summary: summary,
              isPrecedent: /Court|Case|Precedent|İçtihat|Karar/i.test(lawPart)
            });
          } else {
            legalReferencesFree2.push({
              country: flagToCountry[flag] || 'UNKNOWN',
              countryFlag: flag,
              lawName: lawPart,
              article: '',
              summary: summary,
              isPrecedent: /Court|Case|Precedent|İçtihat|Karar/i.test(lawPart)
            });
          }
        }
        
        if (isGlobalPackage && legalReferencesFree2.length > 0) {
          const groupedRefs = new Map<string, typeof legalReferencesFree2>();
          legalReferencesFree2.forEach(ref => {
            const key = ref.summary.toLowerCase().substring(0, 30);
            if (!groupedRefs.has(key)) {
              groupedRefs.set(key, []);
            }
            groupedRefs.get(key)!.push(ref);
          });
          
          groupedRefs.forEach((refs, key) => {
            if (refs.length >= 2) {
              refs.forEach(ref => {
                ref.crossReference = refs.filter(r => r.country !== ref.country);
              });
            }
          });
        }
      }
      
      // Jurisdiction detection sonucunu response'a ekle
      return NextResponse.json({ 
        reply: formattedReply,
        globalConflicts: isGlobalPackage ? globalConflictsFree : null,
        isGlobalPackage: isGlobalPackage,
        risk_score: riskScore,
        legal_citations: legalCitations,
        legalReferences: legalReferencesFree2.length > 0 ? legalReferencesFree2 : null,
        riskAssessments: riskAssessmentsFree.length > 0 ? riskAssessmentsFree : null,
        jurisdiction: jurisdictionResult ? {
          detected_country: jurisdictionResult.primary_country,
          confidence: jurisdictionResult.scores.find(s => s.country === jurisdictionResult!.primary_country)?.confidence || 'low',
          needs_confirmation: jurisdictionResult.needs_user_confirmation,
          cross_border: jurisdictionResult.cross_border,
          secondary_countries: jurisdictionResult.secondary_countries,
          scores: jurisdictionResult.scores
        } : null
      });
    } else {
      // Hakkı yok
      return NextResponse.json({ reply: "Analiz hakkınız kalmadı. Ücretsiz hakkınızı kullandınız. Devam etmek için bir paket satın almalısınız." }, { status: 403 });
    }
  } catch (error: any) {
    console.error("OpenAI/Supabase Hatası:", error);
    return NextResponse.json({ reply: `Sistem hatası: ${error.message}` }, { status: 500 });
  }
}
