"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PricingCard from "./components/PricingCard";
import Header from "./components/Header";
import QuantumSidebar from "./components/QuantumSidebar";
import dynamic from 'next/dynamic';

const AnalysisResult = dynamic(() => import("./components/AnalysisResult"), {
  ssr: false
});
import ComparisonResult from "./components/ComparisonResult";
import BetaBanner from "./components/BetaBanner";
import FeedbackModal from "./components/FeedbackModal";
import FeedbackHub from "./components/FeedbackHub";
import { createBrowserClient } from '@supabase/ssr';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import { Scale } from 'lucide-react';

/*
  SQL Şeması - Supabase SQL Editor'da çalıştırın:
  
  -- 1. Profiles tablosu (kullanıcı paket bilgileri)
  CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    package_type TEXT DEFAULT 'free' CHECK (package_type IN ('free', 'basic', 'professional', 'enterprise')),
    analysis_count INTEGER DEFAULT 0,
    analysis_count_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_early_bird BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 2. Analyses tablosu (Enterprise kullanıcılar için analiz geçmişi)
  CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    analysis_result TEXT NOT NULL,
    analysis_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 3. RLS (Row Level Security) Politikaları
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

  -- Profiles için: Kullanıcılar sadece kendi profillerini görebilir
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

  -- Analyses için: Kullanıcılar sadece kendi analizlerini görebilir
  CREATE POLICY "Users can view own analyses" ON analyses
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own analyses" ON analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  -- 4. Trigger: Yeni kullanıcı kaydı olduğunda profile oluştur (ilk 50 kullanıcı early bird)
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  DECLARE
    early_bird_count INTEGER;
    is_early BOOLEAN := FALSE;
  BEGIN
    SELECT COUNT(*) INTO early_bird_count FROM profiles WHERE is_early_bird = TRUE;
    IF early_bird_count < 50 THEN
      is_early := TRUE;
    END IF;
    INSERT INTO public.profiles (id, package_type, is_early_bird)
    VALUES (NEW.id, 'free', is_early);
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- 5. Feedbacks tablosu (Beta feedback için)
  CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'closed')),
    screenshot TEXT, -- Base64 encoded image
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Feedbacks için RLS
  ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can view own feedbacks" ON feedbacks
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Anyone can insert feedback" ON feedbacks
    FOR INSERT WITH CHECK (true);

  -- 6. Index'ler (performans için)
  CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
  CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
  CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
*/

type Tab = "analyze" | "pricing" | "about" | "history";
type UserPackage = "free" | "basic" | "professional" | "enterprise" | "quantum_global" | null;

export default function Home() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'Accept': 'application/json',
        },
      },
    }
  ));

  const [user, setUser] = useState<any>(null);
  const [userPackage, setUserPackage] = useState<UserPackage>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Admin Email Listesi
  const ADMIN_EMAILS = ['elmas7853@gmail.com'];
  
  // Admin kontrolü ve user.role/user.plan ayarlama
  useEffect(() => {
    if (user?.email && ADMIN_EMAILS.includes(user.email)) {
      // Admin email ise role ve plan'ı ayarla
      setUser((prevUser: any) => ({
        ...prevUser,
        role: 'ADMIN',
        plan: 'GLOBAL'
      }));
      setIsAdmin(true);
      setUserPackage('quantum_global'); // Admin'e Global paket ver
    }
  }, [user?.email]);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [analysisHistory, setAnalysisHistory] = useState<Array<{id: string, title: string, date: string, summary: string, fullResult: string, riskScore: number | null}>>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'single' | 'compare'>('single');
  const [file2, setFile2] = useState<File | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [currentLoadingMessageIndex, setCurrentLoadingMessageIndex] = useState(0);
  const [result, setResult] = useState("");
  const [language, setLanguage] = useState("EN");
  const [userCredits, setUserCredits] = useState<number>(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [contractCount, setContractCount] = useState<number>(10);
  const [roiCurrency, setRoiCurrency] = useState<'TR' | 'USD'>('USD');
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
  const [showROIModal, setShowROIModal] = useState(false);
  const [roiRecommendedPackage, setRoiRecommendedPackage] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [testMode, setTestMode] = useState<boolean | null>(null); // null = auto, true = TR, false = Global
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [adminTestMode, setAdminTestMode] = useState(false);
  const [adminTestPackage, setAdminTestPackage] = useState<UserPackage | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [limitWarningDismissed, setLimitWarningDismissed] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<'summary' | 'detailed' | 'risks'>('summary');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [pdfText, setPdfText] = useState('');
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [legalCitations, setLegalCitations] = useState<Array<{source: string; citation: string; relevance: number}>>([]);
  const [globalConflicts, setGlobalConflicts] = useState<Array<{
    article: string;
    countryA: string;
    countryARule: string;
    countryB: string;
    countryBRule: string;
    riskScore: number;
  }>>([]);
  const [isGlobalPackage, setIsGlobalPackage] = useState(false);
  const [legalReferences, setLegalReferences] = useState<Array<{
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
  }>>([]);
  const [riskAssessments, setRiskAssessments] = useState<Array<{
    description: string;
    severity: number;
    countries?: string[];
    legalReference: string;
    isQuantumConflict: boolean;
  }>>([]);
  const [jurisdictionConfirmation, setJurisdictionConfirmation] = useState<{
    detected_country: string;
    confidence: string;
    cross_border: boolean;
    secondary_countries?: string[];
    scores: Array<{country: string; score: number; confidence: string; indicators: string[]}>;
    show: boolean;
  } | null>(null);
  const [userSelectedCountry, setUserSelectedCountry] = useState<string | null>(null);
  const [selectedCountryForAnalysis, setSelectedCountryForAnalysis] = useState<'TR' | 'US' | 'UK' | 'DE' | 'AUTO' | null>(null);
  const [selectedLegislation, setSelectedLegislation] = useState<{title: string, content: string} | null>(null);
  const [showLegislationModal, setShowLegislationModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFeedbackHub, setShowFeedbackHub] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Admin test modunda adminTestPackage, normal modda userPackage kullan
  const effectivePackage = adminTestMode && adminTestPackage ? adminTestPackage : userPackage;

  const gold = "#c7b079"; 
  const darkBlue = "#182332"; 
  const midBlue = "#232d3c"; 
  const lightText = "#f1efca"; // Kirli beyaz / beyaza yakın gold - normal yazılar için

  const packages = [
    {
      name: "Single Quantum Scan",
      fullName: "Single Quantum Scan",
      fullNameGlobal: "Single Quantum Scan",
      priceTR: "990 TL",
      priceGlobal: "$49",
      description: "Tek seferlik uluslararası sözleşme kontrolleri için mükemmel. Bir belge için TR, US, UK ve DE veritabanlarına tam erişim içerir.",
      descriptionGlobal: "Perfect for one-time international contract checks. Includes full access to TR, US, UK, and DE databases for one document.",
      features: [
        "1 Kuantum Analizi",
        "TR, US, UK, DE veritabanlarına tam erişim",
        "Tek seferlik uluslararası sözleşme kontrolü için ideal",
        "✓ Basic Risk Analysis (Single Country)",
        "PDF/Word rapor indirme"
      ],
      featuresGlobal: [
        "1 Quantum Scan",
        "Full access to TR, US, UK, DE databases",
        "Perfect for one-time international contract checks",
        "✓ Basic Risk Analysis (Single Country)",
        "PDF/Word report download"
      ],
      buttonText: "Satın Al",
      buttonTextGlobal: "Buy Now",
      isPopular: false,
      shopierLink: "https://www.shopier.com/mirale/42406232",
      lemonSqueezyLink: "https://veritaslegalai.lemonsqueezy.com/checkout/buy/03856d56-2876-4a9a-a979-90d00ee77a6a"
    },
    {
      name: "Professional",
      fullName: "Professional",
      fullNameGlobal: "Professional",
      priceTR: "2.450 TL",
      priceGlobal: "$99",
      description: "Ayda 5 kuantum analizi ile profesyonel hukuki süreçlerinizi hızlandırın.",
      descriptionGlobal: "Accelerate your professional legal processes with 5 quantum scans per month.",
      features: [
        "Ayda 5 Kuantum Analizi",
        "TR, US, UK, DE veritabanlarına tam erişim",
        "✓ Basic Risk Analysis (Single Country)",
        "✓ Document Version Comparison (Same Language)",
        "PDF/Word rapor indirme",
        "Analiz geçmişi erişimi"
      ],
      featuresGlobal: [
        "5 Quantum Scans Per Month",
        "Full access to TR, US, UK, DE databases",
        "✓ Basic Risk Analysis (Single Country)",
        "✓ Document Version Comparison (Same Language)",
        "PDF/Word report download",
        "Analysis history access"
      ],
      buttonText: "Abone Ol",
      buttonTextGlobal: "Subscribe",
      isPopular: true,
      shopierLink: "https://www.shopier.com/mirale/42406252",
      lemonSqueezyLink: "https://veritaslegalai.lemonsqueezy.com/checkout/buy/599f8b7f-860a-4803-9920-4b0b07165e45"
    },
    {
      name: "Quantum Global",
      fullName: "Quantum Global",
      fullNameGlobal: "Quantum Global",
      priceTR: "7.450 TL",
      priceGlobal: "$299",
      description: "Sınırsız kuantum analizi ve çapraz sınır risk haritalama ile kurumsal çözüm.",
      descriptionGlobal: "Unlimited quantum scans and cross-border risk mapping for enterprise solutions.",
      features: [
        "Sınırsız Kuantum Analizi",
        "Çapraz Sınır Risk Haritalama",
        "TR, US, UK, DE veritabanlarına tam erişim",
        "✓ Advanced Quantum Risk Mapping (Multi-Country Cross-Check)",
        "✓ Cross-Language Document Comparison & Translation Accuracy Check",
        "PDF/Word rapor indirme",
        "Sınırsız analiz geçmişi"
      ],
      featuresGlobal: [
        "Unlimited Quantum Scans",
        "Cross-Border Risk Mapping",
        "Full access to TR, US, UK, DE databases",
        "✓ Advanced Quantum Risk Mapping (Multi-Country Cross-Check)",
        "✓ Cross-Language Document Comparison & Translation Accuracy Check",
        "PDF/Word report download",
        "Unlimited analysis history"
      ],
      buttonText: "Sınırsızlığa Geç",
      buttonTextGlobal: "Get Unlimited Access",
      isPopular: false,
      shopierLink: "https://www.shopier.com/mirale/42406288",
      lemonSqueezyLink: "https://veritaslegalai.lemonsqueezy.com/checkout/buy/3b88cbb9-24b7-4749-af97-5cdb4e28538f"
    }
  ]; 

  const ui: any = {
    TR: { 
      title: "Veritas Q-AI", 
      sub: "YÜKSEK HUKUK ANALİTİĞİ", 
      aboutBtn: "Veritas Q-AI Nedir?", 
      aboutTitle: "Hukukun Geleceği: Veritas Q-AI ile Tanışın",
      aboutText: "Veritas Q-AI, hukuk profesyonellerinin çalışma biçimini dönüştürmek için tasarlanmış ileri seviye bir analiz ekosistemidir. Karmaşık hukuk belgelerini (PDF), güncel mevzuat ve yüksek mahkeme içtihatları ışığında saniyeler içinde tarar.\n\nSadece bir kelime arama motoru değil, metnin hukuki mantığını kavrayan bir yardımcıdır. Sözleşmelerdeki gizli riskleri tespit eder, dava dosyalarındaki eksiklikleri raporlar ve avukatlara stratejik karar alma süreçlerinde veri temelli bir dayanak sunar. Veritas ile manuel dosya inceleme saatlerini saniyelere indirerek, adaletin hızıyla teknolojinin gücünü birleştiriyoruz.",
      googleBtn: "Google ile Giriş Yap", 
      select: "Dosya Seç", 
      btn: "Kuantum ile Analizi Başlat", 
      upload: "PDF Belgesini Seçin", 
      download: "RAPORU İNDİR (.PDF)",
      resultTitle: "Analiz Sonucu",
      features: "Özellikler",
      pricing: "Fiyatlandırma",
      popularBadge: "★ EN POPÜLER",
      shopierSecurePayment: "Shopier ile Güvenli Ödeme",
      shopierBuy: "Shopier ile Satın Al",
      lemonSqueezyCheckout: "Lemon Squeezy ile Güvenli Ödeme",
      buyWithLemonSqueezy: "Lemon Squeezy ile Satın Al",
      feature1: "✓ Hızlı PDF analizi",
      feature2: "✓ Mevzuat uyumluluk kontrolü",
      feature3: "✓ Risk değerlendirme raporları",
      feature4: "✓ Çoklu dil desteği",
      howItWorksTitle: "Nasıl Çalışır?",
      step1Title: "Belge Yükle",
      step1Desc: "PDF belgenizi yükleyin",
      step2Title: "AI Tarama",
      step2Desc: "Yapay zeka belgenizi analiz eder",
      step3Title: "Risk Skoru",
      step3Desc: "Risk değerlendirmesini inceleyin",
      step4Title: "Uzman Chat & İndir",
      step4Desc: "Sorular sorun ve raporu indirin",
      featureGuideTitle: "Özellik Rehberi",
      featureGuideBtn: "?",
      riskScoreGuide: "Risk Skoru nedir?",
      riskScoreAnswer: "Risk Skoru, belgenizin hukuki risk seviyesini 0-100 arasında gösteren bir göstergedir. Yeşil (düşük risk), sarı (orta risk), turuncu (yüksek risk) ve kırmızı (kritik risk) renklerle görselleştirilir.",
      chatGuide: "AI Chat nasıl kullanılır?",
      chatAnswer: "Analiz tamamlandıktan sonra, belgeniz hakkında sorular sorabilirsiniz. AI, belgenizin içeriğine göre yanıt verir. Bu özellik Professional ve Enterprise paketlerinde mevcuttur.",
      legislationGuide: "Mevzuat referansları ne işe yarar?",
      legislationAnswer: "Analiz sonuçlarında geçen kanun maddeleri (TBK, CMK vb.) vurgulanır. Enterprise kullanıcıları bu maddelere tıklayarak detaylı mevzuat bilgisine erişebilir.",
      downloadGuide: "Rapor nasıl indirilir?",
      downloadAnswer: "Professional ve Enterprise paketlerinde, analiz sonuçlarını PDF veya Word formatında indirebilirsiniz. İndirme butonları sonuç ekranının altında yer alır.",
      closeGuide: "Kapat"
    },
    EN: { 
      title: "Veritas Q-AI", 
      sub: "SUPREME LEGAL ANALYTICS", 
      aboutBtn: "What is Veritas Q-AI?", 
      aboutTitle: "Quantum-Driven Legal Intelligence: Veritas Q-AI",
      aboutText: "Veritas Q-AI is not just a tool; it is a global legal ecosystem. Powered by a **Quantum Simulation Engine**, it analyzes complex documents across multiple jurisdictions simultaneously, delivering precision that classical AI cannot reach.\n\nVeritas Q-AI utilizes Quantum Entanglement Logic to cross-reference your documents with millions of live data points from Turkey, USA, UK, and Germany in real-time.\n\nBy simulating legal probabilities in a Multi-Jurisdictional Superposition, we detect hidden conflicts and risks before they become liabilities.",
      googleBtn: "Sign in with Google", 
      select: "Choose File", 
      btn: "Start Analysis with Quantum", 
      upload: "Select PDF Document", 
      download: "Download PDF",
      downloadWord: "Download Word",
      resultTitle: "Analysis Result",
      features: "Features",
      pricing: "Pricing",
      popularBadge: "★ MOST POPULAR",
      shopierSecurePayment: "Secure Payment with Shopier",
      shopierBuy: "Buy with Shopier",
      lemonSqueezyCheckout: "Secure Checkout with Lemon Squeezy",
      buyWithLemonSqueezy: "Buy with Lemon Squeezy",
      feature1: "✓ Fast PDF analysis",
      feature2: "✓ Legal compliance check",
      feature3: "✓ Risk assessment reports",
      feature4: "✓ Multi-language support",
      howItWorksTitle: "How It Works",
      step1Title: "Upload Document",
      step1Desc: "Upload your PDF document",
      step2Title: "AI Scanning",
      step2Desc: "AI analyzes your document",
      step3Title: "Review Risk Score",
      step3Desc: "Review risk assessment",
      step4Title: "Expert Chat & Export",
      step4Desc: "Ask questions and download report",
      featureGuideTitle: "Feature Guide",
      featureGuideBtn: "?",
      riskScoreGuide: "What is Risk Score?",
      riskScoreAnswer: "Risk Score is an indicator that shows your document's legal risk level on a scale of 0-100. It is visualized with green (low risk), yellow (medium risk), orange (high risk), and red (critical risk) colors.",
      chatGuide: "How to use AI Chat?",
      chatAnswer: "After the analysis is complete, you can ask questions about your document. The AI responds based on your document's content. This feature is available in Professional and Enterprise packages.",
      legislationGuide: "What are legislation references for?",
      legislationAnswer: "Legal articles (TCO, Code of Criminal Procedure, etc.) mentioned in analysis results are highlighted. Enterprise users can click on these articles to access detailed legislation information.",
      downloadGuide: "How to download report?",
      downloadAnswer: "In Professional and Enterprise packages, you can download analysis results in PDF or Word format. Download buttons are located at the bottom of the results screen.",
      closeGuide: "Close"
    },
    FR: { 
      title: "VERITAS Q-AI", 
      sub: "ANALYTIQUE JURIDIQUE SUPÉRIEURE", 
      aboutBtn: "Qu'est-ce que Veritas Q-AI?", 
      aboutTitle: "À propos de Veritas Q-AI",
      aboutText: "Veritas est une plateforme d'analyse juridique avancée basée sur l'intelligence artificielle, développée pour les avocats et les professionnels du droit. Elle analyse des documents PDF complexes en quelques secondes, identifie les bases légales et génère des rapports d'évaluation des risques.",
      googleBtn: "Se connecter avec Google", 
      select: "Sélectionner un fichier", 
      btn: "DÉMARRER L'ANALYSE", 
      upload: "Sélectionner un document PDF", 
      download: "TÉLÉCHARGER LE RAPPORT (.PDF)",
      downloadWord: "TÉLÉCHARGER EN WORD",
      resultTitle: "Résultat de l'analyse",
      features: "Caractéristiques",
      pricing: "Tarification",
      popularBadge: "★ LE PLUS POPULAIRE",
      shopierSecurePayment: "Paiement sécurisé avec Shopier",
      shopierBuy: "Acheter avec Shopier",
      lemonSqueezyCheckout: "Paiement sécurisé avec Lemon Squeezy",
      buyWithLemonSqueezy: "Acheter avec Lemon Squeezy",
      feature1: "✓ Analyse PDF rapide",
      feature2: "✓ Vérification de conformité légale",
      feature3: "✓ Rapports d'évaluation des risques",
      feature4: "✓ Support multilingue"
    },
    DE: { 
      title: "VERITAS Q-AI", 
      sub: "HÖCHSTE RECHTSANALYTIK", 
      aboutBtn: "Was ist Veritas Q-AI?", 
      aboutTitle: "Über Veritas Q-AI",
      aboutText: "Veritas ist eine fortschrittliche KI-gestützte Rechtsanalytik-Plattform, die für Anwälte und Rechtsexperten entwickelt wurde. Sie analysiert komplexe PDF-Dokumente in Sekunden, identifiziert Rechtsgrundlagen und erstellt Risikobewertungen.",
      googleBtn: "Mit Google anmelden", 
      select: "Datei auswählen", 
      btn: "Analyse mit Quantum starten", 
      upload: "PDF-Dokument auswählen", 
      download: "BERICHT HERUNTERLADEN (.PDF)",
      downloadWord: "ALS WORD HERUNTERLADEN",
      resultTitle: "Analyseergebnis",
      features: "Funktionen",
      pricing: "Preise",
      popularBadge: "★ BELIEBTESTE",
      shopierSecurePayment: "Sicherer Zahlung mit Shopier",
      shopierBuy: "Mit Shopier kaufen",
      lemonSqueezyCheckout: "Sicherer Checkout mit Lemon Squeezy",
      buyWithLemonSqueezy: "Mit Lemon Squeezy kaufen",
      feature1: "✓ Schnelle PDF-Analyse",
      feature2: "✓ Rechtliche Compliance-Prüfung",
      feature3: "✓ Risikobewertungsberichte",
      feature4: "✓ Mehrsprachige Unterstützung"
    },
    RU: { 
      title: "VERITAS Q-AI", 
      sub: "ВЫСШАЯ ЮРИДИЧЕСКАЯ АНАЛИТИКА", 
      aboutBtn: "Что такое Veritas Q-AI?", 
      aboutTitle: "О Veritas Q-AI",
      aboutText: "Veritas - это передовая платформа юридической аналитики на основе искусственного интеллекта, разработанная для юристов и правовых специалистов. Она анализирует сложные PDF-документы за секунды, находит правовые основания и создает отчеты об оценке рисков.",
      googleBtn: "Войти через Google", 
      select: "Выбрать файл", 
      btn: "НАЧАТЬ АНАЛИЗ", 
      upload: "Выберите PDF-документ", 
      download: "СКАЧАТЬ ОТЧЕТ (.PDF)",
      downloadWord: "СКАЧАТЬ В WORD",
      resultTitle: "Результат анализа",
      features: "Функции",
      pricing: "Цены",
      popularBadge: "★ САМЫЙ ПОПУЛЯРНЫЙ",
      shopierSecurePayment: "Безопасная оплата через Shopier",
      shopierBuy: "Купить через Shopier",
      lemonSqueezyCheckout: "Безопасная оплата через Lemon Squeezy",
      buyWithLemonSqueezy: "Купить через Lemon Squeezy",
      feature1: "✓ Быстрый анализ PDF",
      feature2: "✓ Проверка правового соответствия",
      feature3: "✓ Отчеты об оценке рисков",
      feature4: "✓ Многоязычная поддержка"
    },
    ZH: { 
      title: "VERITAS Q-AI", 
      sub: "最高法律分析", 
      aboutBtn: "什么是 Veritas Q-AI?", 
      aboutTitle: "关于 Veritas Q-AI",
      aboutText: "Veritas 是一个为律师和法律专业人士开发的先进人工智能驱动的法律分析平台。它在几秒钟内分析复杂的PDF文档，识别法律依据，并生成风险评估。",
      googleBtn: "使用 Google 登录", 
      select: "选择文件", 
      btn: "开始分析", 
      upload: "选择 PDF 文档", 
      download: "下载报告 (.PDF)",
      downloadWord: "下载 Word 文档",
      resultTitle: "分析结果",
      features: "功能",
      pricing: "定价",
      popularBadge: "★ 最受欢迎",
      shopierSecurePayment: "通过 Shopier 安全支付",
      shopierBuy: "通过 Shopier 购买",
      lemonSqueezyCheckout: "通过 Lemon Squeezy 安全结账",
      buyWithLemonSqueezy: "通过 Lemon Squeezy 购买",
      feature1: "✓ 快速 PDF 分析",
      feature2: "✓ 法律合规检查",
      feature3: "✓ 风险评估报告",
      feature4: "✓ 多语言支持"
    },
    AR: { 
      title: "VERITAS Q-AI", 
      sub: "التحليلات القانونية العليا", 
      aboutBtn: "ما هو Veritas Q-AI?", 
      aboutTitle: "حول Veritas Q-AI",
      aboutText: "Veritas هي منصة تحليلات قانونية متقدمة مدعومة بالذكاء الاصطناعي، تم تطويرها للمحامين والمهنيين القانونيين. تحلل مستندات PDF المعقدة في ثوانٍ، وتحدد الأسس القانونية، وتولد تقارير تقييم المخاطر.",
      googleBtn: "تسجيل الدخول باستخدام Google", 
      select: "اختر الملف", 
      btn: "بدء التحليل", 
      upload: "اختر مستند PDF", 
      download: "تحميل التقرير (.PDF)",
      downloadWord: "تحميل Word",
      resultTitle: "نتيجة التحليل",
      features: "الميزات",
      pricing: "التسعير",
      popularBadge: "★ الأكثر شعبية",
      shopierSecurePayment: "الدفع الآمن مع Shopier",
      shopierBuy: "شراء مع Shopier",
      lemonSqueezyCheckout: "الدفع الآمن مع Lemon Squeezy",
      buyWithLemonSqueezy: "شراء مع Lemon Squeezy",
      feature1: "✓ تحليل PDF سريع",
      feature2: "✓ فحص الامتثال القانوني",
      feature3: "✓ تقارير تقييم المخاطر",
      feature4: "✓ دعم متعدد اللغات"
    }
  };

  // Check for payment success
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success') === 'true' || urlParams.get('payment') === 'success') {
        setShowSuccessCelebration(true);
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowSuccessCelebration(false);
        }, 5000);
      }
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      // Kullanıcı paket bilgisini ve analiz sayısını Supabase'den yükle
      if (session?.user) {
        const userId = session.user.id;
        
        // Admin kontrolü
        const userEmail = session.user.email;
        const adminStatus = userEmail && ADMIN_EMAILS.includes(userEmail);
        setIsAdmin(adminStatus || false);
        
        // Admin ise user.role ve user.plan ayarla
        if (adminStatus) {
          setUser((prevUser: any) => ({
            ...prevUser,
            role: 'ADMIN',
            plan: 'GLOBAL'
          }));
        }
        
        try {
          // Profiles tablosundan paket bilgisini çek (hata alsa bile devam et)
          let profile: any = null;
          try {
            const { data, error: profileError } = await supabase
              .from('profiles')
              .select('package_type, analysis_count, analysis_count_reset_date')
              .eq('id', userId)
              .maybeSingle();
            
            if (!profileError) {
              profile = data;
            }
            // Hata olsa bile sessizce devam et (404 veya başka hatalar)
          } catch (profileFetchError) {
            // Sessizce devam et - profiles tablosu yoksa veya hata varsa
            profile = null;
          }
          
          // Admin ise quantum_global paketini zorla ayarla
          const packageType = adminStatus 
            ? 'quantum_global' as UserPackage
            : (profile?.package_type || 'free') as UserPackage;
          setUserPackage(packageType);
          
          // Aylık reset kontrolü
          const resetDate = profile?.analysis_count_reset_date ? new Date(profile.analysis_count_reset_date) : new Date();
          const now = new Date();
          const shouldReset = now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear();
          
          if (shouldReset && profile) {
            // Analiz sayısını sıfırla
            await supabase
              .from('profiles')
              .update({ 
                analysis_count: 0,
                analysis_count_reset_date: now.toISOString()
              })
              .eq('id', userId);
            setAnalysisCount(0);
          } else {
            setAnalysisCount(profile?.analysis_count || 0);
          }
          
          // Kullanıcı kredilerini çek
          try {
            const response = await fetch('/api/get-credits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: userId })
            });
            
            if (response.ok) {
              const data = await response.json();
              setUserCredits(data.credits || 0);
            }
          } catch (err) {
            console.error('Credit fetch error:', err);
          }
          
          // Enterprise, Professional, quantum_global ve Admin kullanıcıları için analiz geçmişini çek
          if (packageType === 'enterprise' || packageType === 'professional' || packageType === 'quantum_global' || isAdmin) {
            const { data: analyses, error: analysesError } = await supabase
              .from('analyses')
              .select('id, file_name, analysis_summary, created_at, analysis_result, risk_score')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(100);
            
            if (!analysesError && analyses) {
              const history = analyses.map(a => ({
                id: a.id,
                title: a.file_name,
                date: new Date(a.created_at).toLocaleString(language === 'TR' ? 'tr-TR' : 'en-US'),
                summary: a.analysis_summary || (typeof a.analysis_result === 'string' ? a.analysis_result.substring(0, 200) + '...' : 'Analysis completed'),
                fullResult: typeof a.analysis_result === 'string' ? a.analysis_result : JSON.stringify(a.analysis_result),
                riskScore: a.risk_score || extractRiskScore(typeof a.analysis_result === 'string' ? a.analysis_result : JSON.stringify(a.analysis_result))
              }));
              setAnalysisHistory(history);
            }
          } else {
            setAnalysisHistory([]);
          }
        } catch (err) {
          console.error('Auth init error:', err);
          // Fallback: localStorage
          const storedPackage = localStorage.getItem(`userPackage_${userId}`) as UserPackage;
          const storedCount = parseInt(localStorage.getItem(`analysisCount_${userId}`) || '0');
          setUserPackage(storedPackage || 'free');
          setAnalysisCount(storedCount);
        }
      } else {
        // Giriş yapmamış kullanıcılar için ücretsiz paket
        const freeCount = parseInt(localStorage.getItem('freeAnalysisCount') || '0');
        setUserPackage('free');
        setAnalysisCount(freeCount);
      }
    };
    initAuth();
    
    // Admin test ayarlarını yükle
    if (typeof window !== 'undefined') {
      const savedRegion = localStorage.getItem('adminTestRegion');
      if (savedRegion === 'TR') setTestMode(true);
      else if (savedRegion === 'GLOBAL') setTestMode(false);
      else setTestMode(null);
    }
    
    // Sayfa yenilendiğinde limit uyarısını sıfırla (tekrar gösterilebilir hale getir)
    setLimitWarningDismissed(false);
  }, [supabase, language]);
  
  // Paket limitlerini kontrol et
  const checkAnalysisLimit = async (): Promise<boolean> => {
    // Test Modu / Development Modunda sınırsız analiz
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      return true; // Development modunda her zaman true döndür
    }
    
    const pkg = effectivePackage;
    if (!pkg) return false;
    
    const limits: Record<Exclude<UserPackage, null>, number> = {
      'free': 1,
      'basic': 10,
      'professional': 50,
      'enterprise': Infinity,
      'quantum_global': Infinity
    };
    
    const limit = limits[pkg] || 1;
    
    // Admin test modunda Supabase kontrolü atla
    if (adminTestMode && adminTestPackage) {
      return analysisCount < limit;
    }
    
    // Supabase'den güncel analiz sayısını çek (hata alsa bile devam et)
    if (user?.id) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('analysis_count')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.warn('[checkAnalysisLimit] Profile fetch error (ignored):', profileError);
          return true; // Hata durumunda analiz yapılmasına izin ver
        }
        
        if (profile) {
          const currentCount = profile.analysis_count || 0;
          return currentCount < limit;
        }
        return true; // Profil yoksa analiz yapılmasına izin ver
      } catch (err) {
        // Sessizce devam et - profiles tablosu yoksa veya hata varsa
      }
    }
    
    return analysisCount < limit;
  };
  
  // Usage Reset fonksiyonu
  const handleUsageReset = async () => {
      if (adminTestMode) {
        setAnalysisCount(0);
        if (user?.id) {
          try {
            await supabase
              .from('profiles')
              .update({ analysis_count: 0 })
              .eq('id', user.id);
          } catch (err) {
            // Sessizce devam et - profiles tablosu yoksa veya hata varsa
          }
        }
      localStorage.setItem('freeAnalysisCount', '0');
      if (user?.id) {
        localStorage.setItem(`analysisCount_${user.id}`, '0');
      }
    }
  };
  
  // Paket bazlı yetki kontrol fonksiyonları (Admin Test Panel ile uyumlu)
  const canDownload = (): boolean => {
    const pkg = effectivePackage;
    return pkg === 'professional' || pkg === 'enterprise';
  };

  const canUseChat = (): boolean => {
    const pkg = effectivePackage;
    return pkg === 'professional' || pkg === 'enterprise';
  };

  const canViewDetailedAnalysis = (): boolean => {
    // Admin email kontrolü - Hardcode ADMIN ve GLOBAL plan
    if (user?.email === 'elmas7853@gmail.com') {
      return true; // Admin için her zaman true
    }
    const pkg = effectivePackage;
    return pkg === 'professional' || pkg === 'enterprise' || pkg === 'quantum_global';
  };

  const canViewRiskScore = (): boolean => {
    // Admin email kontrolü - Hardcode ADMIN ve GLOBAL plan
    if (user?.email === 'elmas7853@gmail.com') {
      return true; // Admin için her zaman true
    }
    const pkg = effectivePackage;
    return pkg === 'professional' || pkg === 'enterprise' || pkg === 'quantum_global';
  };

  const canAccessHistory = (): boolean => {
    // VIP/Admin kullanıcılar için erişim
    if (isAdmin) return true;
    const pkg = effectivePackage;
    // Pro paketleri için erişim
    return pkg === 'professional' || pkg === 'enterprise' || pkg === 'quantum_global';
  };

  const canAccessLegislationDetails = (): boolean => {
    const pkg = effectivePackage;
    return pkg === 'enterprise';
  };

  // Limit uyarı kontrolü
  const getUsagePercentage = (): number => {
    // Admin için limit yok
    if (isAdmin) return 0;
    
    const pkg = effectivePackage;
    if (!pkg) return 0;
    
    const limits: Record<Exclude<UserPackage, null>, number> = {
      'free': 1,
      'basic': 10,
      'professional': 50,
      'enterprise': Infinity,
      'quantum_global': Infinity
    };
    
    const limit = limits[pkg] || 1;
    if (limit === Infinity) return 0;
    
    return Math.min((analysisCount / limit) * 100, 100);
  };

  const shouldShowLimitWarning = (): boolean => {
    // Test Modu / Development Modunda uyarı gösterme
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      return false; // Development modunda uyarı gösterme
    }
    
    if (limitWarningDismissed) return false;
    const usage = getUsagePercentage();
    return usage >= 80 && usage < 100;
  };

  const isLimitReached = (): boolean => {
    // Admin için limit yok
    if (isAdmin) return false;
    
    // Test Modu / Development Modunda limit yok
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      return false; // Development modunda limit dolmamış sayılır
    }
    
    return getUsagePercentage() >= 100;
  };

  // Risk skorunu analiz sonucundan çıkar
  const extractRiskScore = (text: string): number => {
    if (!text) return 0;
    
    // Metinde risk skorunu ara (örn: "Risk Score: 75", "Risk: 60%", "Puan: 45")
    const riskPatterns = [
      /risk\s*score[:\s]*(\d+)/i,
      /risk[:\s]*(\d+)\s*%/i,
      /puan[:\s]*(\d+)/i,
      /score[:\s]*(\d+)/i,
      /(\d+)\s*risk/i,
      /risk\s*level[:\s]*(\d+)/i
    ];
    
    for (const pattern of riskPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const score = parseInt(match[1]);
        if (score >= 0 && score <= 100) {
          return score;
        }
      }
    }
    
    // Eğer skor bulunamazsa, metindeki risk kelimelerine göre tahmin et
    const riskKeywords = language === 'TR' 
      ? ['yüksek risk', 'düşük risk', 'orta risk', 'kritik', 'tehlike', 'uyarı']
      : ['high risk', 'low risk', 'medium risk', 'critical', 'danger', 'warning'];
    
    const lowerText = text.toLowerCase();
    let riskCount = 0;
    
    if (lowerText.includes('high risk') || lowerText.includes('yüksek risk') || lowerText.includes('kritik')) {
      riskCount += 3;
    }
    if (lowerText.includes('medium risk') || lowerText.includes('orta risk') || lowerText.includes('warning') || lowerText.includes('uyarı')) {
      riskCount += 2;
    }
    if (lowerText.includes('low risk') || lowerText.includes('düşük risk')) {
      riskCount += 1;
    }
    
    // Risk kelimelerinin sayısına göre skor hesapla
    const riskWordCount = riskKeywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      return count + (text.match(regex)?.length || 0);
    }, 0);
    
    // Basit bir hesaplama: risk kelimelerinin sayısına göre 0-100 arası skor
    const estimatedScore = Math.min(100, Math.max(0, (riskWordCount * 15) + (riskCount * 20)));
    
    return estimatedScore > 0 ? estimatedScore : Math.floor(Math.random() * 30) + 20; // Fallback: 20-50 arası
  };

  // Risk skoruna göre renk belirle
  const getRiskColor = (score: number): string => {
    if (score <= 30) return '#4ade80'; // Yeşil - Safe
    if (score <= 60) return '#fbbf24'; // Sarı - Warning
    if (score <= 80) return '#f97316'; // Turuncu - Caution
    return '#ef4444'; // Kırmızı - Danger
  };

  // Risk seviyesi metni
  const getRiskLevel = (score: number): string => {
    if (score <= 30) return language === 'TR' ? 'Düşük Risk' : 'Low Risk';
    if (score <= 60) return language === 'TR' ? 'Orta Risk' : 'Medium Risk';
    if (score <= 80) return language === 'TR' ? 'Yüksek Risk' : 'High Risk';
    return language === 'TR' ? 'Kritik Risk' : 'Critical Risk';
  };

  // Hukuki kısaltmaları yerelleştir (İngilizce için)
  const localizeLegalAcronyms = (text: string, isEnglish: boolean): string => {
    if (!isEnglish || !text) return text;
    
    // Türkçe hukuki kısaltmalar ve İngilizce karşılıkları
    const acronymMap: Record<string, { first: string, subsequent: string }> = {
      'KVKK': { 
        first: 'GDPR (Personal Data Protection Law)', 
        subsequent: 'GDPR' 
      },
      'TBK': { 
        first: 'TCO (Turkish Code of Obligations)', 
        subsequent: 'TCO' 
      },
      'HMK': { 
        first: 'Code of Civil Procedure', 
        subsequent: 'Code of Civil Procedure' 
      },
      'İİK': { 
        first: 'EBL (Enforcement and Bankruptcy Law)', 
        subsequent: 'EBL' 
      },
      'AYM': { 
        first: 'Constitutional Court', 
        subsequent: 'Constitutional Court' 
      },
      'CMK': { 
        first: 'Code of Criminal Procedure', 
        subsequent: 'Code of Criminal Procedure' 
      },
      'TMK': { 
        first: 'Turkish Civil Code', 
        subsequent: 'Turkish Civil Code' 
      },
      'İK': { 
        first: 'Labor Law', 
        subsequent: 'Labor Law' 
      },
      'YİK': { 
        first: 'Code of Administrative Procedure', 
        subsequent: 'Code of Administrative Procedure' 
      },
      'BİST': { 
        first: 'Borsa Istanbul', 
        subsequent: 'Borsa Istanbul' 
      },
      'SPK': { 
        first: 'Capital Markets Board', 
        subsequent: 'Capital Markets Board' 
      },
      'BDDK': { 
        first: 'Banking Regulation and Supervision Agency', 
        subsequent: 'BDDK' 
      },
      'RTÜK': { 
        first: 'Radio and Television Supreme Council', 
        subsequent: 'RTÜK' 
      },
      'TÜİK': { 
        first: 'Turkish Statistical Institute', 
        subsequent: 'TÜİK' 
      },
      'TSE': { 
        first: 'Turkish Standards Institution', 
        subsequent: 'TSE' 
      },
      'TİB': { 
        first: 'Information and Communication Technologies Authority', 
        subsequent: 'TİB' 
      }
    };
    
    let localizedText = text;
    const foundAcronyms = new Map<string, boolean>();
    
    // Her kısaltmayı kontrol et ve değiştir
    Object.entries(acronymMap).forEach(([turkish, translations]) => {
      // Kısaltmanın tam kelime olarak geçtiğini kontrol et
      const escapedTurkish = turkish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTurkish}\\b`, 'gi');
      
      localizedText = localizedText.replace(regex, (match) => {
        // Eğer zaten İngilizce açıklama varsa değiştirme
        if (localizedText.includes(translations.first) && !foundAcronyms.has(turkish)) {
          return match;
        }
        
        const isFirst = !foundAcronyms.has(turkish);
        if (isFirst) {
          foundAcronyms.set(turkish, true);
          return translations.first;
        } else {
          return translations.subsequent;
        }
      });
    });
    
    return localizedText;
  };

  // Mevzuat detaylarını getir
  const fetchLegislationDetail = (law: string, article: string) => {
    // Basit bir implementasyon - gerçek uygulamada API çağrısı yapılabilir
    const legislationContent = `${law} - Madde ${article} detayları burada gösterilecek.`;
    setSelectedLegislation({
      title: `${law} - Madde ${article}`,
      content: legislationContent
    });
    setShowLegislationModal(true);
  };

  // Mevzuat referanslarını tespit et
  const detectLegislationReferences = (text: string): Array<{match: string, law: string, article: string}> => {
    if (!text) return [];
    
    const references: Array<{match: string, law: string, article: string}> = [];
    
    // Yaygın mevzuat referansları için regex pattern'leri
    const patterns = [
      // KVKK m. 5, GDPR Article 5 gibi formatlar
      /(KVKK|GDPR|GDPR \(Personal Data Protection Law\))\s*(?:m\.|madde|article|art\.)\s*(\d+)/gi,
      // 6698 sayılı Kanun m. 5 gibi formatlar
      /\d+\s*sayılı\s*(?:Kanun|Law)\s*(?:m\.|madde|article|art\.)\s*(\d+)/gi,
      // Article 5 of GDPR gibi formatlar
      /(?:article|art\.|madde|m\.)\s*(\d+)\s*(?:of|)\s*(KVKK|GDPR|GDPR \(Personal Data Protection Law\))/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        references.push({
          match: match[0],
          law: match[1] || match[2] || 'Unknown',
          article: match[2] || match[1] || 'Unknown'
        });
      }
    });
    
    return references;
  };

  // Sonuç metnini özet ve detaylı analiz olarak ayır
  const parseAnalysisResult = (text: string) => {
    if (!text) return { summary: '', detailed: '' };
    
    // Metni bölümlere ayır (başlıklara göre)
    const summaryKeywords = language === 'TR' 
      ? ['Özet', 'Anahtar Noktalar', 'Genel Bakış', 'Sonuç', 'Yönetici Özeti']
      : ['Summary', 'Key Points', 'Overview', 'Conclusion', 'Executive Summary'];
    
    const detailedKeywords = language === 'TR'
      ? ['Risk Analizi', 'Madde İncelemesi', 'Detaylı Analiz', 'Teknik Detaylar', 'Ayrıntılı', 'Risk', 'Madde']
      : ['Risk Analysis', 'Article Review', 'Detailed Analysis', 'Technical Details', 'Detailed', 'Risk', 'Article'];
    
    const lines = text.split('\n');
    let summaryParts: string[] = [];
    let detailedParts: string[] = [];
    let currentSection: 'summary' | 'detailed' | 'none' = 'none';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const upperLine = line.toUpperCase();
      
      // Özet bölümünü tespit et
      const isSummaryHeader = summaryKeywords.some(keyword => 
        upperLine.includes(keyword.toUpperCase())
      );
      
      // Detaylı analiz bölümünü tespit et
      const isDetailedHeader = detailedKeywords.some(keyword =>
        upperLine.includes(keyword.toUpperCase())
      );
      
      if (isSummaryHeader) {
        currentSection = 'summary';
        summaryParts.push(line);
      } else if (isDetailedHeader) {
        currentSection = 'detailed';
        detailedParts.push(line);
      } else if (line.length > 0) {
        if (currentSection === 'summary') {
          summaryParts.push(line);
        } else if (currentSection === 'detailed') {
          detailedParts.push(line);
        } else {
          // Başlık yoksa, ilk paragrafları özet olarak kabul et
          if (summaryParts.length < 10) {
            summaryParts.push(line);
          } else {
            detailedParts.push(line);
          }
        }
      }
    }
    
    // Eğer ayrım yapılamadıysa, metni ikiye böl
    if (summaryParts.length === 0 && detailedParts.length === 0) {
      const midPoint = Math.floor(lines.length / 2);
      summaryParts = lines.slice(0, midPoint).filter(l => l.trim().length > 0);
      detailedParts = lines.slice(midPoint).filter(l => l.trim().length > 0);
    }
    
    return {
      summary: summaryParts.length > 0 ? summaryParts.join('\n') : text.substring(0, Math.floor(text.length / 2)),
      detailed: detailedParts.length > 0 ? detailedParts.join('\n') : text.substring(Math.floor(text.length / 2))
    };
  };

  // Avatar oluşturma fonksiyonu
  const getAvatarInitials = (userData: any): string => {
    if (!userData) return 'U';
    
    // Önce full_name'i kontrol et
    const fullName = userData.user_metadata?.full_name || userData.user_metadata?.name || '';
    
    if (fullName) {
      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        // İsim ve soyismin ilk harfleri
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
      } else if (nameParts.length === 1) {
        // Sadece isim varsa ilk 2 harf
        return nameParts[0].substring(0, 2).toUpperCase();
      }
    }
    
    // E-posta adresinden fallback
    const email = userData.email || '';
    if (email) {
      const emailParts = email.split('@')[0];
      if (emailParts.length >= 2) {
        return emailParts.substring(0, 2).toUpperCase();
      }
      return emailParts.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  useEffect(() => {
    // Buton stilini zorla uygula
    const button = document.getElementById('selectFileButton');
    if (button) {
      button.style.setProperty('background-color', '#ffffff', 'important');
      button.style.setProperty('background', '#ffffff', 'important');
      button.style.setProperty('color', '#000000', 'important');
      button.style.setProperty('border-color', '#ffffff', 'important');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (languageMenuOpen && !target.closest('[data-language-menu]')) {
        setLanguageMenuOpen(false);
      }
      if (userMenuOpen && !target.closest('[data-user-menu]')) {
        setUserMenuOpen(false);
      }
    };
    if (languageMenuOpen || userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [languageMenuOpen, userMenuOpen]);

  // Loading mesajlarını sırayla değiştir
  useEffect(() => {
    if (!loading) {
      setCurrentLoadingMessageIndex(0);
      return;
    }

    const messages = language === 'TR' 
      ? [
          'Qubit Matrisleri Senkronize Ediliyor...',
          'Kuantum Olasılık Algoritması Çalışıyor...',
          'Dolanık Veri Setleri Analiz Ediliyor...'
        ]
      : [
          'Synchronizing Qubit Matrices...',
          'Quantum Probability Algorithm Running...',
          'Analyzing Entangled Data Sets...'
        ];

    const interval = setInterval(() => {
      setCurrentLoadingMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [loading, language]);

  const handleAuth = async () => {
    // Dinamik olarak mevcut domain'i kullan (localhost veya production)
    let baseUrl: string;
    
    if (typeof window !== 'undefined') {
      // Browser'da çalışıyorsa mevcut origin'i kullan (localhost:3000 veya veritasq.ai)
      baseUrl = window.location.origin;
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      // Server-side'da environment variable varsa onu kullan
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      // Fallback: Eğer hiçbiri yoksa, varsayılan olarak localhost kullan (development için)
      baseUrl = 'http://localhost:3000';
    }
    
    const redirectUrl = `${baseUrl}/auth/callback`;
    
    console.log('Google Auth Redirect URL:', redirectUrl); // Debug için
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    
    try {
      // Analiz metnini bağlam olarak kullan (result veya pdfText)
      const contextText = result || pdfText || '';
      
      // Konuşma geçmişini formatla (API'nin beklediği formata)
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          pdfText: contextText,
          conversationHistory: conversationHistory,
          targetLang: language
        })
      });
      
      const data = await res.json();
      const assistantMessage = data.reply || data.error || (language === 'TR' ? 'Üzgünüm, isteğinizi işleyemedim.' : 'Sorry, I could not process your request.');
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = language === 'TR' 
        ? 'Bir hata oluştu. Lütfen tekrar deneyin.' 
        : 'An error occurred. Please try again.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!file || !file2) return;
    
    setLoading(true);
    setResult("");
    setComparisonResult(null);
    
    try {
      // PDF'lerden metin çıkarma
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      
      // İlk dosya
      const arrayBuffer1 = await file.arrayBuffer();
      const pdf1 = await pdfjsLib.getDocument({ data: arrayBuffer1 }).promise;
      let fullText1 = '';
      for (let i = 1; i <= pdf1.numPages; i++) {
        const page = await pdf1.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText1 += pageText + '\n';
      }
      
      // İkinci dosya
      const arrayBuffer2 = await file2.arrayBuffer();
      const pdf2 = await pdfjsLib.getDocument({ data: arrayBuffer2 }).promise;
      let fullText2 = '';
      for (let i = 1; i <= pdf2.numPages; i++) {
        const page = await pdf2.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText2 += pageText + '\n';
      }
      
      // Dil kodunu belirle
      const langMap: any = {
        'TR': 'Türkçe',
        'EN': 'English',
        'FR': 'Français',
        'DE': 'Deutsch',
        'RU': 'Русский',
        'ZH': '中文',
        'AR': 'العربية'
      };
      const targetLang = langMap[language] || 'English';
      
      // API'ye gönder
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfText1: fullText1,
          pdfText2: fullText2,
          targetLang: targetLang,
          userPackage: effectivePackage,
          isGlobalPackage: effectivePackage === 'enterprise' || effectivePackage === 'quantum_global'
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.requiresUpgrade) {
          alert(data.error || (language === 'TR' ? 'Paket yükseltmesi gerekli' : 'Package upgrade required'));
          // setActiveTab('pricing'); // YORUM SATIRINA ALINDI - Redirect yapmasın
          return;
        }
        throw new Error(data.error || 'Comparison failed');
      }
      
      setResult(data.reply || 'Comparison complete');
      setComparisonResult(data);
      setAnalysisStatus('');
    } catch (error: any) {
      console.error('Comparison error:', error);
      alert(error.message || (language === 'TR' ? 'Karşılaştırma sırasında bir hata oluştu.' : 'An error occurred during comparison.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    console.log('========================================');
    console.log('🚀 ANALİZ BAŞLADI - FONKSİYON ÇAĞRILDI!');
    console.log('========================================');
    
    // userId'yi fonksiyonun başında bir kez tanımla (tüm kullanımlar için)
    const userId = user?.id;
    
    // Sayfa yenilenmesini engelle
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[handleAnalyze] preventDefault ve stopPropagation çağrıldı');
    }
    
    console.log('[handleAnalyze] İlk kontroller başlıyor...', {
      uploadMode,
      hasFile: !!file,
      hasFile2: !!file2,
      isAdmin,
      userCredits,
      userPackage
    });
    
    // Compare mode kontrolü
    if ((uploadMode as any) === 'compare') {
      console.log('[handleAnalyze] Compare mode aktif');
      if (!file || !file2) {
        alert(language === 'TR' ? 'Lütfen karşılaştırma için iki dosya seçin.' : 'Please select both documents for comparison.');
        return;
      }
      
      // Paket kontrolü
      if (!effectivePackage || effectivePackage === 'free') {
        alert(language === 'TR' 
          ? 'Dosya karşılaştırma özelliği Professional veya Global paket gerektirir.' 
          : 'Document comparison requires Professional or Global package.');
        // setActiveTab('pricing'); // YORUM SATIRINA ALINDI - Redirect yapmasın
        return;
      }
      
      // Compare işlemi
      await handleCompare();
      return;
    }
    
    if (!file) {
      console.log('[handleAnalyze] Dosya seçilmemiş, çıkılıyor');
      return;
    }
    
    console.log('[handleAnalyze] Dosya kontrolü geçti, limit kontrolleri başlıyor...');
    
    // TEST MODU: Tüm kontrolleri atla, direkt analiz yap
    // Admin kontrolü - Admin ise limit bypass
    if (!isAdmin) {
      console.log('[handleAnalyze] Admin değil, limit kontrolleri yapılıyor...');
      // Kredi kontrolü (Pay-as-you-go için) - TEST MODU: Atla
      // if (userCredits <= 0 && !userPackage) {
      //   setShowCreditModal(true);
      //   return;
      // }
      
      // Limit kontrolü (Supabase'den - Subscription için) - TEST MODU: Atla
      // const canAnalyze = await checkAnalysisLimit();
      // if (!canAnalyze) {
      //   setShowLimitModal(true);
      //   return;
      // }
      console.log('[handleAnalyze] TEST MODU: Limit kontrolleri atlandı, analiz devam ediyor');
    } else {
      console.log('[handleAnalyze] Admin kullanıcı, limit kontrolleri atlandı');
    }
    
    setLoading(true);
    setIsAnalyzing(true);
    setResult("");
    try {
      // PDF'den metin çıkarma - GÜÇLENDİRİLMİŞ HATA YÖNETİMİ
      let fullText = '';
      
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        
        const arrayBuffer = await file.arrayBuffer();
        
        // PDF yapısını kontrol et
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error('PDF dosyası boş veya geçersiz');
        }
        
        // PDF'i yükle - daha esnek ayarlarla
        const pdf = await pdfjsLib.getDocument({ 
          data: arrayBuffer,
          verbosity: 0, // Hata mesajlarını azalt
          stopAtErrors: false, // Hatalarda durma, devam et
          maxImageSize: 1024 * 1024, // 1MB
          isEvalSupported: false,
          useSystemFonts: true
        }).promise;
        
        // Sayfa sayısını kontrol et
        if (!pdf || !pdf.numPages || pdf.numPages === 0) {
          throw new Error('PDF dosyasında sayfa bulunamadı');
        }
        
        // Her sayfadan metin çıkar
        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            if (textContent && textContent.items && textContent.items.length > 0) {
              const pageText = textContent.items
                .map((item: any) => item.str || '')
                .filter((str: string) => str.trim().length > 0)
                .join(' ');
              fullText += pageText + '\n';
            }
          } catch (pageError) {
            console.warn(`Sayfa ${i} okunamadı:`, pageError);
            // Sayfa hatası olsa bile devam et
            fullText += `\n[Sayfa ${i} okunamadı - görsel içerik veya korumalı dosya olabilir]\n`;
          }
        }
        
        // Eğer hiç metin çıkarılamadıysa
        if (!fullText || fullText.trim().length === 0) {
          fullText = `[PDF dosyasından metin çıkarılamadı. Dosya görsel tabanlı, korumalı veya bozuk olabilir. Dosya adı: ${file.name}, Boyut: ${(file.size / 1024).toFixed(2)} KB]`;
        }
        
      } catch (pdfError: any) {
        console.error('PDF okuma hatası:', pdfError);
        // PDF okunamazsa bile kullanıcıya teknik bir rapor sun
        fullText = `[PDF OKUMA HATASI] Dosya yapısı karmaşık veya geçersiz olabilir. 
Dosya Bilgileri:
- Dosya Adı: ${file.name}
- Dosya Boyutu: ${(file.size / 1024).toFixed(2)} KB
- Hata Detayı: ${pdfError.message || 'Bilinmeyen hata'}
- Öneri: Dosyanın şifre korumalı olmadığından, bozuk olmadığından ve standart PDF formatında olduğundan emin olun.

Sistem bu dosyayı analiz etmeye çalışacak ancak eksik bilgiler olabilir.`;
      }
      
      // PDF metnini state'e kaydet (chat için)
      setPdfText(fullText);

      // Dil kodunu belirle
      const langMap: any = {
        'TR': 'Türkçe',
        'EN': 'English',
        'FR': 'Français',
        'DE': 'Deutsch',
        'RU': 'Русский',
        'ZH': '中文',
        'AR': 'العربية'
      };
      const targetLang = langMap[language] || 'English';

      // API'ye gönder - DETAYLI LOGLAMA
      console.log('[handleAnalyze] API çağrısı başlatılıyor...', {
        pdfTextLength: fullText.length,
        targetLang,
        userSelectedCountry: selectedCountryForAnalysis && selectedCountryForAnalysis !== 'AUTO' ? selectedCountryForAnalysis : userSelectedCountry,
        timestamp: new Date().toISOString()
      });

      console.log('[handleAnalyze] FETCH ÖNCESİ - Request body hazırlanıyor...');
      const requestBody = {
        pdfText: fullText,
        targetLang: targetLang,
        userSelectedCountry: selectedCountryForAnalysis && selectedCountryForAnalysis !== 'AUTO' ? selectedCountryForAnalysis : userSelectedCountry,
        userId: userId, // UUID from auth.users
        userEmail: user?.email || null, // Email for notifications
        fileName: file?.name || 'document.pdf'
      };
      console.log('[handleAnalyze] FETCH ÖNCESİ - Request body:', {
        pdfTextLength: requestBody.pdfText.length,
        targetLang: requestBody.targetLang,
        userSelectedCountry: requestBody.userSelectedCountry,
        userId: requestBody.userId,
        userEmail: requestBody.userEmail,
        fileName: requestBody.fileName
      });

      let res: Response;
      console.log('[handleAnalyze] FETCH ÇAĞRISI BAŞLIYOR...');
      
      // Absolute URL kullan (development ve production için)
      const apiUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/api/analyze`
        : '/api/analyze';
      
      console.log('[handleAnalyze] API URL:', apiUrl);
      console.log('[handleAnalyze] Request Method: POST');
      console.log('[handleAnalyze] Request Body Length:', JSON.stringify(requestBody).length);
      
      try {
        res = await fetch(apiUrl, {
          method: 'POST', // Açıkça POST belirtildi
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream, application/json', // Streaming için
          },
          body: JSON.stringify(requestBody),
          cache: 'no-store', // Cache'i devre dışı bırak
        });
        
        console.log('[handleAnalyze] Fetch tamamlandı, Response:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          headers: Object.fromEntries(res.headers.entries())
        });
        console.log('[handleAnalyze] FETCH SONRASI - Response alındı:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          headers: Object.fromEntries(res.headers.entries()),
          timestamp: new Date().toISOString()
        });
      } catch (fetchError: any) {
        console.error('[handleAnalyze] FETCH HATASI DETAYLI:', {
          error: fetchError,
          message: fetchError?.message,
          stack: fetchError?.stack,
          name: fetchError?.name,
          apiUrl: apiUrl,
          timestamp: new Date().toISOString()
        });
        // Network hatası veya bağlantı hatası
        setResult(language === 'TR' 
          ? `Bağlantı hatası: ${fetchError?.message || 'API\'ye ulaşılamadı'}. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.` 
          : `Connection error: ${fetchError?.message || 'Could not reach API'}. Please check your internet connection and try again.`);
        setLoading(false);
        setIsAnalyzing(false);
        return; // Sayfa yenilenmesini engelle, sadece return et
      }

      console.log('[handleAnalyze] API yanıtı alındı:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        timestamp: new Date().toISOString()
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[handleAnalyze] API hata yanıtı DETAYLI:', {
          status: res.status,
          statusText: res.statusText,
          errorText: errorText.substring(0, 1000), // İlk 1000 karakter
          headers: Object.fromEntries(res.headers.entries()),
          url: apiUrl,
          timestamp: new Date().toISOString()
        });
        
        // Hata mesajını göster ama sayfa yenileme
        const errorMessage = language === 'TR' 
          ? `API hatası (${res.status}): ${res.statusText}. ${errorText.substring(0, 200)}` 
          : `API error (${res.status}): ${res.statusText}. ${errorText.substring(0, 200)}`;
        setResult(errorMessage);
        setLoading(false);
        setIsAnalyzing(false);
        return; // Sayfa yenilenmesini engelle, throw etme
      }

      // Compare mode gibi direkt JSON okuma
      console.log('[handleAnalyze] Compare mode gibi direkt JSON okuma başlatılıyor...');
      const data = await res.json();
      
      console.log('[handleAnalyze] JSON yanıtı alındı:', {
        hasReply: !!data.reply,
        hasAnalysis: !!data.analysis,
        replyLength: data.reply?.length || 0,
        analysisLength: data.analysis?.length || 0
      });
      
      // Compare mode gibi sonucu set et
      const resultText = data.reply || data.analysis || 'Analysis complete';
      console.log('[handleAnalyze] Backend yanıtı DETAYLI:', {
        hasReply: !!data.reply,
        hasAnalysis: !!data.analysis,
        replyLength: data.reply?.length || 0,
        analysisLength: data.analysis?.length || 0,
        replyPreview: data.reply?.substring(0, 200) || 'YOK',
        analysisPreview: data.analysis?.substring(0, 200) || 'YOK'
      });
      setResult(resultText);
      
      console.log('[handleAnalyze] Sonuç set edildi, uzunluk:', resultText.length, 'İlk 200 karakter:', resultText.substring(0, 200));
      
      // Analiz sayısını artır (compare mode'da yok ama burada var)
      // Admin için analysis_count artırma
      // userId zaten fonksiyonun başında tanımlı
      if (userId && !isAdmin) {
        try {
          const newCount = analysisCount + 1;
          setAnalysisCount(newCount);
          // Supabase'e kaydet (hata alsa bile devam et)
          try {
            await supabase
              .from('profiles')
              .update({ analysis_count: newCount })
              .eq('id', userId);
          } catch (updateError) {
            // Sessizce devam et
          }
        } catch (err) {
          // Sessizce devam et
        }
      }
      
      /* STREAMING KODU - KALDIRILDI (ReadableStream is already locked hatası nedeniyle)
       * Streaming kodu aşağıda yorum satırında, gerekirse tekrar açılabilir
       * Ancak şu an Compare mode gibi direkt JSON okuma kullanılıyor
       */
      
      // Hukuki kısaltmaları yerelleştir (İngilizce için) - Compare mode'da yok ama burada var
      const isEnglish = language === 'EN' || (testMode === false);
      if (isEnglish && resultText) {
        const localizedResult = localizeLegalAcronyms(resultText, true);
        // Eğer yerelleştirme sonucu değiştiyse, sonucu güncelle
        if (localizedResult !== resultText) {
          setResult(localizedResult);
        }
      }
      
      // Risk score'u metinden çıkar (fallback) - Compare mode'da yok ama burada var
      const extractedScore = extractRiskScore(resultText);
      if (extractedScore !== null) {
        setRiskScore(extractedScore);
      }
      
      // Analiz sayısını artır ve Supabase'e kaydet - Compare mode'da yok ama burada var
      // userId zaten yukarıda tanımlı (satır 1627)
      const analysisTitle = file.name.substring(0, 50) + (file.name.length > 50 ? '...' : '');
      const analysisSummary = resultText.substring(0, 200) + (resultText.length > 200 ? '...' : '');
      
      if (userId && !isAdmin) {
        try {
          // Analiz sayısını artır (hata alsa bile devam et)
          // Admin için analysis_count artırma
          let newCount = analysisCount + 1;
          
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('analysis_count')
              .eq('id', userId)
              .maybeSingle();
            
            if (profileError) {
              console.warn('[handleAnalyze] Profile fetch error (ignored):', profileError);
            }
            
            if (profile) {
              newCount = (profile.analysis_count || 0) + 1;
              
              try {
                await supabase
                  .from('profiles')
                  .update({ analysis_count: newCount })
                  .eq('id', userId);
              } catch (updateError) {
                // Sessizce devam et - profiles tablosu yoksa veya hata varsa
              }
            }
          } catch (profileError) {
            // Sessizce devam et - profiles tablosu yoksa veya hata varsa
          }
          
          // Admin için analysis_count artırma
          if (!isAdmin) {
            setAnalysisCount(newCount);
          }
          
          // Enterprise, Professional, quantum_global ve Admin kullanıcıları için analizi Supabase'e kaydet
          if (effectivePackage === 'enterprise' || effectivePackage === 'professional' || effectivePackage === 'quantum_global' || isAdmin) {
            const finalRiskScore = riskScore || null;
            
            const { data: newAnalysis, error: analysisError } = await supabase
              .from('analyses')
              .insert({
                user_id: userId,
                file_name: file.name,
                analysis_result: resultText,
                analysis_summary: analysisSummary,
                risk_score: finalRiskScore
              })
              .select()
              .single();
            
            if (!analysisError && newAnalysis) {
              // Geçmişi güncelle
              const { data: allAnalyses } = await supabase
                .from('analyses')
                .select('id, file_name, analysis_summary, created_at, analysis_result, risk_score')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(100);
              
              if (allAnalyses) {
                const history = allAnalyses.map(a => ({
                  id: a.id,
                  title: a.file_name,
                  date: new Date(a.created_at).toLocaleString(language === 'TR' ? 'tr-TR' : 'en-US'),
                  summary: a.analysis_summary || a.analysis_result.substring(0, 200) + '...',
                  fullResult: a.analysis_result,
                  riskScore: a.risk_score || null
                }));
                setAnalysisHistory(history);
              }
            }
          }
        } catch (err) {
          console.error('Save analysis error:', err);
          // Fallback: localStorage (Admin için değil)
          if (!isAdmin) {
            const newCount = analysisCount + 1;
            localStorage.setItem(`analysisCount_${userId}`, newCount.toString());
            setAnalysisCount(newCount);
          }
        }
      } else {
        // Giriş yapmamış kullanıcılar için localStorage
        const newCount = analysisCount + 1;
        localStorage.setItem('freeAnalysisCount', newCount.toString());
        setAnalysisCount(newCount);
      }
    } catch (err: any) {
      console.error("[handleAnalyze] GENEL ANALİZ HATASI DETAYLI:", {
        error: err,
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        timestamp: new Date().toISOString()
      });
      
      // Hata mesajını göster ama sayfa yenileme
      const errorMessage = err?.message || (language === 'TR' ? 'Analiz sırasında bir hata oluştu.' : 'An error occurred during analysis.');
      setResult(errorMessage);
      
      // Loading state'lerini temizle
      setLoading(false);
      setIsAnalyzing(false);
      setAnalysisStatus('');
      
      // Sayfa yenilenmesini engelle - return ile çık
      return;
    } finally {
      console.log('[handleAnalyze] Finally bloğu çalışıyor, state temizleniyor');
      setLoading(false);
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  }; // handleAnalyze fonksiyonu kapanışı

  const handleDownloadPDF = async () => {
    // AnalysisResult div'ini hedefle (id="analysis-report")
    const analysisResultDiv = document.querySelector('#analysis-report') as HTMLElement;
    if (!analysisResultDiv) {
      console.error('PDF: AnalysisResult div bulunamadı');
      return;
    }
    
    try {
      // PDF butonunu gizle
      const pdfButtons = analysisResultDiv.querySelectorAll('.pdf-download-button');
      pdfButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = 'none';
      });

      // Geçici olarak renkleri siyah yap ve page-break ekle
      const originalStyles: { element: HTMLElement; color: string; backgroundColor: string; pageBreakInside: string }[] = [];
      const allElements = analysisResultDiv.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computedStyle = window.getComputedStyle(htmlEl);
        originalStyles.push({
          element: htmlEl,
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor,
          pageBreakInside: computedStyle.pageBreakInside || 'auto'
        });
        // Tüm renkleri siyaha çevir (gold dahil)
        htmlEl.style.color = '#000000';
        htmlEl.style.backgroundColor = htmlEl.tagName === 'BODY' || htmlEl.tagName === 'HTML' ? '#ffffff' : (computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || computedStyle.backgroundColor === 'transparent' ? '#ffffff' : '#ffffff');
        // Page break ayarları
        if (['SECTION', 'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(htmlEl.tagName)) {
          htmlEl.style.pageBreakInside = 'avoid';
          htmlEl.style.breakInside = 'avoid';
        }
      });
      
      // Başlıklar ve paragraflar için özel ayarlar
      const headings = analysisResultDiv.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div');
      headings.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.color = '#000000';
        htmlEl.style.pageBreakInside = 'avoid';
        htmlEl.style.breakInside = 'avoid';
        htmlEl.style.pageBreakAfter = 'auto';
        htmlEl.style.breakAfter = 'auto';
      });
      
      // Başlık ve arka plan rengini de düzelt
      const titleEl = analysisResultDiv.querySelector('h3');
      if (titleEl) {
        (titleEl as HTMLElement).style.color = '#000000';
      }
      analysisResultDiv.style.backgroundColor = '#ffffff';
      analysisResultDiv.style.color = '#000000';
      analysisResultDiv.style.pageBreakInside = 'avoid';

      // html2canvas ile AnalysisResult div'ini yakala, scale: 2 ile net çıktı
      const canvas = await html2canvas(analysisResultDiv, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: true,
        useCORS: true,
        allowTaint: false,
        removeContainer: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      
      // Logo ekle - Antetli kağıt düzeni
      try {
        const logoResponse = await fetch('/vq.png', {
          headers: {
            'Accept': 'image/png, image/*, */*'
          }
        });
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });
          // Logo: Sol üst köşe, antetli kağıt düzeni
          pdf.addImage(logoDataUrl, 'PNG', 10, 8, 35, 12);
          // Logo altına ince bir çizgi
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.5);
          pdf.line(10, 22, 200, 22);
        }
      } catch (logoError) {
        console.warn('PDF: Logo yüklenemedi:', logoError);
      }
      
      const imgWidth = 190;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 28; // Logo ve çizgi için boşluk
      
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - position);
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save('veritas-report.pdf');
      
      // Orijinal stilleri geri yükle
      originalStyles.forEach(({ element, color, backgroundColor, pageBreakInside }) => {
        element.style.color = color;
        element.style.backgroundColor = backgroundColor;
        element.style.pageBreakInside = pageBreakInside;
        element.style.breakInside = pageBreakInside;
      });
      
      // PDF butonunu tekrar göster
      pdfButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = '';
      });
      
      if (titleEl) {
        (titleEl as HTMLElement).style.color = gold;
      }
      analysisResultDiv.style.backgroundColor = '#1a1f2e';
      analysisResultDiv.style.color = lightText;
    } catch (err) {
      console.error('PDF download error:', err);
    }
  };

  const handleDownloadWord = () => {
    if (!reportRef.current) return;
    try {
      // Tüm analizi al (özet + detaylı)
      const { summary, detailed } = parseAnalysisResult(result);
      const fullContent = `${summary}\n\n--- ${language === 'TR' ? 'Ayrıntılı Analiz' : 'Detailed Analysis'} ---\n\n${detailed}`;
      
      const title = reportRef.current.querySelector('h3')?.textContent || ui[language].resultTitle;
      const content = fullContent || result;
      const date = new Date().toLocaleDateString('tr-TR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // HTML içeriği oluştur
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Veritas Q-AI - Analiz Raporu</title>
          <style>
            body {
              font-family: 'Times New Roman', Arial, sans-serif;
              color: #000000;
              background: #ffffff;
              padding: 40px;
              line-height: 1.6;
            }
            h1 {
              color: #000000;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            h3 {
              color: #000000;
              font-size: 18px;
              font-weight: bold;
              margin-top: 20px;
              margin-bottom: 10px;
            }
            .header {
              border-bottom: 2px solid #000000;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .date {
              color: #666666;
              font-size: 12px;
              margin-top: 5px;
            }
            .content {
              white-space: pre-wrap;
              color: #000000;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Veritas Q-AI - Analiz Raporu</h1>
            <div class="date">Tarih: ${date}</div>
          </div>
          <h3>${title}</h3>
          <div class="content">${content.replace(/\n/g, '<br>')}</div>
        </body>
        </html>
      `;

      // Blob oluştur ve indir
      const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'veritas-report.doc';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Word download error:', err);
    }
  };

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  // Feedback Hub event listener
  useEffect(() => {
    const handleOpenFeedbackHub = () => {
      setShowFeedbackHub(true);
    };

    window.addEventListener('openFeedbackHub', handleOpenFeedbackHub);
    return () => {
      window.removeEventListener('openFeedbackHub', handleOpenFeedbackHub);
    };
  }, []);

  const handleFeedbackSubmit = async (title: string, description: string, screenshot: File | null) => {
    try {
      // Dosya varsa base64'e çevir (boyut kontrolü ve küçültme ile)
      let screenshotBase64: string | null = null;
      if (screenshot) {
        // Dosya boyutu kontrolü (4.5MB limit - Vercel payload limiti)
        const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB
        const fileSizeMB = (screenshot.size / (1024 * 1024)).toFixed(2);
        
        if (screenshot.size > MAX_FILE_SIZE) {
          try {
            // Görseli küçült
            const compressedImage = await new Promise<string>((resolve, reject) => {
              const img = new Image();
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                reject(new Error('Canvas context alınamadı'));
                return;
              }
              
              img.onload = () => {
                // Görseli küçült (quality: 0.5)
                let quality = 0.5;
                let targetWidth = img.width;
                let targetHeight = img.height;
                
                // Eğer hala çok büyükse, boyutu da küçült
                if (screenshot.size > MAX_FILE_SIZE * 2) {
                  targetWidth = Math.floor(img.width * 0.7);
                  targetHeight = Math.floor(img.height * 0.7);
                  quality = 0.4;
                }
                
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                
                // JPEG formatında küçültülmüş görseli al
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
              };
              
              img.onerror = reject;
              img.src = URL.createObjectURL(screenshot);
            });
            
            screenshotBase64 = compressedImage;
            
            // Kullanıcıya bilgi ver
            const newSizeMB = ((screenshotBase64.length * 3/4) / (1024 * 1024)).toFixed(2);
            if (language === 'TR') {
              showToastNotification(`Görsel ${fileSizeMB}MB'dan ${newSizeMB}MB'a küçültüldü.`);
            } else {
              showToastNotification(`Image compressed from ${fileSizeMB}MB to ${newSizeMB}MB.`);
            }
          } catch (compressError) {
            // Küçültme başarısız olursa, kullanıcıya uyarı ver ve orijinal görseli göndermeyi dene
            console.error('Görsel küçültme hatası:', compressError);
            if (language === 'TR') {
              alert(`Görsel küçültülemedi (${fileSizeMB}MB). Lütfen daha küçük bir görsel seçin veya görsel olmadan gönderin.`);
            } else {
              alert(`Image compression failed (${fileSizeMB}MB). Please select a smaller image or send without image.`);
            }
            return; // İşlemi durdur
          }
        } else {
          // Normal boyutta, direkt base64'e çevir
          const reader = new FileReader();
          screenshotBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(screenshot);
          });
        }
      }

      // JSON verisi hazırla
      const requestBody = {
        type: title,
        title: title,
        description: description,
        email: user?.email || 'Anonim',
        file: screenshotBase64
      };

      // API'ye JSON olarak gönder
      const response = await fetch('/api/report-bug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit bug report');
      }

      // Başarılı gönderim sonrası toast göster
      showToastNotification(language === 'TR' 
        ? 'Raporunuz Kuantum Hattı Üzerinden İletildi ⚛️' 
        : 'Your report has been sent via Quantum Channel ⚛️');
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      // Hata mesajını kullanıcıya göster
      alert(error.message || (language === 'TR' 
        ? 'Hata bildirimi gönderilirken bir sorun oluştu.' 
        : 'An error occurred while submitting the bug report.'));
      throw error;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: darkBlue, color: lightText, fontFamily: 'sans-serif' }}>
      <BetaBanner 
        language={language}
        onReportClick={() => setShowFeedbackModal(true)}
      />
      <Header
        gold={gold}
        darkBlue={darkBlue}
        lightText={lightText}
        language={language}
        setLanguage={setLanguage}
        languageMenuOpen={languageMenuOpen}
        setLanguageMenuOpen={setLanguageMenuOpen}
        user={user}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        isAdmin={isAdmin}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        setActiveTab={setActiveTab}
        setFile={setFile}
        setResult={setResult}
        setLoading={setLoading}
        supabase={supabase}
        setUser={setUser}
        canAccessHistory={canAccessHistory}
        getAvatarInitials={getAvatarInitials}
      />

      <div style={{ display: 'flex', paddingTop: '0' }}>
        <QuantumSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          gold={gold}
          language={language}
          user={user}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setFile={setFile}
          setResult={setResult}
          handleAuth={handleAuth}
          canAccessHistory={canAccessHistory}
          ui={ui}
          isAdmin={isAdmin}
          userCredits={userCredits}
          contractCount={contractCount}
          setContractCount={setContractCount}
          roiCurrency={roiCurrency}
          setRoiCurrency={setRoiCurrency}
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', width: '100%' }}>
          {!user ? (
            /* LANDING PAGE - Giriş Yapılmamışsa */
            <div style={{ textAlign: 'center', width: '100%', maxWidth: '1200px', marginTop: '40px' }}>
              {/* Header: Logo, İsim ve Slogan */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '20px',
                marginBottom: '50px', 
                marginTop: '-50px' 
              }}>
                <img 
                  src="/vq.png" 
                  alt="Veritas Q-AI Logo" 
                  style={{ 
                    width: '180px', 
                    height: '180px',
                    objectFit: 'contain',
                    maxWidth: '90%'
                  }}
                />
                <h1 style={{ 
                  color: gold, 
                  fontSize: '3rem', 
                  fontWeight: 'bold',
                  margin: 0,
                  lineHeight: '1.2'
                }}>
                  {ui[language].title}
                </h1>
                <p style={{ 
                  color: gold, 
                  fontSize: '1.25rem', 
                  margin: 0,
                  fontWeight: '500',
                  opacity: 0.9
                }}>
                  {ui[language].sub}
                </p>
              </div>

              {/* Hero Image: Mockup */}
              <div style={{ 
                margin: '50px auto', 
                maxWidth: '900px', 
                width: '100%',
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(199, 176, 121, 0.1) 0%, rgba(199, 176, 121, 0.05) 100%)',
                borderRadius: '20px',
                border: `2px solid ${gold}33`,
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}>
                <img 
                  src="/mockup.png" 
                  alt="Veritas Q-AI Mockup" 
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    borderRadius: '15px',
                    display: 'block',
                    maxWidth: '100%'
                  }} 
                />
              </div>

              {/* CTA: Google Giriş Butonu */}
              <div style={{ marginTop: '50px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <button 
                  onClick={handleAuth} 
                  style={{ 
                    backgroundColor: '#ffffff !important', 
                    color: '#000000 !important', 
                    borderRadius: '50px', 
                    padding: '15px 40px', 
                    width: 'fit-content',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    margin: '20px auto',
                    fontWeight: 'bold', 
                    border: 'none', 
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                    transition: 'background-color 0.3s ease',
                    fontSize: '16px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <img 
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                    alt="Google Logo" 
                    width="24" 
                    height="24"
                    style={{ display: 'block' }}
                  /> 
                  <span style={{ color: '#000000 !important', fontWeight: 'bold' }}>{ui[language].googleBtn}</span>
              </button>
              </div>

              {/* Quantum-Driven Legal Intelligence Bölümü - Her zaman görünür */}
              <div style={{ marginTop: '80px', maxWidth: '1200px', textAlign: 'left', width: '100%' }}>
                {/* Quantum-Driven Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h2 style={{ color: gold, fontSize: '2.5rem', marginBottom: '15px', fontWeight: 'bold' }}>
                    {language === 'TR' ? 'Kuantum Tabanlı Hukuk Zekası: Veritas Q-AI' : 'Quantum-Driven Legal Intelligence: Veritas Q-AI'}
                  </h2>
                  <p style={{ 
                    color: lightText, 
                    fontSize: '1.2rem', 
                    lineHeight: '1.8', 
                    marginBottom: '30px',
                    maxWidth: '900px',
                    margin: '0 auto 30px auto',
                    opacity: 0.9
                  }}>
                    {language === 'TR' 
                      ? <>Veritas Q-AI sadece bir araç değil; küresel bir hukuk ekosistemidir. <span style={{ fontWeight: 'bold', color: gold }}>Kuantum Simülasyon Motoru</span> ile desteklenen sistem, karmaşık belgeleri birden fazla yargı alanında aynı anda analiz eder ve klasik AI'ın ulaşamadığı hassasiyeti sunar.</>
                      : <>Veritas Q-AI is not just a tool; it is a global legal ecosystem. Powered by a <span style={{ fontWeight: 'bold', color: gold }}>Quantum Simulation Engine</span>, it analyzes complex documents across multiple jurisdictions simultaneously, delivering precision that classical AI cannot reach.</>}
                  </p>
                </div>

                {/* Global Jurisdictional Visualization */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '40px',
                  marginBottom: '40px',
                  padding: '40px',
                  background: `linear-gradient(135deg, ${darkBlue}ee, ${midBlue}dd)`,
                  borderRadius: '20px',
                  border: `2px solid ${gold}44`,
                  position: 'relative',
                  overflow: 'hidden',
                  flexWrap: 'wrap'
                }}>
                  {/* Quantum Data Flow Lines */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }}
                  >
                    {/* Connecting lines between flags */}
                    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                      <motion.line
                        x1="20%"
                        y1="50%"
                        x2="40%"
                        y2="50%"
                        stroke={gold}
                        strokeWidth="2"
                        strokeOpacity={0.4}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.line
                        x1="40%"
                        y1="50%"
                        x2="60%"
                        y2="50%"
                        stroke={gold}
                        strokeWidth="2"
                        strokeOpacity={0.4}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      />
                      <motion.line
                        x1="60%"
                        y1="50%"
                        x2="80%"
                        y2="50%"
                        stroke={gold}
                        strokeWidth="2"
                        strokeOpacity={0.4}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      />
                    </svg>
                  </motion.div>

                  {/* Country Flags with Glow Effect */}
                  {[
                    { code: 'TR', name: language === 'TR' ? 'Türkiye' : 'Turkey', emoji: '🇹🇷' },
                    { code: 'US', name: language === 'TR' ? 'ABD' : 'United States', emoji: '🇺🇸' },
                    { code: 'UK', name: language === 'TR' ? 'İngiltere' : 'United Kingdom', emoji: '🇬🇧' },
                    { code: 'DE', name: language === 'TR' ? 'Almanya' : 'Germany', emoji: '🇩🇪' }
                  ].map((country, idx) => (
                    <motion.div
                      key={country.code}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        scale: [1, 1.1, 1],
                        y: 0
                      }}
                      transition={{ 
                        delay: idx * 0.2,
                        duration: 2,
                        repeat: Infinity,
                        repeatType: 'reverse'
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        position: 'relative',
                        zIndex: 1,
                        minWidth: '120px'
                      }}
                    >
                      <div style={{
                        fontSize: '64px',
                        filter: 'drop-shadow(0 0 10px rgba(199, 176, 121, 0.6))'
                      }}>
                        {country.emoji}
                      </div>
                      <span style={{
                        color: gold,
                        fontSize: '14px',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}>
                        {country.name}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Main Description */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{
                  marginBottom: '40px',
                  padding: '30px',
                  background: midBlue,
                  borderRadius: '15px',
                  border: `1px solid ${gold}33`
                  }}
                >
                  <p style={{ 
                    color: lightText, 
                    fontSize: '1.1rem', 
                    lineHeight: '1.8', 
                    marginBottom: '20px',
                    whiteSpace: 'pre-line'
                  }}>
                    {language === 'TR' 
                      ? 'Veritas Q-AI, Kuantum Dolanıklık Mantığını kullanarak belgelerinizi Türkiye, ABD, İngiltere ve Almanya\'dan milyonlarca canlı veri noktasıyla gerçek zamanlı olarak çapraz referanslandırır.'
                      : 'Veritas Q-AI utilizes Quantum Entanglement Logic to cross-reference your documents with millions of live data points from Turkey, USA, UK, and Germany in real-time.'}
                  </p>
                  <p style={{ 
                    color: lightText, 
                    fontSize: '1.1rem', 
                    lineHeight: '1.8', 
                    marginBottom: '0',
                    whiteSpace: 'pre-line',
                    fontWeight: '500'
                  }}>
                    {language === 'TR' 
                      ? 'Çok Yargı Alanlı Süperpozisyon\'da hukuki olasılıkları simüle ederek, gizli çatışmaları ve riskleri bunlar yükümlülük haline gelmeden önce tespit ederiz.'
                      : 'By simulating legal probabilities in a Multi-Jurisdictional Superposition, we detect hidden conflicts and risks before they become liabilities.'}
                  </p>
                </motion.div>

                {/* Quantum Features List */}
                <div style={{
                  marginTop: '40px',
                  padding: '30px',
                  background: darkBlue,
                  borderRadius: '15px',
                  border: `1px solid ${gold}44`
                }}>
                  <h3 style={{
                    color: gold,
                    fontSize: '1.5rem',
                    marginBottom: '25px',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {language === 'TR' ? '⚛️ Kuantum Özellikler' : '⚛️ Quantum Features'}
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px'
                  }}>
                    {[
                      {
                        icon: '📊',
                        title: language === 'TR' ? 'Kuantum Olasılık Haritalama' : 'Quantum Probability Mapping',
                        desc: language === 'TR' 
                          ? 'Binlerce potansiyel hukuki sonuca dayalı kesin risk skorlama.'
                          : 'Precise risk scoring based on thousands of potential legal outcomes.'
                      },
                      {
                        icon: '🌍',
                        title: language === 'TR' ? 'Küresel Yargı Erişimi' : 'Global Jurisdictional Reach',
                        desc: language === 'TR'
                          ? 'TR, ABD (Federal & Eyalet), İngiltere (XML Tabanlı) ve DE (BGB/HGB) entegre canlı veri akışları.'
                          : 'Integrated live data streams from TR, US (Federal & State), UK (XML-Based), and DE (BGB/HGB).'
                      },
                      {
                        icon: '🔗',
                        title: language === 'TR' ? 'Dolanıklık Analizi' : 'Entanglement Analysis',
                        desc: language === 'TR'
                          ? 'Sözleşmeniz ile yüksek mahkeme içtihatları arasındaki görünmez bağlantıları keşfetme.'
                          : 'Discovering invisible links between your contract and high court precedents.'
                      },
                      {
                        icon: '🌐',
                        title: language === 'TR' ? 'Çapraz Sınır Uyumluluğu' : 'Cross-Border Compliance',
                        desc: language === 'TR'
                          ? '4 büyük hukuk sistemi genelinde uluslararası anlaşmalar için otomatik hukuki kontroller.'
                          : 'Automated legal checks for international agreements across 4 major legal systems.'
                      }
                    ].map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        style={{
                          padding: '20px',
                          background: midBlue,
                          borderRadius: '12px',
                          border: `1px solid ${gold}33`,
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = gold;
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.boxShadow = `0 8px 24px ${gold}33`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = gold + '33';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{
                          fontSize: '32px',
                          marginBottom: '12px',
                          filter: 'drop-shadow(0 0 8px rgba(199, 176, 121, 0.5))'
                        }}>
                          {feature.icon}
                        </div>
                        <h4 style={{
                          color: gold,
                          fontSize: '1.1rem',
                          marginBottom: '10px',
                          fontWeight: 'bold'
                        }}>
                          {feature.title}
                        </h4>
                        <p style={{
                          color: lightText,
                          fontSize: '0.95rem',
                          lineHeight: '1.6',
                          opacity: 0.9
                        }}>
                          {feature.desc}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Paketler Bölümü - Her zaman görünür */}
              <div id="pricing" style={{ marginTop: '80px', width: '100%' }}>
                <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '40px', marginTop: '0', textAlign: 'center' }}>{ui[language].pricing.toUpperCase()}</h2>

                {/* ROI Calculator */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{
                    marginBottom: '50px',
                    padding: '30px',
                    background: `linear-gradient(135deg, ${darkBlue}ee, ${midBlue}dd)`,
                    borderRadius: '20px',
                    border: `2px solid ${gold}44`,
                    maxWidth: '800px',
                    margin: '0 auto 50px auto'
                  }}
                >
                  <h3 style={{
                    color: gold,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    marginBottom: '20px',
                    textAlign: 'center'
                  }}>
                    {language === 'TR' ? 'Kuantum ROI Hesaplayıcı' : 'Quantum ROI Calculator'}
                  </h3>
                  
                  {/* Currency Selector */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '25px'
                  }}>
                    <button
                      onClick={() => setRoiCurrency('TR')}
                      style={{
                        padding: '8px 20px',
                        background: roiCurrency === 'TR' ? gold : 'transparent',
                        color: roiCurrency === 'TR' ? '#000000' : gold,
                        border: `2px solid ${gold}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        if (roiCurrency !== 'TR') {
                          e.currentTarget.style.background = `${gold}33`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (roiCurrency !== 'TR') {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      TR (TL)
                    </button>
                    <button
                      onClick={() => setRoiCurrency('USD')}
                      style={{
                        padding: '8px 20px',
                        background: roiCurrency === 'USD' ? gold : 'transparent',
                        color: roiCurrency === 'USD' ? '#000000' : gold,
                        border: `2px solid ${gold}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        if (roiCurrency !== 'USD') {
                          e.currentTarget.style.background = `${gold}33`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (roiCurrency !== 'USD') {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      Global (USD)
                    </button>
                  </div>
                  
                  <div style={{ marginBottom: '25px' }}>
                    <label style={{
                      color: lightText,
                      fontSize: '1rem',
                      marginBottom: '10px',
                      display: 'block',
                      textAlign: 'center'
                    }}>
                      {language === 'TR' ? 'Kaç sözleşme analiz edeceksiniz?' : 'How many contracts will you analyze?'}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={contractCount}
                      onChange={(e) => setContractCount(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '5px',
                        background: midBlue,
                        outline: 'none',
                        marginTop: '15px',
                        accentColor: gold
                      }}
                    />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '10px',
                      color: lightText,
                      fontSize: '0.9rem',
                      opacity: 0.8
                    }}>
                      <span>1</span>
                      <span style={{ color: gold, fontWeight: 'bold', fontSize: '1.2rem' }}>{contractCount}</span>
                      <span>100</span>
                    </div>
                  </div>
                  <div style={{
                    padding: '20px',
                    background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
                    borderRadius: '15px',
                    border: `2px solid ${gold}44`,
                    textAlign: 'center'
                  }}>
                    {/* Calculations based on currency */}
                    {(() => {
                      const isTR = roiCurrency === 'TR';
                      const hourlyRate = isTR ? 2500 : 150;
                      const veritasRate = isTR ? 990 : 49;
                      const currencySymbol = isTR ? 'TL' : '$';
                      const traditionalCost = contractCount * 8 * hourlyRate;
                      const veritasCost = contractCount * veritasRate;
                      const savings = traditionalCost - veritasCost;
                      
                      return (
                        <>
                          <div style={{
                            color: lightText,
                            fontSize: '0.9rem',
                            marginBottom: '10px',
                            opacity: 0.9
                          }}>
                            {language === 'TR' ? 'Geleneksel Avukatlık Maliyeti' : 'Traditional Legal Cost'}
                          </div>
                          <div style={{
                            color: '#ff6b6b',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            marginBottom: '20px'
                          }}>
                            {currencySymbol} {traditionalCost.toLocaleString('tr-TR')}
                          </div>
                          <div style={{
                            color: lightText,
                            fontSize: '0.9rem',
                            marginBottom: '10px',
                            opacity: 0.9
                          }}>
                            {language === 'TR' ? 'Veritas Q-AI Maliyeti' : 'Veritas Q-AI Cost'}
                          </div>
                          <div style={{
                            color: '#4ade80',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            marginBottom: '20px'
                          }}>
                            {currencySymbol} {veritasCost.toLocaleString('tr-TR')}
                          </div>
                          <div style={{
                            height: '1px',
                            background: `linear-gradient(90deg, transparent, ${gold}66, transparent)`,
                            marginBottom: '20px'
                          }} />
                          <div style={{
                            color: lightText,
                            fontSize: '0.9rem',
                            marginBottom: '10px',
                            opacity: 0.9
                          }}>
                            {language === 'TR' ? 'Yıllık Tasarrufunuz' : 'Potential Annual Saving'}
                          </div>
                          <motion.div
                            animate={{
                              scale: [1, 1.1, 1],
                              filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'],
                              textShadow: [
                                `0 0 30px ${gold}88`,
                                `0 0 50px ${gold}cc, 0 0 80px ${gold}99`,
                                `0 0 30px ${gold}88`
                              ]
                            }}
                            transition={{
                              duration: 2.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            style={{
                              color: gold,
                              fontSize: '4rem',
                              fontWeight: '900',
                              textShadow: `0 0 30px ${gold}88, 0 0 60px ${gold}66`,
                              marginBottom: '15px',
                              lineHeight: '1.2',
                              letterSpacing: '2px'
                            }}
                          >
                            {currencySymbol} {savings.toLocaleString('tr-TR')}
                          </motion.div>
                          <div style={{
                            color: lightText,
                            fontSize: '0.8rem',
                            opacity: 0.7,
                            marginTop: '10px',
                            marginBottom: '20px'
                          }}>
                            {isTR
                              ? `(${contractCount} sözleşme × 8 saat × ${hourlyRate.toLocaleString('tr-TR')} TL) - (${contractCount} sözleşme × ${veritasRate.toLocaleString('tr-TR')} TL)`
                              : `(${contractCount} contracts × 8 hours × ${currencySymbol}${hourlyRate}) - (${contractCount} contracts × ${currencySymbol}${veritasRate})`
                            }
                          </div>
                          <div style={{
                            marginTop: '20px',
                            padding: '15px',
                            background: `${gold}11`,
                            borderRadius: '10px',
                            border: `1px solid ${gold}33`,
                            textAlign: 'center'
                          }}>
                            <p style={{
                              color: lightText,
                              fontSize: '0.85rem',
                              lineHeight: '1.6',
                              margin: 0,
                              opacity: 0.9
                            }}>
                              {language === 'TR'
                                ? 'Kuantum Cross-Risk analizi ile ülkeler arası hukuk çelişkilerini tespit ederek, uluslararası operasyonlarınızda %100 yasal güvenlik sağlayın.'
                                : 'Detect cross-jurisdictional legal conflicts with Quantum Cross-Risk analysis to ensure 100% legal security in your international operations.'}
                            </p>
                          </div>
                          {/* Get Started Button - Opens Modal */}
                          <button
                            onClick={() => {
                              // Determine best package based on savings
                              let recommendedPackage = packages.find(p => p.name === 'Single Quantum Scan');
                              if (savings > 50000 || (isTR && savings > 200000)) {
                                recommendedPackage = packages.find(p => p.name === 'Quantum Global');
                              } else if (savings > 20000 || (isTR && savings > 80000)) {
                                recommendedPackage = packages.find(p => p.name === 'Professional');
                              }
                              setRoiRecommendedPackage(recommendedPackage || packages[0]);
                              setShowROIModal(true);
                            }}
                            style={{
                              display: 'inline-block',
                              padding: '18px 50px',
                              background: `linear-gradient(135deg, ${gold}, #d4b877)`,
                              color: '#000000',
                              borderRadius: '15px',
                              fontWeight: '900',
                              fontSize: '1.2rem',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.3s',
                              boxShadow: `0 6px 30px ${gold}88`,
                              marginTop: '15px',
                              textTransform: 'uppercase',
                              letterSpacing: '1px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                              e.currentTarget.style.boxShadow = `0 8px 40px ${gold}aa`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0) scale(1)';
                              e.currentTarget.style.boxShadow = `0 6px 30px ${gold}88`;
                            }}
                          >
                            {language === 'TR' ? '✨ Hemen Tasarruf Et ✨' : '✨ Get Started ✨'}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </motion.div>

                {/* Quantum Packages */}
                <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'stretch', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
                  {packages.map((pkg) => (
                    <PricingCard 
                      key={pkg.name}
                      gold={gold}
                      plan={pkg.name}
                      priceTR={pkg.priceTR}
                      priceGlobal={pkg.priceGlobal}
                      features={language === 'TR' ? pkg.features : pkg.featuresGlobal}
                      featuresGlobal={pkg.featuresGlobal}
                      popular={pkg.isPopular}
                      fullName={language === 'TR' ? pkg.fullName : pkg.fullNameGlobal}
                      fullNameGlobal={pkg.fullNameGlobal}
                      description={language === 'TR' ? pkg.description : pkg.descriptionGlobal}
                      descriptionGlobal={pkg.descriptionGlobal}
                      buttonText={pkg.buttonText}
                      buttonTextGlobal={pkg.buttonTextGlobal}
                      shopierLink={pkg.shopierLink}
                      lemonSqueezyLink={pkg.lemonSqueezyLink}
                      language={language}
                      ui={ui}
                      testMode={testMode}
                    />
                  ))}
                </div>

                {/* Secure Payment Logos */}
                <div style={{
                  marginTop: '60px',
                  padding: '30px',
                  textAlign: 'center',
                  background: `linear-gradient(135deg, ${darkBlue}88, ${midBlue}66)`,
                  borderRadius: '15px',
                  border: `1px solid ${gold}33`,
                  maxWidth: '1200px',
                  margin: '60px auto 0 auto'
                }}>
                  <div style={{
                    color: lightText,
                    fontSize: '0.9rem',
                    marginBottom: '20px',
                    opacity: 0.9
                  }}>
                    {language === 'TR' ? 'Güvenli Ödeme' : 'Secure Payment'}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '30px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 20px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      border: `1px solid ${gold}33`
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>🔒</span>
                      <span style={{ color: lightText, fontSize: '0.9rem', fontWeight: 'bold' }}>Stripe</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 20px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      border: `1px solid ${gold}33`
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                      <span style={{ color: lightText, fontSize: '0.9rem', fontWeight: 'bold' }}>Shopier</span>
                    </div>
                  </div>
                  <div style={{
                    color: `${gold}aa`,
                    fontSize: '0.75rem',
                    marginTop: '15px',
                    opacity: 0.8
                  }}>
                    {language === 'TR' 
                      ? 'Tüm ödemeler SSL şifreleme ile korunmaktadır'
                      : 'All payments are protected with SSL encryption'
                    }
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* DASHBOARD - Giriş Yapılmışsa */
            <div style={{ width: '100%', maxWidth: '850px', textAlign: 'center' }}>
              
              {activeTab === 'analyze' && (
                <>
                  {/* PDF Yükleme Alanı */}
                  <div style={{ background: midBlue, padding: '50px', borderRadius: '25px', border: `2px dashed ${gold}44` }}>
                    <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '30px' }}>{ui[language].title}</h2>
                    
                    {/* Upload Mode Tabs */}
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      marginBottom: '30px',
                      justifyContent: 'center',
                      borderBottom: `2px solid ${gold}33`
                    }}>
                      <button
                        onClick={() => {
                          setUploadMode('single');
                          setFile2(null);
                        }}
                        style={{
                          padding: '12px 24px',
                          background: (uploadMode as any) === 'single' ? gold : 'transparent',
                          color: (uploadMode as any) === 'single' ? '#ffffff' : gold,
                          border: `2px solid ${gold}`,
                          borderRadius: '10px 10px 0 0',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '15px',
                          transition: 'all 0.3s',
                          borderBottom: (uploadMode as any) === 'single' ? `2px solid ${midBlue}` : 'none'
                        }}
                      >
                        {language === 'TR' ? 'Tek Belge Analizi' : language === 'EN' ? 'Single Document Analysis' : language === 'DE' ? 'Einzeldokument-Analyse' : language === 'FR' ? 'Analyse de document unique' : language === 'ES' ? 'Análisis de documento único' : language === 'IT' ? 'Analisi documento singolo' : 'Single Document'}
                      </button>
                      <button
                        onClick={() => {
                          // Paket kontrolü
                          if (!userPackage || userPackage === 'free') {
                            alert(language === 'TR' 
                              ? 'Dosya karşılaştırma özelliği Professional veya Global paket gerektirir. Lütfen paketinizi yükseltin.' 
                              : 'Document comparison requires Professional or Global package. Please upgrade your plan.');
                            setActiveTab('pricing');
                            return;
                          }
                          setUploadMode('compare');
                          setFile(null);
                        }}
                        style={{
                          padding: '12px 24px',
                          background: (uploadMode as any) === 'compare' ? gold : 'transparent',
                          color: (uploadMode as any) === 'compare' ? '#000000' : gold,
                          border: `2px solid ${gold}`,
                          borderRadius: '10px 10px 0 0',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '15px',
                          transition: 'all 0.3s',
                          borderBottom: (uploadMode as any) === 'compare' ? `2px solid ${midBlue}` : 'none',
                          opacity: (!userPackage || userPackage === 'free') ? 0.5 : 1,
                          position: 'relative'
                        }}
                        title={(!userPackage || userPackage === 'free') ? (language === 'TR' ? 'Professional veya Global paket gerekli' : 'Professional or Global package required') : ''}
                      >
                        {language === 'TR' ? 'İki Belgeyi Karşılaştır' : language === 'EN' ? 'Compare Two Documents' : language === 'DE' ? 'Zwei Dokumente vergleichen' : language === 'FR' ? 'Comparer deux documents' : language === 'ES' ? 'Comparar dos documentos' : language === 'IT' ? 'Confronta due documenti' : 'Compare Two Documents'}
                        {(!userPackage || userPackage === 'free') && <span style={{ marginLeft: '8px' }}>🔒</span>}
                      </button>
                    </div>

                    {/* Single Document Mode */}
                    {(uploadMode as any) === 'single' && (
                      <>
                        <input 
                          type="file" 
                          id="pdfInputFinal" 
                          accept=".pdf" 
                          style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden' }} 
                          onChange={(e) => setFile(e.target.files?.[0] || null)} 
                        />
                        <label
                          htmlFor="pdfInputFinal"
                          style={{ 
                            backgroundColor: '#ffffff',
                            background: '#ffffff',
                            color: '#000000', 
                            borderRadius: '50px', 
                            padding: '15px 40px', 
                            fontWeight: 'bold',
                            border: '2px solid #ffffff',
                            cursor: 'pointer',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 'fit-content',
                            margin: '0 auto 20px auto',
                            boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2)',
                            transition: 'all 0.3s ease',
                            fontSize: '16px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.setProperty('background-color', '#f5f5f5', 'important');
                            e.currentTarget.style.setProperty('background', '#f5f5f5', 'important');
                            e.currentTarget.style.setProperty('color', '#000000', 'important');
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 25px rgba(255, 255, 255, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.setProperty('background-color', '#ffffff', 'important');
                            e.currentTarget.style.setProperty('background', '#ffffff', 'important');
                            e.currentTarget.style.setProperty('color', '#000000', 'important');
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 255, 255, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2)';
                          }}
                        >
                          <span style={{ color: '#000000', fontWeight: 'bold' }}>
                            {language === 'TR' ? 'Dosya Seç' : language === 'EN' ? 'Choose File' : language === 'DE' ? 'Datei auswählen' : language === 'FR' ? 'Sélectionner un fichier' : ui[language].select || 'Select File'}
                          </span>
                        </label>
                        {file && <p style={{ marginTop: '20px', color: '#4ade80', fontWeight: 'bold', fontSize: '1rem' }}>● {file.name}</p>}
                      </>
                    )}

                    {/* Compare Mode */}
                    {(uploadMode as any) === 'compare' && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '30px',
                        marginTop: '20px'
                      }}>
                        {/* Document 1 */}
                        <div style={{
                          padding: '30px',
                          background: darkBlue,
                          borderRadius: '15px',
                          border: `2px dashed ${gold}66`
                        }}>
                          <h3 style={{ color: gold, fontSize: '1.2rem', marginBottom: '20px', textAlign: 'center' }}>
                            {language === 'TR' ? 'İlk Dosya' : 'Document 1'}
                          </h3>
                          <input 
                            type="file" 
                            id="pdfInputCompare1" 
                            accept=".pdf" 
                            style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden' }} 
                            onChange={(e) => setFile(e.target.files?.[0] || null)} 
                          />
                          <label
                            htmlFor="pdfInputCompare1"
                            style={{ 
                              width: '100%',
                              padding: '15px',
                              background: gold,
                              color: '#000000', 
                              borderRadius: '10px', 
                              fontWeight: 'bold',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              transition: 'all 0.3s',
                              display: 'block',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#d4c08a';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = gold;
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            {language === 'TR' ? 'Dosya Seç' : language === 'EN' ? 'Choose File' : language === 'DE' ? 'Datei auswählen' : language === 'FR' ? 'Sélectionner un fichier' : ui[language].select || 'Select File'}
                          </label>
                          {file && (
                            <p style={{ marginTop: '15px', color: '#4ade80', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center' }}>
                              ✓ {file.name}
                            </p>
                          )}
                        </div>

                        {/* Document 2 */}
                        <div style={{
                          padding: '30px',
                          background: darkBlue,
                          borderRadius: '15px',
                          border: `2px dashed ${gold}66`
                        }}>
                          <h3 style={{ color: gold, fontSize: '1.2rem', marginBottom: '20px', textAlign: 'center' }}>
                            {language === 'TR' ? 'İkinci Dosya' : 'Document 2'}
                          </h3>
                          <input 
                            type="file" 
                            id="pdfInputCompare2" 
                            accept=".pdf" 
                            style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden' }} 
                            onChange={(e) => setFile2(e.target.files?.[0] || null)} 
                          />
                          <label
                            htmlFor="pdfInputCompare2"
                            style={{ 
                              width: '100%',
                              padding: '15px',
                              background: gold,
                              color: '#000000', 
                              borderRadius: '10px', 
                              fontWeight: 'bold',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              transition: 'all 0.3s',
                              display: 'block',
                              textAlign: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#d4c08a';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = gold;
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            {language === 'TR' ? 'Dosya Seç' : language === 'EN' ? 'Choose File' : language === 'DE' ? 'Datei auswählen' : language === 'FR' ? 'Sélectionner un fichier' : ui[language].select || 'Select File'}
                          </label>
                          {file2 && (
                            <p style={{ marginTop: '15px', color: '#4ade80', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center' }}>
                              ✓ {file2.name}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Limit Uyarı Banner - %80 ve üzeri */}
                    {user && shouldShowLimitWarning() && (
                      <div style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, rgba(199, 176, 121, 0.2), rgba(212, 192, 138, 0.15))',
                        border: `1px solid ${gold}`,
                        borderRadius: '12px',
                        padding: '15px 20px',
                        marginTop: '20px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '15px',
                        boxShadow: `0 2px 8px rgba(199, 176, 121, 0.2)`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <span style={{ fontSize: '20px' }}>⚠️</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: gold, fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                              {language === 'TR' 
                                ? `Limitlerinizin %${Math.round(getUsagePercentage())}'ine ulaştınız.`
                                : `You've reached ${Math.round(getUsagePercentage())}% of your limits.`
                              }
                            </div>
                            <div style={{ color: lightText, fontSize: '13px', opacity: 0.9 }}>
                              {language === 'TR'
                                ? 'Kesintisiz analiz deneyimi için Professional pakete geçin.'
                                : 'Upgrade to Professional for uninterrupted analysis experience.'
                              }
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Link href="/#pricing" style={{ textDecoration: 'none' }}>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setLimitWarningDismissed(true);
                                // setActiveTab('pricing'); // YORUM SATIRINA ALINDI - Redirect yapmasın
                                // if (window.location.pathname !== '/') {
                                //   router.push('/#pricing'); // YORUM SATIRINA ALINDI
                                //   setTimeout(() => {
                                //     window.location.href = '/#pricing'; // YORUM SATIRINA ALINDI
                                //   }, 100);
                                // } else {
                                setTimeout(() => {
                                  const pricingElement = document.getElementById('pricing');
                                  if (pricingElement) {
                                    pricingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }
                                  // } else {
                                  //   window.location.href = '/#pricing'; // YORUM SATIRINA ALINDI
                                  // }
                                }, 200);
                                // }
                              }}
                            style={{
                              padding: '8px 16px',
                              background: '#c7b079',
                              backgroundColor: '#c7b079',
                              color: '#000000',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              fontSize: '13px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.setProperty('background-color', '#b8a269', 'important');
                              e.currentTarget.style.setProperty('background', '#b8a269', 'important');
                              e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.setProperty('background-color', '#c7b079', 'important');
                              e.currentTarget.style.setProperty('background', '#c7b079', 'important');
                              e.currentTarget.style.opacity = '1';
                            }}
                          >
                            <span style={{ color: '#000000', fontWeight: 'bold' }}>{language === 'TR' ? 'Paketi Yükselt' : 'Upgrade Plan'}</span>
                          </button>
                          </Link>
                          <button
                            onClick={() => setLimitWarningDismissed(true)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: lightText,
                              cursor: 'pointer',
                              fontSize: '18px',
                              padding: '4px 8px',
                              opacity: 0.7,
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                            title={language === 'TR' ? 'Kapat' : 'Close'}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Limit Doldu Uyarısı - %100 */}
                    {user && isLimitReached() && (
                      <div style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(220, 53, 69, 0.15))',
                        border: '1px solid #ff6b6b',
                        borderRadius: '12px',
                        padding: '15px 20px',
                        marginTop: '20px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{ fontSize: '20px' }}>🚫</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                            {language === 'TR'
                              ? 'Aylık analiz limitiniz doldu!'
                              : 'Monthly analysis limit reached!'
                            }
                          </div>
                          <div style={{ color: lightText, fontSize: '13px', opacity: 0.9 }}>
                            {language === 'TR'
                              ? 'Daha fazla analiz yapmak için paketinizi yükseltin.'
                              : 'Upgrade your plan to continue analyzing.'
                            }
                          </div>
                        </div>
                        <Link href="/#pricing" style={{ textDecoration: 'none' }}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              // setActiveTab('pricing'); // YORUM SATIRINA ALINDI - Redirect yapmasın
                              // if (window.location.pathname !== '/') {
                              //   router.push('/#pricing'); // YORUM SATIRINA ALINDI
                              //   setTimeout(() => {
                              //     window.location.href = '/#pricing'; // YORUM SATIRINA ALINDI
                              //   }, 100);
                              // } else {
                              setTimeout(() => {
                                const pricingElement = document.getElementById('pricing');
                                if (pricingElement) {
                                  pricingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                                // } else {
                                //   window.location.href = '/#pricing'; // YORUM SATIRINA ALINDI
                                // }
                              }, 200);
                              // }
                            }}
                            style={{
                              padding: '8px 16px',
                              background: '#c7b079',
                              backgroundColor: '#c7b079',
                              color: '#000000',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              fontSize: '13px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.setProperty('background-color', '#b8a269', 'important');
                              e.currentTarget.style.setProperty('background', '#b8a269', 'important');
                              e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.setProperty('background-color', '#c7b079', 'important');
                              e.currentTarget.style.setProperty('background', '#c7b079', 'important');
                              e.currentTarget.style.opacity = '1';
                            }}
                          >
                            <span style={{ color: '#000000', fontWeight: 'bold' }}>{language === 'TR' ? 'Paketi Yükselt' : 'Upgrade Plan'}</span>
                          </button>
                        </Link>
                      </div>
                    )}

                    {/* Ülke Seçim Butonları */}
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      marginTop: '20px',
                      marginBottom: '15px',
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: lightText, fontSize: '14px', fontWeight: '500' }}>
                        {language === 'TR' ? 'Yargı Alanı:' : 'Jurisdiction:'}
                      </span>
                      {['TR', 'US', 'UK', 'DE', 'AUTO'].map(country => {
                        const countryLabels: Record<string, string> = {
                          'TR': language === 'TR' ? '🇹🇷 Türkiye' : '🇹🇷 Turkey',
                          'US': language === 'TR' ? '🇺🇸 ABD' : '🇺🇸 United States',
                          'UK': language === 'TR' ? '🇬🇧 İngiltere' : '🇬🇧 United Kingdom',
                          'DE': language === 'TR' ? '🇩🇪 Almanya' : '🇩🇪 Germany',
                          'AUTO': language === 'TR' ? '🔍 Otomatik' : '🔍 Auto'
                        };
                        const isSelected = selectedCountryForAnalysis === country || 
                          (!selectedCountryForAnalysis && country === 'AUTO');
                        return (
                          <button
                            key={country}
                            onClick={() => setSelectedCountryForAnalysis(country as 'TR' | 'US' | 'UK' | 'DE' | 'AUTO')}
                            disabled={loading || isAnalyzing}
                            style={{
                              padding: '8px 16px',
                              background: isSelected ? gold : 'transparent',
                              color: isSelected ? '#ffffff' : lightText,
                              border: `2px solid ${isSelected ? gold : gold + '66'}`,
                              borderRadius: '8px',
                              cursor: (loading || isAnalyzing) ? 'not-allowed' : 'pointer',
                              fontWeight: isSelected ? 'bold' : 'normal',
                              fontSize: '13px',
                              opacity: (loading || isAnalyzing) ? 0.5 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!loading && !isAnalyzing && !isSelected) {
                                e.currentTarget.style.borderColor = gold;
                                e.currentTarget.style.opacity = '1';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!loading && !isAnalyzing && !isSelected) {
                                e.currentTarget.style.borderColor = gold + '66';
                                e.currentTarget.style.opacity = '1';
                              }
                            }}
                          >
                            {countryLabels[country]}
                          </button>
                        );
                      })}
                    </div>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAnalyze(e);
                      }}
                      disabled={
                        ((uploadMode as any) === 'single' && !file) || 
                        ((uploadMode as any) === 'compare' && (!file || !file2)) || 
                        loading || 
                        isAnalyzing || 
                        isLimitReached()
                      }
                      style={{ 
                        width: '100%', 
                        padding: '18px', 
                        backgroundColor: isLimitReached() ? '#666666' : '#3b82f6', // Mavi arka plan (bg-blue-600)
                        color: '#ffffff', // Beyaz metin
                        borderRadius: '12px', 
                        border: 'none', 
                        marginTop: '30px', 
                        fontWeight: '900',
                        fontSize: '16px',
                        cursor: (
                          ((uploadMode as any) === 'single' && file) || 
                          ((uploadMode as any) === 'compare' && file && file2)
                        ) && !loading && !isAnalyzing && !isLimitReached() ? 'pointer' : 'not-allowed',
                        opacity: (
                          ((uploadMode as any) === 'single' && file) || 
                          ((uploadMode as any) === 'compare' && file && file2)
                        ) && !loading && !isAnalyzing && !isLimitReached() ? 1 : 0.6,
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        zIndex: 50 // Diğer elementlerin üstünde olması için
                      }}
                      onMouseEnter={(e) => {
                        if (
                          (((uploadMode as any) === 'single' && file) || ((uploadMode as any) === 'compare' && file && file2)) && 
                          !loading && !isAnalyzing && !isLimitReached()
                        ) {
                          e.currentTarget.style.backgroundColor = '#2563eb'; // Hover: bg-blue-700
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.6)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (
                          (((uploadMode as any) === 'single' && file) || ((uploadMode as any) === 'compare' && file && file2)) && 
                          !loading && !isAnalyzing && !isLimitReached()
                        ) {
                          e.currentTarget.style.backgroundColor = '#3b82f6';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <span style={{ color: '#ffffff' }}>
                        {isAnalyzing 
                          ? (language === 'TR' ? '🔍 Analiz Ediliyor...' : '🔍 Analyzing...') 
                          : isLimitReached() 
                            ? (language === 'TR' ? 'Limit Doldu' : 'Limit Reached') 
                            : (uploadMode as any) === 'compare' 
                              ? (language === 'TR' ? 'Dosyaları Karşılaştır' : 'Compare Documents')
                              : ui[language].btn}
                      </span>
                    </button>
                    
                    {/* Quantum Simulation Engine */}
                    {loading && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          marginTop: '30px',
                          padding: '50px 30px',
                          background: `linear-gradient(135deg, ${darkBlue}ee, ${midBlue}dd)`,
                          border: `2px solid ${gold}44`,
                          borderRadius: '20px',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '400px'
                        }}
                      >
                        {/* Starfield Background */}
                        <motion.div
                          animate={{
                            backgroundPosition: ['0% 0%', '100% 100%'],
                          }}
                          transition={{
                            duration: 20,
                            repeat: Infinity,
                            repeatType: 'loop',
                            ease: 'linear'
                          }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: `radial-gradient(2px 2px at 20% 30%, ${gold}88, transparent),
                                            radial-gradient(2px 2px at 60% 70%, ${gold}66, transparent),
                                            radial-gradient(1px 1px at 50% 50%, ${gold}99, transparent),
                                            radial-gradient(1px 1px at 80% 10%, ${gold}77, transparent),
                                            radial-gradient(2px 2px at 90% 40%, ${gold}55, transparent),
                                            radial-gradient(1px 1px at 33% 60%, ${gold}88, transparent),
                                            radial-gradient(1px 1px at 15% 80%, ${gold}66, transparent)`,
                            backgroundSize: '200% 200%',
                            opacity: 0.4
                          }}
                        />
                        
                        {/* Quantum Orbital Rings Container */}
                        <div style={{
                          position: 'relative',
                          width: '240px',
                          height: '240px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '30px'
                        }}>
                          {/* Outer Ring */}
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: 'linear'
                            }}
                            style={{
                              position: 'absolute',
                              width: '220px',
                              height: '220px',
                              border: `3px solid transparent`,
                              borderTopColor: gold,
                              borderRightColor: gold,
                              borderRadius: '50%',
                              boxShadow: `0 0 30px ${gold}66, 0 0 60px ${gold}44, inset 0 0 30px ${gold}33`,
                              filter: 'blur(0.5px)'
                            }}
                          />
                          
                          {/* Second Outer Ring */}
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{
                              duration: 4,
                              repeat: Infinity,
                              ease: 'linear'
                            }}
                            style={{
                              position: 'absolute',
                              width: '200px',
                              height: '200px',
                              border: `2px solid transparent`,
                              borderBottomColor: gold,
                              borderLeftColor: gold,
                              borderRadius: '50%',
                              boxShadow: `0 0 25px ${gold}55, inset 0 0 25px ${gold}22`
                            }}
                          />
                          
                          {/* Middle Ring */}
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 2.5,
                              repeat: Infinity,
                              ease: 'linear'
                            }}
                            style={{
                              position: 'absolute',
                              width: '160px',
                              height: '160px',
                              border: `2px solid transparent`,
                              borderTopColor: gold,
                              borderBottomColor: gold,
                              borderRadius: '50%',
                              boxShadow: `0 0 20px ${gold}77, 0 0 40px ${gold}55, inset 0 0 20px ${gold}44`
                            }}
                          />
                          
                          {/* Inner Ring */}
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'linear'
                            }}
                            style={{
                              position: 'absolute',
                              width: '120px',
                              height: '120px',
                              border: `2px solid transparent`,
                              borderRightColor: gold,
                              borderLeftColor: gold,
                              borderRadius: '50%',
                              boxShadow: `0 0 15px ${gold}88, inset 0 0 15px ${gold}66`
                            }}
                          />
                          
                          {/* Center Core */}
                          <motion.div
                            animate={{
                              scale: [1, 1.15, 1],
                              boxShadow: [
                                `0 0 40px ${gold}, 0 0 80px ${gold}88`,
                                `0 0 60px ${gold}ff, 0 0 120px ${gold}cc`,
                                `0 0 40px ${gold}, 0 0 80px ${gold}88`
                              ]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut'
                            }}
                            style={{
                              position: 'absolute',
                              width: '70px',
                              height: '70px',
                              background: `radial-gradient(circle, ${gold}ff, ${gold}cc, ${gold}99)`,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 10
                            }}
                          >
                            <motion.div
                              animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.8, 1, 0.8]
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: 'easeInOut'
                              }}
                              style={{
                                width: '25px',
                                height: '25px',
                                background: gold,
                                borderRadius: '50%',
                                boxShadow: `0 0 20px ${gold}ff, 0 0 40px ${gold}cc`
                              }}
                            />
                          </motion.div>
                        </div>
                        
                        {/* Quantum Terms */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px',
                            justifyContent: 'center',
                            marginTop: '20px',
                            maxWidth: '500px'
                          }}
                        >
                          {language === 'TR' 
                            ? ['Qubit', 'Superposition', 'Entanglement', 'Interference', 'Decoherence'].map((term, i) => (
                                <motion.div
                                  key={term}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.3 + i * 0.1 }}
                                  whileHover={{ scale: 1.1 }}
                                  style={{
                                    padding: '8px 16px',
                                    background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
                                    border: `1px solid ${gold}55`,
                                    borderRadius: '20px',
                                    color: gold,
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    boxShadow: `0 0 10px ${gold}33`,
                                    cursor: 'default'
                                  }}
                                >
                                  {term}
                                </motion.div>
                              ))
                            : ['Qubit', 'Superposition', 'Entanglement', 'Interference', 'Decoherence'].map((term, i) => (
                                <motion.div
                                  key={term}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.3 + i * 0.1 }}
                                  whileHover={{ scale: 1.1 }}
                                  style={{
                                    padding: '8px 16px',
                                    background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
                                    border: `1px solid ${gold}55`,
                                    borderRadius: '20px',
                                    color: gold,
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    boxShadow: `0 0 10px ${gold}33`,
                                    cursor: 'default'
                                  }}
                                >
                                  {term}
                                </motion.div>
                              ))
                          }
                        </motion.div>
                        
                        {/* Loading Status Text */}
                        <motion.div
                          key={currentLoadingMessageIndex}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          style={{
                            marginTop: '30px',
                            color: gold,
                            fontSize: '18px',
                            fontWeight: '700',
                            textAlign: 'center',
                            zIndex: 10,
                            position: 'relative',
                            textShadow: `0 0 15px ${gold}88, 0 0 30px ${gold}66`
                          }}
                        >
                          {language === 'TR' 
                            ? ['Qubit Matrisleri Senkronize Ediliyor...', 'Kuantum Olasılık Algoritması Çalışıyor...', 'Dolanık Veri Setleri Analiz Ediliyor...'][currentLoadingMessageIndex]
                            : ['Synchronizing Qubit Matrices...', 'Quantum Probability Algorithm Running...', 'Analyzing Entangled Data Sets...'][currentLoadingMessageIndex]
                          }
                        </motion.div>
                      </motion.div>
                    )}
                    
                    {/* Analysis Status Indicator */}
                    {analysisStatus && (
                      <div style={{
                        marginTop: '15px',
                        padding: '12px 16px',
                        background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
                        border: `1px solid ${gold}44`,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        color: gold,
                        fontWeight: '500'
                      }}>
                        <span style={{ fontSize: '16px' }}>🔄</span>
                        <span>{analysisStatus}</span>
                      </div>
                    )}
                    {/* Jurisdiction Confirmation Modal */}
                    {jurisdictionConfirmation && jurisdictionConfirmation.show && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-black border border-[#c7b079] rounded-lg p-6 max-w-md w-full mx-4">
                          <h3 className="text-xl font-bold text-[#c7b079] mb-4">
                            {language === 'TR' ? 'Yargı Alanı Tespiti' : 'Jurisdiction Detection'}
                          </h3>
                          <p className="text-white mb-4">
                            {language === 'TR' 
                              ? `Bu belgenin ${jurisdictionConfirmation.detected_country === 'TR' ? 'Türkiye' : jurisdictionConfirmation.detected_country === 'DE' ? 'Almanya' : jurisdictionConfirmation.detected_country === 'UK' ? 'İngiltere' : 'ABD'} hukukuna ait olduğu tespit edildi.`
                              : `This document has been detected as ${jurisdictionConfirmation.detected_country === 'TR' ? 'Turkey' : jurisdictionConfirmation.detected_country === 'DE' ? 'Germany' : jurisdictionConfirmation.detected_country === 'UK' ? 'United Kingdom' : 'United States'} law.`}
                          </p>
                          {jurisdictionConfirmation.cross_border && jurisdictionConfirmation.secondary_countries && (
                            <p className="text-yellow-400 mb-4 text-sm">
                              ⚠️ {language === 'TR' ? 'Çapraz sınır tespit edildi: ' : 'Cross-border detected: '}
                              {jurisdictionConfirmation.secondary_countries.map(c => 
                                c === 'TR' ? 'Türkiye' : c === 'DE' ? 'Almanya' : c === 'UK' ? 'İngiltere' : 'ABD'
                              ).join(', ')}
                            </p>
                          )}
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                setJurisdictionConfirmation(null);
                                setUserSelectedCountry(jurisdictionConfirmation.detected_country);
                              }}
                              className="flex-1 bg-[#c7b079] text-black font-bold py-2 px-4 rounded hover:bg-[#b8a068] transition"
                            >
                              {language === 'TR' ? 'Onayla' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => {
                                setJurisdictionConfirmation({...jurisdictionConfirmation, show: false});
                              }}
                              className="flex-1 bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600 transition"
                            >
                              {language === 'TR' ? 'İptal' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {comparisonResult && (uploadMode as any) === 'compare' ? (
                      <ComparisonResult
                        result={result}
                        differences={comparisonResult.differences}
                        isCrossLanguage={comparisonResult.isCrossLanguage}
                        gold={gold}
                        darkBlue={darkBlue}
                        midBlue={midBlue}
                        lightText={lightText}
                        language={language}
                        file1Name={file?.name}
                        file2Name={file2?.name}
                      />
                    ) : result && (
                      <AnalysisResult
                        result={result}
                        gold={gold}
                        darkBlue={darkBlue}
                        midBlue={midBlue}
                        lightText={lightText}
                        language={language}
                        activeResultTab={activeResultTab}
                        setActiveResultTab={setActiveResultTab}
                        effectivePackage={effectivePackage}
                        isAdmin={isAdmin}
                        parseAnalysisResult={parseAnalysisResult}
                        extractRiskScore={extractRiskScore}
                        getRiskColor={getRiskColor}
                        getRiskLevel={getRiskLevel}
                        riskScore={riskScore}
                        legalCitations={legalCitations}
                        canViewDetailedAnalysis={canViewDetailedAnalysis}
                        canDownload={canDownload}
                        canAccessLegislationDetails={canAccessLegislationDetails}
                        handleDownloadPDF={handleDownloadPDF}
                        handleDownloadWord={handleDownloadWord}
                        setShowLimitModal={setShowLimitModal}
                        detectLegislationReferences={detectLegislationReferences}
                        fetchLegislationDetail={fetchLegislationDetail}
                        showLegislationModal={showLegislationModal}
                        setShowLegislationModal={setShowLegislationModal}
                        selectedLegislation={selectedLegislation}
                        chatMessages={chatMessages}
                        chatInput={chatInput}
                        setChatInput={setChatInput}
                        chatLoading={chatLoading}
                        handleChatSend={handleChatSend}
                        ui={ui}
                        globalConflicts={globalConflicts}
                        isGlobalPackage={isGlobalPackage}
                        legalReferences={legalReferences}
                        riskAssessments={riskAssessments}
                        isAdmin={isAdmin}
                      />
                    )}
                  </div>
                </>
              )}

              {activeTab === 'pricing' && (
                <div id="pricing" style={{ marginTop: '40px' }}>
                  <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '60px', marginTop: '0', textAlign: 'center' }}>{ui[language].pricing.toUpperCase()}</h2>
                  <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'stretch', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
                    {packages.map((pkg) => (
                      <PricingCard 
                        key={pkg.name}
                        gold={gold}
                        plan={pkg.name}
                        priceTR={pkg.priceTR}
                        priceGlobal={pkg.priceGlobal}
                        features={pkg.features}
                        featuresGlobal={pkg.featuresGlobal}
                        popular={pkg.isPopular}
                        fullName={pkg.fullName}
                        fullNameGlobal={pkg.fullNameGlobal}
                        description={pkg.description}
                        descriptionGlobal={pkg.descriptionGlobal}
                        buttonText={pkg.buttonText}
                        buttonTextGlobal={pkg.buttonTextGlobal}
                        shopierLink={pkg.shopierLink}
                        lemonSqueezyLink={pkg.lemonSqueezyLink}
                        language={language}
                        ui={ui}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'history' && canAccessHistory() && (
                <div style={{ marginTop: '40px', maxWidth: '900px', width: '100%' }}>
                  <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '30px', textAlign: 'center' }}>
                    {language === 'TR' ? 'Analiz Geçmişi' : 'Analysis History'}
                  </h2>
                  {analysisHistory.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px', 
                      background: midBlue, 
                      borderRadius: '15px',
                      color: lightText
                    }}>
                      <p>{language === 'TR' ? 'Henüz analiz geçmişi bulunmamaktadır.' : 'No analysis history found.'}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {analysisHistory.map((item) => (
                        <div 
                          key={item.id}
                          style={{ 
                            background: midBlue, 
                            padding: '20px', 
                            borderRadius: '12px',
                            border: `1px solid ${gold}44`,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = gold;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = `${gold}44`;
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                          onClick={() => {
                            // Geçmiş analizi yükle
                            setResult(item.fullResult);
                            setRiskScore(item.riskScore);
                            setPdfText(''); // PDF metni geçmişte saklanmıyor, chat için boş
                            setChatMessages([]); // Chat geçmişini temizle
                            setActiveTab('analyze');
                            setSidebarOpen(false);
                            // Sayfayı yukarı kaydır
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <h3 style={{ color: gold, margin: 0, fontSize: '1.2rem', flex: 1 }}>{item.title}</h3>
                            {item.riskScore !== null && (
                              <div style={{
                                padding: '6px 12px',
                                background: getRiskColor(item.riskScore) + '33',
                                borderRadius: '8px',
                                border: `1px solid ${getRiskColor(item.riskScore)}`,
                                color: getRiskColor(item.riskScore),
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                marginLeft: '15px'
                              }}>
                                {item.riskScore}/100
                              </div>
                            )}
                          </div>
                          <p style={{ color: lightText, fontSize: '0.9rem', marginBottom: '10px', opacity: 0.8 }}>{item.date}</p>
                          <p style={{ color: lightText, lineHeight: '1.6' }}>{item.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'about' && (
                <div style={{ marginTop: '40px', maxWidth: '1200px', textAlign: 'left', width: '100%' }}>
                  {/* Quantum-Driven Header */}
                  <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h2 style={{ color: gold, fontSize: '2.5rem', marginBottom: '15px', fontWeight: 'bold' }}>
                      {language === 'TR' ? 'Kuantum Tabanlı Hukuk Zekası: Veritas Q-AI' : 'Quantum-Driven Legal Intelligence: Veritas Q-AI'}
                    </h2>
                    <p style={{ 
                      color: lightText, 
                      fontSize: '1.2rem', 
                      lineHeight: '1.8', 
                      marginBottom: '30px',
                      maxWidth: '900px',
                      margin: '0 auto 30px auto',
                      opacity: 0.9
                    }}>
                      {language === 'TR' 
                        ? 'Veritas Q-AI sadece bir araç değil; küresel bir hukuk ekosistemidir. **Kuantum Simülasyon Motoru** ile desteklenen sistem, karmaşık belgeleri birden fazla yargı alanında aynı anda analiz eder ve klasik AI\'ın ulaşamadığı hassasiyeti sunar.'
                        : 'Veritas Q-AI is not just a tool; it is a global legal ecosystem. Powered by a **Quantum Simulation Engine**, it analyzes complex documents across multiple jurisdictions simultaneously, delivering precision that classical AI cannot reach.'}
                    </p>
                  </div>

                  {/* Global Jurisdictional Visualization */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '40px',
                    marginBottom: '40px',
                    padding: '40px',
                    background: `linear-gradient(135deg, ${darkBlue}ee, ${midBlue}dd)`,
                    borderRadius: '20px',
                    border: `2px solid ${gold}44`,
                    position: 'relative',
                    overflow: 'hidden',
                    flexWrap: 'wrap'
                  }}>
                    {/* Quantum Data Flow Lines */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none'
                      }}
                    >
                      {/* Connecting lines between flags */}
                      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                        <motion.line
                          x1="20%"
                          y1="50%"
                          x2="40%"
                          y2="50%"
                          stroke={gold}
                          strokeWidth="2"
                          strokeOpacity={0.4}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: [0, 1, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.line
                          x1="40%"
                          y1="50%"
                          x2="60%"
                          y2="50%"
                          stroke={gold}
                          strokeWidth="2"
                          strokeOpacity={0.4}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: [0, 1, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        />
                        <motion.line
                          x1="60%"
                          y1="50%"
                          x2="80%"
                          y2="50%"
                          stroke={gold}
                          strokeWidth="2"
                          strokeOpacity={0.4}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: [0, 1, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        />
                      </svg>
                    </motion.div>

                    {/* Country Flags with Glow Effect */}
                    {[
                      { code: 'TR', name: language === 'TR' ? 'Türkiye' : 'Turkey', emoji: '🇹🇷' },
                      { code: 'US', name: language === 'TR' ? 'ABD' : 'United States', emoji: '🇺🇸' },
                      { code: 'UK', name: language === 'TR' ? 'İngiltere' : 'United Kingdom', emoji: '🇬🇧' },
                      { code: 'DE', name: language === 'TR' ? 'Almanya' : 'Germany', emoji: '🇩🇪' }
                    ].map((country, idx) => (
                      <motion.div
                        key={country.code}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          scale: [1, 1.1, 1],
                          y: 0
                        }}
                        transition={{ 
                          delay: idx * 0.2,
                          duration: 2,
                          repeat: Infinity,
                          repeatType: 'reverse'
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '10px',
                          position: 'relative',
                          zIndex: 1,
                          minWidth: '120px'
                        }}
                      >
                        <div style={{
                          fontSize: '64px',
                          filter: 'drop-shadow(0 0 10px rgba(199, 176, 121, 0.6))'
                        }}>
                          {country.emoji}
                        </div>
                        <span style={{
                          color: gold,
                          fontSize: '14px',
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                          {country.name}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Main Description */}
                  <div style={{
                    marginBottom: '40px',
                    padding: '30px',
                    background: midBlue,
                    borderRadius: '15px',
                    border: `1px solid ${gold}33`
                  }}>
                    <p style={{ 
                      color: lightText, 
                      fontSize: '1.1rem', 
                      lineHeight: '1.8', 
                      marginBottom: '25px',
                      whiteSpace: 'pre-line'
                    }}>
                      {language === 'TR' 
                        ? 'Veritas Q-AI, Kuantum Dolanıklık Mantığını kullanarak belgelerinizi Türkiye, ABD, İngiltere ve Almanya\'dan milyonlarca canlı veri noktasıyla gerçek zamanlı olarak çapraz referanslandırır.\n\nÇok Yargı Alanlı Süperpozisyon\'da hukuki olasılıkları simüle ederek, gizli çatışmaları ve riskleri bunlar yükümlülük haline gelmeden önce tespit ederiz.'
                        : 'Veritas Q-AI utilizes Quantum Entanglement Logic to cross-reference your documents with millions of live data points from Turkey, USA, UK, and Germany in real-time.\n\nBy simulating legal probabilities in a Multi-Jurisdictional Superposition, we detect hidden conflicts and risks before they become liabilities.'}
                    </p>
                  </div>

                  {/* How It Works Section */}
                  <div style={{
                    marginTop: '50px',
                    marginBottom: '50px'
                  }}>
                    <h2 style={{
                      color: gold,
                      fontSize: '2rem',
                      marginBottom: '40px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      textShadow: `0 0 20px ${gold}44`
                    }}>
                      {language === 'TR' ? '⚛️ Nasıl Çalışır?' : '⚛️ How It Works'}
                    </h2>

                    {/* Steps */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '30px',
                      marginBottom: '50px'
                    }}>
                      {[
                        {
                          step: 1,
                          icon: '📥',
                          title: language === 'TR' ? 'Kuantum İngestion' : 'Quantum Ingestion',
                          description: language === 'TR' 
                            ? 'Dökümanınızı yüklediğiniz an, sistemimiz metni 4 ülkenin (TR, US, UK, DE) hukuk vektörlerine parçalar.'
                            : 'The moment you upload your document, our system fragments the text into legal vectors from 4 countries (TR, US, UK, DE).'
                        },
                        {
                          step: 2,
                          icon: '🔍',
                          title: language === 'TR' ? 'Çapraz Kontrol Analizi' : 'Cross-Check Analysis',
                          description: language === 'TR'
                            ? 'Seçtiğiniz pakete göre, dökümanınız binlerce emsal karar ve kanun maddesiyle eş zamanlı olarak çarpıştırılır.'
                            : 'Based on your selected package, your document is simultaneously cross-referenced with thousands of precedents and legal articles.'
                        },
                        {
                          step: 3,
                          icon: '🗺️',
                          title: language === 'TR' ? 'Risk Haritalama' : 'Risk Mapping',
                          description: language === 'TR'
                            ? 'Yapay zeka değil, Kuantum mantığıyla riskleriniz 1-10 arası skorlanır ve yasal referanslarıyla listelenir.'
                            : 'Not artificial intelligence, but Quantum logic: your risks are scored 1-10 and listed with their legal references.'
                        }
                      ].map((stepData, idx) => (
                        <motion.div
                          key={stepData.step}
                          initial={{ opacity: 0, x: -50 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, margin: "-100px" }}
                          transition={{ delay: idx * 0.2, duration: 0.6 }}
                          style={{
                            display: 'flex',
                            gap: '25px',
                            padding: '30px',
                            background: `linear-gradient(135deg, ${darkBlue}dd, ${midBlue}cc)`,
                            borderRadius: '15px',
                            border: `2px solid ${gold}44`,
                            alignItems: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Step Number Badge */}
                          <div style={{
                            minWidth: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${gold}ff, ${gold}cc)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: darkBlue,
                            boxShadow: `0 0 20px ${gold}66`,
                            position: 'relative',
                            zIndex: 2
                          }}>
                            {stepData.icon}
                          </div>
                          
                          {/* Content */}
                          <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '15px',
                              marginBottom: '10px'
                            }}>
                              <h3 style={{
                                color: gold,
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                margin: 0
                              }}>
                                {language === 'TR' ? `Adım ${stepData.step}:` : `Step ${stepData.step}:`} {stepData.title}
                              </h3>
                            </div>
                            <p style={{
                              color: lightText,
                              fontSize: '1.1rem',
                              lineHeight: '1.8',
                              margin: 0,
                              opacity: 0.9
                            }}>
                              {stepData.description}
                            </p>
                          </div>

                          {/* Background Glow Effect */}
                          <motion.div
                            animate={{
                              opacity: [0.1, 0.3, 0.1],
                              scale: [1, 1.05, 1]
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            style={{
                              position: 'absolute',
                              top: '-50%',
                              right: '-20%',
                              width: '200px',
                              height: '200px',
                              background: `radial-gradient(circle, ${gold}44, transparent)`,
                              borderRadius: '50%',
                              filter: 'blur(40px)',
                              zIndex: 1
                            }}
                          />
                        </motion.div>
                      ))}
                    </div>

                    {/* Why Quantum Section */}
                    <div style={{
                      marginTop: '50px',
                      padding: '40px',
                      background: `linear-gradient(135deg, ${gold}11, ${gold}05)`,
                      borderRadius: '20px',
                      border: `2px solid ${gold}44`,
                      textAlign: 'center'
                    }}>
                      <h3 style={{
                        color: gold,
                        fontSize: '1.8rem',
                        marginBottom: '20px',
                        fontWeight: 'bold'
                      }}>
                        {language === 'TR' ? '❓ Neden Kuantum?' : '❓ Why Quantum?'}
                      </h3>
                      <p style={{
                        color: lightText,
                        fontSize: '1.2rem',
                        lineHeight: '1.8',
                        maxWidth: '900px',
                        margin: '0 auto',
                        opacity: 0.95
                      }}>
                        {language === 'TR'
                          ? 'Geleneksel AI sadece metni okur; Veritas Kuantum Motoru, metnin farklı hukuk sistemlerindeki olasılıklarını simüle eder. Bu, %0 halüsinasyon ve %100 yasal referans demektir.'
                          : 'Traditional AI only reads text; Veritas Quantum Engine simulates the probabilities of text across different legal systems. This means 0% hallucination and 100% legal references.'}
                      </p>
                    </div>

                    {/* Feature Glossary */}
                    <div style={{
                      marginTop: '50px',
                      padding: '40px',
                      background: darkBlue,
                      borderRadius: '20px',
                      border: `2px solid ${gold}44`
                    }}>
                      <h3 style={{
                        color: gold,
                        fontSize: '1.8rem',
                        marginBottom: '30px',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}>
                        {language === 'TR' ? '📚 Paket Özellikleri Sözlüğü' : '📚 Feature Glossary'}
                      </h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '20px'
                      }}>
                        {[
                          {
                            term: language === 'TR' ? 'Çapraz Yargı Çelişkisi' : 'Cross-Jurisdictional Conflict',
                            definition: language === 'TR'
                              ? 'İki farklı ülke yasasının birbiriyle çeliştiği noktaların tespiti.'
                              : 'Detection of points where laws from two different countries conflict with each other.'
                          },
                          {
                            term: language === 'TR' ? 'Kuantum Karşılaştırma' : 'Quantum Comparison',
                            definition: language === 'TR'
                              ? 'Versiyonlar arası hukuki anlam kaymalarının milimetrik tespiti.'
                              : 'Millimeter-precise detection of legal meaning shifts between versions.'
                          },
                          {
                            term: language === 'TR' ? 'Emsal Karar Döngüsü' : 'Case-Law Roulette',
                            definition: language === 'TR'
                              ? 'Veritabanımızdaki canlı emsal karar döngüsü.'
                              : 'Live precedent case cycle from our database.'
                          },
                          {
                            term: language === 'TR' ? 'Kuantum Risk Haritalama' : 'Quantum Risk Mapping',
                            definition: language === 'TR'
                              ? 'Çok yargı alanlı risk analizi ve olasılık simülasyonu.'
                              : 'Multi-jurisdictional risk analysis and probability simulation.'
                          },
                          {
                            term: language === 'TR' ? 'Çapraz Dil Karşılaştırması' : 'Cross-Language Comparison',
                            definition: language === 'TR'
                              ? 'Farklı dillerdeki belgeleri karşılaştırarak çeviri doğruluğunu ve hukuki anlam kaymalarını tespit etme.'
                              : 'Comparing documents in different languages to detect translation accuracy and legal meaning shifts.'
                          },
                          {
                            term: language === 'TR' ? 'Canlı Veri Senkronizasyonu' : 'Live Data Synchronization',
                            definition: language === 'TR'
                              ? '4 büyük yargı alanından güncel yüksek mahkeme kararları ve yasal değişikliklerin otomatik taranması.'
                              : 'Automatic scanning of current supreme court rulings and legislative changes from 4 major jurisdictions.'
                          }
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: idx * 0.1 }}
                            style={{
                              padding: '20px',
                              background: midBlue,
                              borderRadius: '12px',
                              border: `1px solid ${gold}33`,
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = gold;
                              e.currentTarget.style.transform = 'translateY(-5px)';
                              e.currentTarget.style.boxShadow = `0 8px 20px ${gold}33`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = `${gold}33`;
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px'
                            }}>
                              <span style={{
                                fontSize: '1.5rem',
                                lineHeight: '1'
                              }}>
                                ℹ️
                              </span>
                              <div style={{ flex: 1 }}>
                                <h4 style={{
                                  color: gold,
                                  fontSize: '1rem',
                                  fontWeight: 'bold',
                                  marginBottom: '8px',
                                  marginTop: 0
                                }}>
                                  {item.term}
                                </h4>
                                <p style={{
                                  color: lightText,
                                  fontSize: '0.9rem',
                                  lineHeight: '1.6',
                                  margin: 0,
                                  opacity: 0.9
                                }}>
                                  {item.definition}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quantum Features List */}
                  <div style={{
                    marginTop: '40px',
                    padding: '30px',
                    background: darkBlue,
                    borderRadius: '15px',
                    border: `1px solid ${gold}44`
                  }}>
                    <h3 style={{
                      color: gold,
                      fontSize: '1.5rem',
                      marginBottom: '25px',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}>
                      {language === 'TR' ? '⚛️ Kuantum Özellikler' : '⚛️ Quantum Features'}
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '20px'
                    }}>
                      {[
                        {
                          icon: '📊',
                          title: language === 'TR' ? 'Kuantum Olasılık Haritalama' : 'Quantum Probability Mapping',
                          desc: language === 'TR' 
                            ? 'Binlerce potansiyel hukuki sonuca dayalı kesin risk skorlama.'
                            : 'Precise risk scoring based on thousands of potential legal outcomes.'
                        },
                        {
                          icon: '🌍',
                          title: language === 'TR' ? 'Küresel Yargı Erişimi' : 'Global Jurisdictional Reach',
                          desc: language === 'TR'
                            ? 'TR, ABD (Federal & Eyalet), İngiltere (XML Tabanlı) ve DE (BGB/HGB) entegre canlı veri akışları.'
                            : 'Integrated live data streams from TR, US (Federal & State), UK (XML-Based), and DE (BGB/HGB).'
                        },
                        {
                          icon: '🔗',
                          title: language === 'TR' ? 'Dolanıklık Analizi' : 'Entanglement Analysis',
                          desc: language === 'TR'
                            ? 'Sözleşmeniz ile yüksek mahkeme içtihatları arasındaki görünmez bağlantıları keşfetme.'
                            : 'Discovering invisible links between your contract and high court precedents.'
                        },
                        {
                          icon: '🌐',
                          title: language === 'TR' ? 'Çapraz Sınır Uyumluluğu' : 'Cross-Border Compliance',
                          desc: language === 'TR'
                            ? '4 büyük hukuk sistemi genelinde uluslararası anlaşmalar için otomatik hukuki kontroller.'
                            : 'Automated legal checks for international agreements across 4 major legal systems.'
                        }
                      ].map((feature, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          style={{
                            padding: '20px',
                            background: midBlue,
                            borderRadius: '12px',
                            border: `1px solid ${gold}33`,
                            transition: 'all 0.3s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = gold;
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = `0 8px 24px ${gold}33`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = gold + '33';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{
                            fontSize: '32px',
                            marginBottom: '12px',
                            filter: 'drop-shadow(0 0 8px rgba(199, 176, 121, 0.5))'
                          }}>
                            {feature.icon}
                          </div>
                          <h4 style={{
                            color: gold,
                            fontSize: '1.1rem',
                            marginBottom: '10px',
                            fontWeight: 'bold'
                          }}>
                            {feature.title}
                          </h4>
                          <p style={{
                            color: lightText,
                            fontSize: '0.95rem',
                            lineHeight: '1.6',
                            opacity: 0.9
                          }}>
                            {feature.desc}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      
      {/* FOOTER */}
      <footer style={{ 
        background: '#131b26', 
        padding: '30px 20px', 
        marginTop: '60px',
        borderTop: `1px solid ${gold}33`,
        textAlign: 'center'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '30px', 
          flexWrap: 'wrap',
          marginBottom: '20px'
        }}>
          <a 
            href="/kvkk" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: gold, 
              textDecoration: 'none', 
              fontSize: '14px',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            KVKK Aydınlatma Metni
          </a>
          <a 
            href="/privacy" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: gold, 
              textDecoration: 'none', 
              fontSize: '14px',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            GDPR
          </a>
          <a 
            href="/distance-agreement" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: gold, 
              textDecoration: 'none', 
              fontSize: '14px',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Mesafeli Satış Sözleşmesi
          </a>
          <a 
            href="/privacy" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: gold, 
              textDecoration: 'none', 
              fontSize: '14px',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Gizlilik Politikası
          </a>
        </div>
        
        {/* Yasal Uyarı Akordiyon */}
        <div style={{
          maxWidth: '800px',
          margin: '30px auto 20px',
          border: `1px solid ${gold}33`,
          borderRadius: '8px',
          overflow: 'hidden',
          background: darkBlue
        }}>
          <button
            onClick={() => setDisclaimerOpen(!disclaimerOpen)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '15px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: gold,
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${gold}11`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Scale size={18} color={gold} />
              <span>{language === 'TR' ? 'Yasal Uyarı' : 'Legal Disclaimer'}</span>
            </div>
            <span style={{ fontSize: '12px', transition: 'transform 0.2s', transform: disclaimerOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </button>
          {disclaimerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                padding: '20px',
                borderTop: `1px solid ${gold}33`,
                color: lightText,
                fontSize: '13px',
                lineHeight: '1.6',
                textAlign: 'left'
              }}
            >
              {language === 'TR' 
                ? 'Veritas Q-AI, yapay zeka tabanlı bir analiz aracıdır. Sunulan raporlar ve analizler yalnızca bilgilendirme ve risk değerlendirme amaçlı olup, hukuki tavsiye niteliği taşımaz. Sistemimiz, yetkili bir avukatın profesyonel görüşünün yerini almaz. Kuantum-AI mantığı ile en yüksek doğruluk hedeflense de, hukuki yorumlar farklılık gösterebilir. Veritas Q-AI ve işletmecileri, bu analizlere dayanılarak alınan kararlardan sorumlu tutulamaz.'
                : 'Veritas Q-AI is an artificial intelligence-based analysis tool. The reports and insights provided are for informational and risk-assessment purposes only and do not constitute legal advice. Our system does not replace the professional judgment of a qualified lawyer. While we strive for 100% accuracy using Quantum-AI logic, legal interpretations may vary. Veritas Q-AI and its operators are not liable for any decisions made based on this analysis.'}
            </motion.div>
          )}
        </div>
        <p style={{ color: lightText, fontSize: '12px', margin: 0, opacity: 0.8 }}>
          © {new Date().getFullYear()} Veritas Q-AI. Tüm hakları saklıdır.
        </p>
        <p style={{ color: lightText, fontSize: '11px', margin: '8px 0 0 0', opacity: 0.6 }}>
          {language === 'TR' ? 'Sürüm: v0.9.1 (Beta)' : 'Version: v0.9.1 (Beta)'}
        </p>
      </footer>

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false);
        }}
        onSubmit={async (title, description, screenshot) => {
          await handleFeedbackSubmit(title, description, screenshot);
          setShowFeedbackModal(false);
        }}
        language={language}
        gold={gold}
        darkBlue={darkBlue}
        lightText={lightText}
      />
      
      <FeedbackHub
        isOpen={showFeedbackHub}
        onClose={() => setShowFeedbackHub(false)}
        language={language}
        gold={gold}
        darkBlue={darkBlue}
        midBlue={midBlue}
        lightText={lightText}
        userEmail={user?.email}
      />

      {/* Toast Notification */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            background: '#000000',
            border: `2px solid ${gold}`,
            borderRadius: '12px',
            padding: '20px 30px',
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.8), 0 0 0 1px ${gold}44`,
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideInRight 0.3s ease-out',
            maxWidth: '400px'
          }}
        >
          <span style={{ fontSize: '24px' }}>⚛️</span>
          <p style={{ 
            color: gold, 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: '600',
            lineHeight: '1.4'
          }}>
            {toastMessage}
          </p>
        </div>
      )}

      {/* Test Mode Region Switch Button */}
      <button
        onClick={() => setTestMode(testMode === null ? false : testMode === false ? true : null)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: testMode === null ? 'rgba(23, 35, 50, 0.8)' : testMode ? 'rgba(199, 176, 121, 0.3)' : 'rgba(199, 176, 121, 0.5)',
          color: gold,
          border: `1px solid ${gold}`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          zIndex: 9999,
          opacity: 0.7,
          transition: 'opacity 0.2s',
          boxShadow: `0 2px 8px rgba(0,0,0,0.3)`
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7';
        }}
      >
        {testMode === null ? 'Mode: Auto' : testMode ? 'Mode: TR' : 'Mode: Global'}
      </button>

      {/* Limit Reached Modal */}
      {/* Credit Purchase Modal */}
      {showCreditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}
        onClick={() => setShowCreditModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: darkBlue,
              border: `2px solid ${gold}`,
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: `0 20px 60px rgba(0,0,0,0.5)`
            }}
          >
            <h2 style={{
              color: gold,
              fontSize: '1.8rem',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {language === 'TR' ? 'Kuantum Kredisi Gerekli' : 'Quantum Credits Required'}
            </h2>
            <p style={{
              color: lightText,
              fontSize: '1rem',
              marginBottom: '30px',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              {language === 'TR' 
                ? 'Analiz yapmak için kuantum kredisi satın almanız veya abonelik paketine geçmeniz gerekiyor.'
                : 'You need to purchase quantum credits or subscribe to a plan to perform analysis.'}
            </p>
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => {
                  setShowCreditModal(false);
                  setActiveTab('pricing');
                  // Navigate to pricing section
                  const pricingElement = document.getElementById('pricing');
                  if (pricingElement) {
                    pricingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                  setTimeout(() => {
                    const pricingElement = document.getElementById('pricing');
                    if (pricingElement) {
                      pricingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 200);
                }}
                style={{
                  padding: '15px 30px',
                  background: gold,
                  color: '#000000',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${gold}66`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {language === 'TR' ? 'Kuantum Kredisi Al' : 'Buy Credits'}
              </button>
              <button
                onClick={() => {
                  setShowCreditModal(false);
                  setActiveTab('pricing');
                  // Navigate to pricing section
                  const pricingElement = document.getElementById('pricing');
                  if (pricingElement) {
                    pricingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                  setTimeout(() => {
                    const pricingElement = document.getElementById('pricing');
                    if (pricingElement) {
                      pricingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 200);
                }}
                style={{
                  padding: '15px 30px',
                  background: 'transparent',
                  color: gold,
                  border: `2px solid ${gold}`,
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${gold}22`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {language === 'TR' ? 'Abone Ol' : 'Subscribe'}
              </button>
            </div>
            <button
              onClick={() => setShowCreditModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'transparent',
                border: 'none',
                color: lightText,
                fontSize: '24px',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              ×
            </button>
          </motion.div>
        </div>
      )}

      {showLimitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}
        onClick={() => setShowLimitModal(false)}
        >
          <div 
            style={{
              background: darkBlue,
              padding: '40px',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '90%',
              border: `2px solid ${gold}`,
              boxShadow: `0 10px 40px rgba(0,0,0,0.5)`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: gold, fontSize: '1.8rem', marginBottom: '20px', textAlign: 'center' }}>
              {language === 'TR' ? 'Analiz Limiti Doldu' : 'Analysis Limit Reached'}
            </h2>
            <p style={{ color: lightText, fontSize: '1.1rem', marginBottom: '30px', textAlign: 'center', lineHeight: '1.6' }}>
              {language === 'TR' 
                ? `Mevcut paketinizde (${userPackage === 'free' ? 'Ücretsiz' : userPackage === 'basic' ? 'Basic' : 'Professional'}) analiz hakkınız dolmuştur. Daha fazla analiz yapmak için paketinizi yükseltin.`
                : `Your current package (${userPackage === 'free' ? 'Free' : userPackage === 'basic' ? 'Basic' : 'Professional'}) analysis limit has been reached. Upgrade your package to perform more analyses.`
              }
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowLimitModal(false);
                  setActiveTab('pricing');
                }}
                style={{
                  background: gold,
                  color: '#000000',
                  padding: '15px 30px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                {language === 'TR' ? 'Paketleri Görüntüle' : 'View Packages'}
              </button>
              <button
                onClick={() => setShowLimitModal(false)}
                style={{
                  background: 'transparent',
                  color: lightText,
                  padding: '15px 30px',
                  borderRadius: '10px',
                  border: `1px solid ${gold}`,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                {language === 'TR' ? 'Kapat' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Celebration Modal */}
      {showSuccessCelebration && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}
        onClick={() => setShowSuccessCelebration(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: `linear-gradient(135deg, ${darkBlue}, ${midBlue})`,
              border: `3px solid ${gold}`,
              borderRadius: '30px',
              padding: '50px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: `0 20px 60px ${gold}66`,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Confetti Effect */}
            {typeof window !== 'undefined' && [...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
                  y: -50,
                  opacity: 1
                }}
                animate={{
                  y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 100,
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
                  opacity: [1, 1, 0],
                  rotate: Math.random() * 360
                }}
                transition={{
                  duration: Math.random() * 2 + 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity
                }}
                style={{
                  position: 'absolute',
                  width: '10px',
                  height: '10px',
                  background: [gold, '#4ade80', '#60a5fa', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)],
                  borderRadius: '50%',
                  pointerEvents: 'none'
                }}
              />
            ))}
            
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 0.3
              }}
              style={{
                fontSize: '80px',
                marginBottom: '20px'
              }}
            >
              🎉
            </motion.div>
            
            <h2 style={{
              color: gold,
              fontSize: '2.5rem',
              fontWeight: '900',
              marginBottom: '20px',
              textShadow: `0 0 20px ${gold}66`
            }}>
              {language === 'TR' ? 'Ödeme Başarılı!' : 'Payment Successful!'}
            </h2>
            
            <p style={{
              color: lightText,
              fontSize: '1.2rem',
              marginBottom: '30px',
              lineHeight: '1.6'
            }}>
              {language === 'TR' 
                ? 'Analiz hakkınız hesabınıza tanımlandı. Artık sınırsız kuantum analizi yapabilirsiniz!'
                : 'Your analysis credits have been added to your account. You can now perform unlimited quantum analysis!'
              }
            </p>
            
            <button
              onClick={() => setShowSuccessCelebration(false)}
              style={{
                padding: '15px 40px',
                background: gold,
                color: '#000000',
                border: 'none',
                borderRadius: '15px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: `0 4px 20px ${gold}66`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                e.currentTarget.style.boxShadow = `0 6px 30px ${gold}88`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = `0 4px 20px ${gold}66`;
              }}
            >
              {language === 'TR' ? 'Harika! Başlayalım' : 'Awesome! Let\'s Start'}
            </button>
          </motion.div>
        </div>
      )}

      {/* ROI Get Started Modal */}
      {showROIModal && roiRecommendedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}
        onClick={() => setShowROIModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: `linear-gradient(135deg, ${darkBlue}, ${midBlue})`,
              border: `3px solid ${gold}`,
              borderRadius: '25px',
              padding: '40px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: `0 20px 60px ${gold}66`
            }}
          >
            <h2 style={{
              color: gold,
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {language === 'TR' ? 'Hemen Başlayın!' : 'Get Started Now!'}
            </h2>
            <p style={{
              color: lightText,
              fontSize: '1.1rem',
              marginBottom: '30px',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              {language === 'TR' 
                ? `Önerilen paket: ${roiRecommendedPackage.name}`
                : `Recommended package: ${roiRecommendedPackage.name}`
              }
            </p>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {/* Global Payment Button */}
              <a
                href={roiRecommendedPackage.lemonSqueezyLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '15px 0',
                  background: gold,
                  color: '#000000',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                  transition: 'all 0.3s',
                  boxShadow: `0 4px 15px ${gold}66`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${gold}88`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 15px ${gold}66`;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span>💳</span>
                  <span>{language === 'TR' ? 'Subscribe Globally ($)' : 'Pay in USD'}</span>
                </div>
              </a>
              
              {/* TR Payment Button */}
              <a
                href={roiRecommendedPackage.shopierLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '15px 0',
                  background: 'transparent',
                  color: gold,
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                  border: `2px solid ${gold}`,
                  transition: 'all 0.3s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${gold}22`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span>{language === 'TR' ? 'Türkiye Kartı ile Öde (TL / Taksit)' : 'Pay with Turkish Card (TL / Installment)'}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    background: `${gold}33`,
                    color: gold,
                    padding: '2px 10px',
                    borderRadius: '8px',
                    fontWeight: '600'
                  }}>
                    {language === 'TR' ? '✓ Taksit İmkanı' : '✓ Installment Available'}
                  </span>
                </div>
              </a>
              {/* Payment Methods Info */}
              {language === 'TR' && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  color: '#a0a0a0',
                  lineHeight: '1.4',
                  opacity: 0.85
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span>💳</span>
                    <span>Kredi kartına 12 aya varan taksit</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    flexWrap: 'wrap',
                    fontSize: '0.65rem'
                  }}>
                    <span style={{ fontWeight: '600' }}>Bonus</span>
                    <span>•</span>
                    <span style={{ fontWeight: '600' }}>World</span>
                    <span>•</span>
                    <span style={{ fontWeight: '600' }}>Maximum</span>
                    <span>•</span>
                    <span style={{ fontWeight: '600' }}>Axess</span>
                    <span>ve diğer tüm kartlar</span>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowROIModal(false)}
              style={{
                width: '100%',
                padding: '12px 0',
                background: 'transparent',
                color: lightText,
                border: `1px solid ${gold}44`,
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${gold}11`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {language === 'TR' ? 'Daha Sonra' : 'Maybe Later'}
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
