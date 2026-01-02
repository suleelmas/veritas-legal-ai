"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PricingCard from "./components/PricingCard";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import AnalysisResult from "./components/AnalysisResult";
import BetaBanner from "./components/BetaBanner";
import FeedbackModal from "./components/FeedbackModal";
import { createBrowserClient } from '@supabase/ssr';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';

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
type UserPackage = "free" | "basic" | "professional" | "enterprise" | null;

export default function Home() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [user, setUser] = useState<any>(null);
  const [userPackage, setUserPackage] = useState<UserPackage>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [analysisHistory, setAnalysisHistory] = useState<Array<{id: string, title: string, date: string, summary: string, fullResult: string, riskScore: number | null}>>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [currentLoadingMessageIndex, setCurrentLoadingMessageIndex] = useState(0);
  const [result, setResult] = useState("");
  const [language, setLanguage] = useState("EN");
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [testMode, setTestMode] = useState<boolean | null>(null); // null = auto, true = TR, false = Global
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [adminTestMode, setAdminTestMode] = useState(false);
  const [adminTestPackage, setAdminTestPackage] = useState<UserPackage | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [limitWarningDismissed, setLimitWarningDismissed] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<'summary' | 'detailed'>('summary');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [pdfText, setPdfText] = useState('');
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [legalCitations, setLegalCitations] = useState<Array<{source: string; citation: string; relevance: number}>>([]);
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
  const reportRef = useRef<HTMLDivElement>(null);

  // Admin test modunda adminTestPackage, normal modda userPackage kullan
  const effectivePackage = adminTestMode && adminTestPackage ? adminTestPackage : userPackage;

  const gold = "#c7b079"; 
  const darkBlue = "#182332"; 
  const midBlue = "#232d3c"; 
  const lightText = "#f1efca"; // Kirli beyaz / beyaza yakın gold - normal yazılar için

  const packages = [
    {
      name: "Basic",
      fullName: "Veritas Q-AI Basic Analiz Paketi",
      fullNameGlobal: "Veritas Q-AI Basic Plan (Starter)",
      priceTR: "49 TL",
      priceGlobal: "$19.00 / month",
      description: "Hukuki süreçlerinize hız kazandırmak için ilk adımı atın! Bireysel kullanıcılar ve küçük ölçekli ofisler için ideal.",
      descriptionGlobal: "Take the first step to accelerate your legal processes! Ideal for individual users and small-scale offices.",
      features: [
        "Ayda 10 Adet Analiz Hakkı",
        "Hızlı Dosya Özeti (Quick Summary) ✓",
        "Temel Risk Tespiti ⚠️",
        "Ayrıntılı Risk Analizi (Detailed Analysis) ✗",
        "Yapay Zeka Destekli Anlık Analiz",
        "7/24 Web Tabanlı Erişim",
        "Rapor İndirme: Yok"
      ],
      featuresGlobal: [
        "10 Analysis Credits Per Month",
        "Quick File Summary ✓",
        "Basic Risk Detection ⚠️",
        "Detailed Risk Analysis ✗",
        "AI-Powered Instant Analysis",
        "24/7 Web-Based Access",
        "Report Download: No"
      ],
      buttonText: "Satın Al",
      buttonTextGlobal: "Buy with Lemon Squeezy",
      isPopular: false,
      shopierLink: "https://www.shopier.com/mirale/42406232",
      lemonSqueezyLink: "https://veritaslegalai.lemonsqueezy.com/checkout/buy/03856d56-2876-4a9a-a979-90d00ee77a6a"
    },
    {
      name: "Professional",
      fullName: "Veritas Q-AI Professional – Uzman Paketi ★",
      fullNameGlobal: "Veritas Q-AI Professional Plan (Advocate) ★",
      priceTR: "149 TL",
      priceGlobal: "$49.00 / month",
      description: "İş yükünü hafifletmek isteyen profesyoneller için tasarlandı! En popüler ve verimli çözümümüz.",
      descriptionGlobal: "Designed for professionals who want to lighten their workload! Our most popular and efficient solution.",
      features: [
        "Ayda 50 Adet Gelişmiş Analiz Hakkı",
        "Hızlı Dosya Özeti (Quick Summary) ✓",
        "Tam Ayrıntılı Analiz Raporu ✓",
        "Görsel Risk Puanlaması (AI Risk Score) ✓",
        "PDF/Word İndirme ✓",
        "Geniş Mevzuat Taraması",
        "Yapılandırılmış Hukuki Görüş Çıktısı"
      ],
      featuresGlobal: [
        "50 Advanced Analysis Credits Per Month",
        "Quick File Summary ✓",
        "Full Detailed Analysis Report ✓",
        "Visual Risk Scoring (AI Risk Score) ✓",
        "PDF/Word Download ✓",
        "Comprehensive Legislation Scanning",
        "Structured Legal Opinion Output"
      ],
      buttonText: "Hemen Başla",
      buttonTextGlobal: "Subscribe Now",
      isPopular: true,
      shopierLink: "https://www.shopier.com/mirale/42406252",
      lemonSqueezyLink: "https://veritaslegalai.lemonsqueezy.com/checkout/buy/3b88cbb9-24b7-4749-af97-5cdb4e28538f"
    },
    {
      name: "Enterprise",
      fullName: "Veritas Q-AI Enterprise – Kurumsal Çözüm",
      fullNameGlobal: "Veritas Q-AI Enterprise – Global Partner",
      priceTR: "399 TL",
      priceGlobal: "$129.00 / month",
      description: "Hukuki operasyonlarınızda sınırları kaldırın! Büyük ofisler ve kurumsal şirketler için limitsiz prestij paketi.",
      descriptionGlobal: "Remove boundaries in your legal operations! Unlimited prestige package for large offices and corporate companies.",
      features: [
        "Sınırsız Analiz Hakkı (Kota Sınırı Yok)",
        "Hızlı Dosya Özeti (Quick Summary) ✓",
        "Tam Ayrıntılı Analiz Raporu ✓",
        "Görsel Risk Puanlaması (AI Risk Score) ✓",
        "PDF/Word İndirme ✓",
        "Geçmiş Analiz Kayıtlarına Sınırsız Erişim",
        "Dosya Yönetimi ve Arşivleme",
        "En Yüksek İşlemci Önceliği",
        "Analiz Geçmişi: Aktif"
      ],
      featuresGlobal: [
        "Unlimited Analysis Credits (No Quota Limit)",
        "Quick File Summary ✓",
        "Full Detailed Analysis Report ✓",
        "Visual Risk Scoring (AI Risk Score) ✓",
        "PDF/Word Download ✓",
        "Unlimited Access to Historical Analysis Records",
        "File Management and Archiving",
        "Highest Processor Priority",
        "Analysis History: Active"
      ],
      buttonText: "Sınırsızlığa Geç",
      buttonTextGlobal: "Get Unlimited Access",
      isPopular: false,
      shopierLink: "https://www.shopier.com/mirale/42406288",
      lemonSqueezyLink: "https://veritaslegalai.lemonsqueezy.com/checkout/buy/599f8b7f-860a-4803-9920-4b0b07165e45"
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
      btn: "ANALİZİ BAŞLAT", 
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
      aboutTitle: "The Future of Law: Meet Veritas Q-AI",
      aboutText: "Veritas Q-AI is an advanced analytics ecosystem designed to transform how legal professionals work. It scans complex legal documents (PDFs) in seconds, illuminated by current legislation and high court precedents.\n\nIt's not just a word search engine, but an assistant that understands the legal logic of text. It detects hidden risks in contracts, reports deficiencies in case files, and provides lawyers with data-driven support in strategic decision-making processes. With Veritas, we combine the speed of justice with the power of technology by reducing manual file review hours to seconds.",
      googleBtn: "Sign in with Google", 
      select: "Select File", 
      btn: "START ANALYSIS", 
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
      btn: "ANALYSE STARTEN", 
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

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      // Kullanıcı paket bilgisini ve analiz sayısını Supabase'den yükle
      if (session?.user) {
        const userId = session.user.id;
        
        try {
          // Profiles tablosundan paket bilgisini çek
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('package_type, analysis_count, analysis_count_reset_date')
            .eq('id', userId)
            .single();
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile fetch error:', profileError);
          }
          
          const packageType = (profile?.package_type || 'free') as UserPackage;
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
          
          // Enterprise kullanıcıları için analiz geçmişini çek
          if (packageType === 'enterprise') {
            const { data: analyses, error: analysesError } = await supabase
              .from('analyses')
              .select('id, file_name, analysis_summary, created_at, analysis_result')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(100);
            
            if (!analysesError && analyses) {
              const history = analyses.map(a => ({
                id: a.id,
                title: a.file_name,
                date: new Date(a.created_at).toLocaleString(language === 'TR' ? 'tr-TR' : 'en-US'),
                summary: a.analysis_summary || a.analysis_result.substring(0, 200) + '...',
                fullResult: a.analysis_result,
                riskScore: extractRiskScore(a.analysis_result)
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
      'enterprise': Infinity
    };
    
    const limit = limits[pkg] || 1;
    
    // Admin test modunda Supabase kontrolü atla
    if (adminTestMode && adminTestPackage) {
      return analysisCount < limit;
    }
    
    // Supabase'den güncel analiz sayısını çek
    if (user?.id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('analysis_count')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          const currentCount = profile.analysis_count || 0;
          return currentCount < limit;
        }
      } catch (err) {
        console.error('Limit check error:', err);
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
          console.error('Reset error:', err);
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
    const pkg = effectivePackage;
    return pkg === 'professional' || pkg === 'enterprise';
  };

  const canViewRiskScore = (): boolean => {
    const pkg = effectivePackage;
    return pkg === 'professional' || pkg === 'enterprise';
  };

  const canAccessHistory = (): boolean => {
    const pkg = effectivePackage;
    return pkg === 'enterprise';
  };

  const canAccessLegislationDetails = (): boolean => {
    const pkg = effectivePackage;
    return pkg === 'enterprise';
  };

  // Limit uyarı kontrolü
  const getUsagePercentage = (): number => {
    const pkg = effectivePackage;
    if (!pkg) return 0;
    
    const limits: Record<Exclude<UserPackage, null>, number> = {
      'free': 1,
      'basic': 10,
      'professional': 50,
      'enterprise': Infinity
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
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectUrl = `${baseUrl}/auth/callback`;
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: redirectUrl
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: userMessage }],
          pdfText: pdfText,
          language: language
        })
      });
      
      const data = await res.json();
      const assistantMessage = data.reply || data.error || 'Sorry, I could not process your request.';
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    // Limit kontrolü (Supabase'den)
    const canAnalyze = await checkAnalysisLimit();
    if (!canAnalyze) {
      setShowLimitModal(true);
      return;
    }
    
    setLoading(true);
    setResult("");
    try {
      // PDF'den metin çıkarma
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
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

      // API'ye gönder
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfText: fullText,
          targetLang: targetLang,
          userSelectedCountry: selectedCountryForAnalysis && selectedCountryForAnalysis !== 'AUTO' ? selectedCountryForAnalysis : userSelectedCountry
        })
      });

      const data = await res.json();
      let analysisResult = data.reply || data.error || 'Analysis complete';
      
      // Jurisdiction detection sonucunu kontrol et
      if (data.jurisdiction && data.jurisdiction.needs_confirmation) {
        // Kullanıcı onayı gerekiyor - state'e kaydet
        setJurisdictionConfirmation({
          detected_country: data.jurisdiction.detected_country,
          confidence: data.jurisdiction.confidence,
          cross_border: data.jurisdiction.cross_border,
          secondary_countries: data.jurisdiction.secondary_countries,
          scores: data.jurisdiction.scores,
          show: true
        });
      }
      
      // Otomatik tespit edilen ülkeyi göster
      if (data.jurisdiction && !selectedCountryForAnalysis) {
        setSelectedCountryForAnalysis(data.jurisdiction.detected_country as 'TR' | 'US' | 'UK' | 'DE');
      }
      
      // Hukuki kısaltmaları yerelleştir (İngilizce için)
      // testMode === false (Global) veya language === 'EN' durumunda yerelleştir
      const isEnglish = language === 'EN' || (testMode === false);
      if (isEnglish) {
        analysisResult = localizeLegalAcronyms(analysisResult, true);
      }
      
      setResult(analysisResult);
      setAnalysisStatus(''); // Status'u temizle
      
      // API'den gelen risk_score ve legal_citations verilerini kullan
      if (data.risk_score !== undefined) {
        setRiskScore(data.risk_score);
      } else {
        // Fallback: Metinden çıkar
        const extractedScore = extractRiskScore(analysisResult);
        setRiskScore(extractedScore);
      }
      
      // Legal citations
      if (data.legal_citations && Array.isArray(data.legal_citations)) {
        setLegalCitations(data.legal_citations);
      }
      
      // Analiz sayısını artır ve Supabase'e kaydet
      const userId = user?.id;
      const analysisTitle = file.name.substring(0, 50) + (file.name.length > 50 ? '...' : '');
      const analysisSummary = analysisResult.substring(0, 200) + (analysisResult.length > 200 ? '...' : '');
      
      if (userId) {
        try {
          // Analiz sayısını artır
          const { data: profile } = await supabase
            .from('profiles')
            .select('analysis_count')
            .eq('id', userId)
            .single();
          
          const newCount = (profile?.analysis_count || 0) + 1;
          
          await supabase
            .from('profiles')
            .update({ analysis_count: newCount })
            .eq('id', userId);
          
          setAnalysisCount(newCount);
          
          // Enterprise kullanıcıları için analizi Supabase'e kaydet
          if (effectivePackage === 'enterprise') {
            const { data: newAnalysis, error: analysisError } = await supabase
              .from('analyses')
              .insert({
                user_id: userId,
                file_name: file.name,
                analysis_result: analysisResult,
                analysis_summary: analysisSummary,
                risk_score: data.risk_score !== undefined ? data.risk_score : (riskScore || null)
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
          // Fallback: localStorage
          const newCount = analysisCount + 1;
          localStorage.setItem(`analysisCount_${userId}`, newCount.toString());
          setAnalysisCount(newCount);
        }
      } else {
        // Giriş yapmamış kullanıcılar için localStorage
        const newCount = analysisCount + 1;
        localStorage.setItem('freeAnalysisCount', newCount.toString());
        setAnalysisCount(newCount);
      }
    } catch (err: any) {
      console.error("Analiz hatası:", err);
      setResult(err.message || (language === 'TR' ? "Analiz sırasında bir hata oluştu." : "An error occurred during analysis."));
      setAnalysisStatus('');
    } finally {
      setLoading(false);
      setAnalysisStatus('');
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      // Geçici olarak renkleri siyah yap
      const originalStyles: { element: HTMLElement; color: string; backgroundColor: string }[] = [];
      const allElements = reportRef.current.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computedStyle = window.getComputedStyle(htmlEl);
        originalStyles.push({
          element: htmlEl,
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor
        });
        htmlEl.style.color = '#000000';
        htmlEl.style.backgroundColor = '#ffffff';
      });
      
      // Başlık ve arka plan rengini de düzelt
      const titleEl = reportRef.current.querySelector('h3');
      if (titleEl) {
        (titleEl as HTMLElement).style.color = '#000000';
      }
      (reportRef.current as HTMLElement).style.backgroundColor = '#ffffff';
      (reportRef.current as HTMLElement).style.color = '#000000';

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgWidth = 190;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save('veritas-report.pdf');
      
      // Orijinal stilleri geri yükle
      originalStyles.forEach(({ element, color, backgroundColor }) => {
        element.style.color = color;
        element.style.backgroundColor = backgroundColor;
      });
      if (titleEl) {
        (titleEl as HTMLElement).style.color = gold;
      }
      (reportRef.current as HTMLElement).style.backgroundColor = '#1a1f2e';
      (reportRef.current as HTMLElement).style.color = lightText;
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

  const handleFeedbackSubmit = async (title: string, description: string, screenshot: File | null) => {
    try {
      // FormData oluştur
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('email', user?.email || 'Anonim');
      
      // Dosya varsa ekle
      if (screenshot) {
        formData.append('file', screenshot);
      }

      // Telegram API'ye gönder
      const response = await fetch('/api/report-bug', {
        method: 'POST',
        body: formData
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
        <Sidebar
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
                  src="/logoverl.png" 
                  alt="Logo" 
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

              {/* Veritas Nedir? Bölümü - Her zaman görünür */}
              <div style={{ marginTop: '80px', maxWidth: '700px', textAlign: 'left', width: '100%' }}>
                <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '30px', textAlign: 'center' }}>{ui[language].aboutTitle}</h2>
                <p style={{ color: lightText, fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '20px', whiteSpace: 'pre-line' }}>{ui[language].aboutText}</p>
                <div style={{ background: midBlue, padding: '25px', borderRadius: '15px', marginTop: '30px' }}>
                  <h3 style={{ color: gold, marginBottom: '15px' }}>{ui[language].features}</h3>
                  <ul style={{ color: lightText, lineHeight: '2' }}>
                    <li>{ui[language].feature1}</li>
                    <li>{ui[language].feature2}</li>
                    <li>{ui[language].feature3}</li>
                    <li>{ui[language].feature4}</li>
                  </ul>
                </div>
              </div>

              {/* Paketler Bölümü - Her zaman görünür */}
              <div id="pricing" style={{ marginTop: '80px', width: '100%' }}>
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
                      testMode={testMode}
                    />
                  ))}
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
                    <input 
                      type="file" 
                      id="pdfInputFinal" 
                      accept=".pdf" 
                      style={{ display: 'none' }} 
                      onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    />
                    <button
                      id="selectFileButton"
                      onClick={() => document.getElementById('pdfInputFinal')?.click()} 
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
                      <span style={{ color: '#000000', fontWeight: 'bold' }}>{ui[language].selectFileForAnalysis || 'Analiz İçin Dosya Seçin'}</span>
                    </button>
                    {file && <p style={{ marginTop: '20px', color: '#4ade80', fontWeight: 'bold', fontSize: '1rem' }}>● {file.name}</p>}
                    
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
                                setActiveTab('pricing');
                                if (window.location.pathname !== '/') {
                                  router.push('/#pricing');
                                  setTimeout(() => {
                                    window.location.href = '/#pricing';
                                  }, 100);
                                } else {
                                  setTimeout(() => {
                                    const pricingElement = document.getElementById('pricing');
                                    if (pricingElement) {
                                      pricingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    } else {
                                      window.location.href = '/#pricing';
                                    }
                                  }, 200);
                                }
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
                              setActiveTab('pricing');
                              if (window.location.pathname !== '/') {
                                router.push('/#pricing');
                                setTimeout(() => {
                                  window.location.href = '/#pricing';
                                }, 100);
                              } else {
                                setTimeout(() => {
                                  const pricingElement = document.getElementById('pricing');
                                  if (pricingElement) {
                                    pricingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  } else {
                                    window.location.href = '/#pricing';
                                  }
                                }, 200);
                              }
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
                              color: isSelected ? '#000000' : lightText,
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
                      onClick={handleAnalyze}
                      disabled={!file || loading || isAnalyzing || isLimitReached()}
                      style={{ 
                        width: '100%', 
                        padding: '18px', 
                        backgroundColor: isLimitReached() ? '#666666' : '#ffffff', 
                        color: isLimitReached() ? lightText : darkBlue, 
                        borderRadius: '12px', 
                        border: 'none', 
                        marginTop: '30px', 
                        fontWeight: '900',
                        cursor: (file && !loading && !isAnalyzing && !isLimitReached()) ? 'pointer' : 'not-allowed',
                        opacity: (file && !loading && !isAnalyzing && !isLimitReached()) ? 1 : 0.6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (file && !loading && !isAnalyzing && !isLimitReached()) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (file && !loading && !isAnalyzing && !isLimitReached()) {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                        }
                      }}
                    >
                      <span style={{ color: (loading || isAnalyzing) ? lightText : (isLimitReached() ? lightText : darkBlue) }}>
                        {isAnalyzing ? (language === 'TR' ? '🔍 Analiz Ediliyor...' : '🔍 Analyzing...') : 
                         isLimitReached() ? (language === 'TR' ? 'Limit Doldu' : 'Limit Reached') : 
                         ui[language].btn}
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
                    {result && (
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

              {activeTab === 'history' && effectivePackage === 'enterprise' && (
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
                <div style={{ marginTop: '40px', maxWidth: '700px', textAlign: 'left' }}>
                  <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '30px', textAlign: 'center' }}>{ui[language].aboutTitle}</h2>
                  <p style={{ color: lightText, fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '20px', whiteSpace: 'pre-line' }}>{ui[language].aboutText}</p>
                  <div style={{ background: midBlue, padding: '25px', borderRadius: '15px', marginTop: '30px' }}>
                    <h3 style={{ color: gold, marginBottom: '15px' }}>{ui[language].features}</h3>
                  <ul style={{ color: lightText, lineHeight: '2' }}>
                    <li>{ui[language].feature1}</li>
                    <li>{ui[language].feature2}</li>
                    <li>{ui[language].feature3}</li>
                    <li>{ui[language].feature4}</li>
                  </ul>
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
    </div>
  );
}
