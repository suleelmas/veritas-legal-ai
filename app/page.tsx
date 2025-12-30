"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PricingCard from "./components/PricingCard";
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

  -- 4. Trigger: Yeni kullanıcı kaydı olduğunda profile oluştur
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.profiles (id, package_type)
    VALUES (NEW.id, 'free');
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- 5. Index'ler (performans için)
  CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
  CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
*/

type Tab = "analyze" | "pricing" | "about" | "history";
type UserPackage = "free" | "basic" | "professional" | "enterprise" | null;

export default function Home() {
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
  const [selectedLegislation, setSelectedLegislation] = useState<{title: string, content: string} | null>(null);
  const [showLegislationModal, setShowLegislationModal] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const gold = "#c7b079"; 
  const darkBlue = "#182332"; 
  const midBlue = "#232d3c"; 
  const lightText = "#f1efca"; // Kirli beyaz / beyaza yakın gold - normal yazılar için

  const packages = [
    {
      name: "Basic",
      fullName: "Veritas AI Basic Analiz Paketi",
      fullNameGlobal: "Veritas Legal AI Basic Plan (Starter)",
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
      fullName: "Veritas AI Professional – Uzman Paketi ★",
      fullNameGlobal: "Veritas AI Professional Plan (Advocate) ★",
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
      fullName: "Veritas AI Enterprise – Kurumsal Çözüm",
      fullNameGlobal: "Veritas AI Enterprise – Global Partner",
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
      title: "VERITAS LEGAL AI", 
      sub: "YÜKSEK HUKUK ANALİTİĞİ", 
      aboutBtn: "Veritas AI Nedir?", 
      aboutTitle: "Hukukun Geleceği: Veritas AI ile Tanışın",
      aboutText: "Veritas Legal AI, hukuk profesyonellerinin çalışma biçimini dönüştürmek için tasarlanmış ileri seviye bir analiz ekosistemidir. Karmaşık hukuk belgelerini (PDF), güncel mevzuat ve yüksek mahkeme içtihatları ışığında saniyeler içinde tarar.\n\nSadece bir kelime arama motoru değil, metnin hukuki mantığını kavrayan bir yardımcıdır. Sözleşmelerdeki gizli riskleri tespit eder, dava dosyalarındaki eksiklikleri raporlar ve avukatlara stratejik karar alma süreçlerinde veri temelli bir dayanak sunar. Veritas ile manuel dosya inceleme saatlerini saniyelere indirerek, adaletin hızıyla teknolojinin gücünü birleştiriyoruz.",
      googleBtn: "Google ile Giriş Yap", 
      select: "Dosya Seç", 
      btn: "ANALİZİ BAŞLAT", 
      upload: "PDF Belgesini Seçin", 
      download: "RAPORU İNDİR (.PDF)",
      loading: "⏳ Analiz Ediliyor...",
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
      title: "VERITAS LEGAL AI", 
      sub: "SUPREME LEGAL ANALYTICS", 
      aboutBtn: "What is Veritas AI?", 
      aboutTitle: "The Future of Law: Meet Veritas AI",
      aboutText: "Veritas Legal AI is an advanced analytics ecosystem designed to transform how legal professionals work. It scans complex legal documents (PDFs) in seconds, illuminated by current legislation and high court precedents.\n\nIt's not just a word search engine, but an assistant that understands the legal logic of text. It detects hidden risks in contracts, reports deficiencies in case files, and provides lawyers with data-driven support in strategic decision-making processes. With Veritas, we combine the speed of justice with the power of technology by reducing manual file review hours to seconds.",
      googleBtn: "Sign in with Google", 
      select: "Select File", 
      btn: "START ANALYSIS", 
      upload: "Select PDF Document", 
      download: "Download PDF",
      downloadWord: "Download Word",
      loading: "⏳ Analyzing...",
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
      title: "VERITAS LEGAL AI", 
      sub: "ANALYTIQUE JURIDIQUE SUPÉRIEURE", 
      aboutBtn: "Qu'est-ce que Veritas AI?", 
      aboutTitle: "À propos de Veritas Legal AI",
      aboutText: "Veritas est une plateforme d'analyse juridique avancée basée sur l'intelligence artificielle, développée pour les avocats et les professionnels du droit. Elle analyse des documents PDF complexes en quelques secondes, identifie les bases légales et génère des rapports d'évaluation des risques.",
      googleBtn: "Se connecter avec Google", 
      select: "Sélectionner un fichier", 
      btn: "DÉMARRER L'ANALYSE", 
      upload: "Sélectionner un document PDF", 
      download: "TÉLÉCHARGER LE RAPPORT (.PDF)",
      downloadWord: "TÉLÉCHARGER EN WORD",
      loading: "⏳ Analyse en cours...",
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
      title: "VERITAS LEGAL AI", 
      sub: "HÖCHSTE RECHTSANALYTIK", 
      aboutBtn: "Was ist Veritas AI?", 
      aboutTitle: "Über Veritas Legal AI",
      aboutText: "Veritas ist eine fortschrittliche KI-gestützte Rechtsanalytik-Plattform, die für Anwälte und Rechtsexperten entwickelt wurde. Sie analysiert komplexe PDF-Dokumente in Sekunden, identifiziert Rechtsgrundlagen und erstellt Risikobewertungen.",
      googleBtn: "Mit Google anmelden", 
      select: "Datei auswählen", 
      btn: "ANALYSE STARTEN", 
      upload: "PDF-Dokument auswählen", 
      download: "BERICHT HERUNTERLADEN (.PDF)",
      downloadWord: "ALS WORD HERUNTERLADEN",
      loading: "⏳ Analyse läuft...",
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
      title: "VERITAS LEGAL AI", 
      sub: "ВЫСШАЯ ЮРИДИЧЕСКАЯ АНАЛИТИКА", 
      aboutBtn: "Что такое Veritas AI?", 
      aboutTitle: "О Veritas Legal AI",
      aboutText: "Veritas - это передовая платформа юридической аналитики на основе искусственного интеллекта, разработанная для юристов и правовых специалистов. Она анализирует сложные PDF-документы за секунды, находит правовые основания и создает отчеты об оценке рисков.",
      googleBtn: "Войти через Google", 
      select: "Выбрать файл", 
      btn: "НАЧАТЬ АНАЛИЗ", 
      upload: "Выберите PDF-документ", 
      download: "СКАЧАТЬ ОТЧЕТ (.PDF)",
      downloadWord: "СКАЧАТЬ В WORD",
      loading: "⏳ Анализ выполняется...",
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
      title: "VERITAS LEGAL AI", 
      sub: "最高法律分析", 
      aboutBtn: "什么是 Veritas AI?", 
      aboutTitle: "关于 Veritas Legal AI",
      aboutText: "Veritas 是一个为律师和法律专业人士开发的先进人工智能驱动的法律分析平台。它在几秒钟内分析复杂的PDF文档，识别法律依据，并生成风险评估。",
      googleBtn: "使用 Google 登录", 
      select: "选择文件", 
      btn: "开始分析", 
      upload: "选择 PDF 文档", 
      download: "下载报告 (.PDF)",
      downloadWord: "下载 Word 文档",
      loading: "⏳ 分析中...",
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
      title: "VERITAS LEGAL AI", 
      sub: "التحليلات القانونية العليا", 
      aboutBtn: "ما هو Veritas AI?", 
      aboutTitle: "حول Veritas Legal AI",
      aboutText: "Veritas هي منصة تحليلات قانونية متقدمة مدعومة بالذكاء الاصطناعي، تم تطويرها للمحامين والمهنيين القانونيين. تحلل مستندات PDF المعقدة في ثوانٍ، وتحدد الأسس القانونية، وتولد تقارير تقييم المخاطر.",
      googleBtn: "تسجيل الدخول باستخدام Google", 
      select: "اختر الملف", 
      btn: "بدء التحليل", 
      upload: "اختر مستند PDF", 
      download: "تحميل التقرير (.PDF)",
      downloadWord: "تحميل Word",
      loading: "⏳ جاري التحليل...",
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
                fullResult: a.analysis_result
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
    const pkg = effectivePackage;
    if (!pkg) return false;
    
    const limits: Record<UserPackage, number> = {
      'free': 1,
      'basic': 10,
      'professional': 50,
      'enterprise': Infinity,
      null: 1
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
    
    const limits: Record<UserPackage, number> = {
      'free': 1,
      'basic': 10,
      'professional': 50,
      'enterprise': Infinity,
      null: 1
    };
    
    const limit = limits[pkg] || 1;
    if (limit === Infinity) return 0;
    
    return Math.min((analysisCount / limit) * 100, 100);
  };

  const shouldShowLimitWarning = (): boolean => {
    if (limitWarningDismissed) return false;
    const usage = getUsagePercentage();
    return usage >= 80 && usage < 100;
  };

  const isLimitReached = (): boolean => {
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

  const handleAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
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
          targetLang: targetLang
        })
      });

      const data = await res.json();
      let analysisResult = data.reply || data.error || 'Analysis complete';
      
      // Hukuki kısaltmaları yerelleştir (İngilizce için)
      // testMode === false (Global) veya language === 'EN' durumunda yerelleştir
      const isEnglish = language === 'EN' || (testMode === false);
      if (isEnglish) {
        analysisResult = localizeLegalAcronyms(analysisResult, true);
      }
      
      setResult(analysisResult);
      
      // Risk skorunu çıkar ve state'e kaydet
      const extractedScore = extractRiskScore(analysisResult);
      setRiskScore(extractedScore);
      
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
                risk_score: extractedScore || null
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
      setResult(err.message || 'Error occurred');
    } finally {
      setLoading(false);
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
          <title>Veritas Legal AI - Analiz Raporu</title>
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
            <h1>Veritas Legal AI - Analiz Raporu</h1>
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: darkBlue, color: lightText, fontFamily: 'sans-serif' }}>
      
      {/* ÜST BAR - Logo İkonu ve Sağ Üst Dil Menüsü */}
      <nav style={{ width: '100%', background: '#131b26', padding: '15px 20px', position: 'relative', top: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${gold}33` }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Link
            href="/"
            onClick={(e) => {
              // State'i sıfırla ve sayfayı en üste kaydır
              setActiveTab('analyze'); 
              setSidebarOpen(false);
              setFile(null);
              setResult("");
              setLoading(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none'
            }}
          >
            <img 
              src="/mainicon.png" 
              alt="Home" 
              width="48" 
              height="48" 
              style={{ 
                cursor: 'pointer', 
                transition: 'opacity 0.2s',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
                e.currentTarget.style.filter = 'brightness(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            />
          </Link>
          {/* HAMBURGER MENÜ BUTONU - Logo İkonunun Altında */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            style={{ 
              background: 'transparent', 
              border: `2px solid ${gold}`, 
              width: 32, 
              height: 32, 
              borderRadius: '6px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: `0 0 10px ${gold}44`
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ width: '16px', height: '2.5px', backgroundColor: gold, borderRadius: '1px', boxShadow: `0 0 2px ${gold}` }}></div>
              <div style={{ width: '16px', height: '2.5px', backgroundColor: gold, borderRadius: '1px', boxShadow: `0 0 2px ${gold}` }}></div>
              <div style={{ width: '16px', height: '2.5px', backgroundColor: gold, borderRadius: '1px', boxShadow: `0 0 2px ${gold}` }}></div>
            </div>
          </button>
        </div>
        
        {/* SAĞ ÜST MENÜLER - Dil ve Kullanıcı */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '40px' }}>
          {/* DİL MENÜSÜ */}
          <div style={{ position: 'relative' }} data-language-menu>
            <button 
              onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
              style={{ 
                background: 'transparent', 
                border: `1px solid ${gold}`, 
                color: gold, 
                padding: '8px 15px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: 'bold',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke={gold} strokeWidth="2" fill="none"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={gold} strokeWidth="1.5" fill="none"/>
              </svg>
              <span style={{ color: gold }}>{language}</span>
              <span style={{ fontSize: '10px', color: gold }}>{languageMenuOpen ? '▲' : '▼'}</span>
            </button>

            {languageMenuOpen && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                right: '0', 
                marginTop: '8px', 
                background: '#131b26', 
                border: `1px solid ${gold}`, 
                borderRadius: '8px', 
                minWidth: '120px',
                boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
                zIndex: 1100,
                overflow: 'hidden'
              }}>
                {["EN", "TR", "FR", "DE", "RU", "ZH", "AR"].map(l => (
                  <button 
                    key={l} 
                    onClick={() => {
                      setLanguage(l);
                      setLanguageMenuOpen(false);
                    }} 
                    style={{ 
                      width: '100%',
                      background: language === l ? gold : 'transparent', 
                      color: language === l ? '#ffffff' : lightText, 
                      border: 'none',
                      padding: '10px 15px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '13px',
                      textAlign: 'left',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (language !== l) {
                        e.currentTarget.style.background = `${gold}33`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (language !== l) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* KULLANICI MENÜSÜ - Sadece giriş yapılmışsa görünür */}
          {user && (
            <div style={{ position: 'relative' }} data-user-menu>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  background: `linear-gradient(135deg, ${gold}, #d4c08a)`,
                  border: `2px solid ${gold}`,
                  color: darkBlue,
                  padding: '0',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  boxShadow: `0 2px 8px rgba(199, 176, 121, 0.3)`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = `0 4px 12px rgba(199, 176, 121, 0.5)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = `0 2px 8px rgba(199, 176, 121, 0.3)`;
                }}
                title={user.user_metadata?.full_name || user.email || 'User'}
              >
                {getAvatarInitials(user)}
      </button>

              {userMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '8px',
                  background: '#131b26',
                  border: `1px solid ${gold}`,
                  borderRadius: '8px',
                  minWidth: '200px',
                  boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
                  zIndex: 1100,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '12px 15px',
                    borderBottom: `1px solid ${gold}33`,
                    color: lightText,
                    fontSize: '12px',
                    opacity: 0.7
                  }}>
                    {user.email}
                  </div>
                  
                  <Link href="/profile" style={{ textDecoration: 'none' }}>
                    <button
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        color: lightText,
                        border: 'none',
                        padding: '12px 15px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `rgba(199, 176, 121, 0.2)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>👤</span> Profile
                    </button>
                  </Link>

                  {canAccessHistory() && (
                    <button
                      onClick={() => {
                        setActiveTab('history');
                        setUserMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        color: lightText,
                        border: 'none',
                        padding: '12px 15px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `rgba(199, 176, 121, 0.2)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>📋</span> My Analyses
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setUser(null);
                      setUserMenuOpen(false);
                      window.location.href = '/';
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: '#ff6b6b',
                      border: 'none',
                      padding: '12px 15px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background 0.2s',
                      borderTop: `1px solid ${gold}33`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `rgba(255, 107, 107, 0.2)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

          {/* KULLANICI MENÜSÜ - Sadece giriş yapılmışsa görünür */}
          {user && (
            <div style={{ position: 'relative' }} data-user-menu>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  background: `linear-gradient(135deg, ${gold}, #d4c08a)`,
                  border: `2px solid ${gold}`,
                  color: darkBlue,
                  padding: '0',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  boxShadow: `0 2px 8px rgba(199, 176, 121, 0.3)`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = `0 4px 12px rgba(199, 176, 121, 0.5)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = `0 2px 8px rgba(199, 176, 121, 0.3)`;
                }}
                title={user.user_metadata?.full_name || user.email || 'User'}
              >
                {getAvatarInitials(user)}
      </button>

              {userMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '8px',
                  background: '#131b26',
                  border: `1px solid ${gold}`,
                  borderRadius: '8px',
                  minWidth: '200px',
                  boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
                  zIndex: 1100,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '12px 15px',
                    borderBottom: `1px solid ${gold}33`,
                    color: lightText,
                    fontSize: '12px',
                    opacity: 0.7
                  }}>
                    {user.email}
                  </div>
                  
                  <Link href="/profile" style={{ textDecoration: 'none' }}>
                    <button
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        color: lightText,
                        border: 'none',
                        padding: '12px 15px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `rgba(199, 176, 121, 0.2)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>👤</span> Profile
                    </button>
                  </Link>

                  {canAccessHistory() && (
                    <button
                      onClick={() => {
                        setActiveTab('history');
                        setUserMenuOpen(false);
                        setSidebarOpen(false);
                      }}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        color: lightText,
                        border: 'none',
                        padding: '12px 15px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `rgba(199, 176, 121, 0.2)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>📋</span> My Analyses
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setUser(null);
                      setUserMenuOpen(false);
                      window.location.href = '/';
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: '#ff6b6b',
                      border: 'none',
                      padding: '12px 15px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background 0.2s',
                      borderTop: `1px solid ${gold}33`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `rgba(255, 107, 107, 0.2)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <div style={{ display: 'flex', paddingTop: '0' }}>
        {/* SIDEBAR */}
        {sidebarOpen && (
          <aside style={{ width: '260px', background: '#131b26', height: '100vh', position: 'fixed', left: 0, padding: '20px', borderRight: `1px solid ${gold}44`, zIndex: 1050, display: 'flex', flexDirection: 'column' }}>
             <h2 style={{ color: gold, textAlign: 'center', marginBottom: '30px' }}>VERITAS AI</h2>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Analiz butonu - Giriş yapılmışsa görünür ve çalışır, yapılmamışsa giriş yapmaya yönlendirir */}
              {user ? (
                <button 
                  onClick={() => {
                    setActiveTab('analyze'); 
                    setSidebarOpen(false);
                    setFile(null);
                    setResult("");
                  }} 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: activeTab === 'analyze' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
                    color: activeTab === 'analyze' ? gold : '#ffffff', 
                    border: `1px solid ${gold}`, 
                    borderRadius: '10px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="8" stroke={activeTab === 'analyze' ? gold : '#ffffff'} strokeWidth="2" fill="none"/>
                    <path d="m21 21-4.35-4.35" stroke={activeTab === 'analyze' ? gold : '#ffffff'} strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span style={{ color: activeTab === 'analyze' ? gold : '#ffffff' }}>Analiz</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setSidebarOpen(false);
                    handleAuth();
                  }} 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: 'transparent', 
                    color: '#ffffff', 
                    border: `1px solid ${gold}`, 
                    borderRadius: '10px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    opacity: 0.7
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="8" stroke="#ffffff" strokeWidth="2" fill="none"/>
                    <path d="m21 21-4.35-4.35" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span style={{ color: '#ffffff' }}>Analiz (Giriş Gerekli)</span>
                </button>
              )}
              <button 
                onClick={() => {setActiveTab('pricing'); setSidebarOpen(false);}} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: activeTab === 'pricing' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
                  color: activeTab === 'pricing' ? gold : '#ffffff', 
                  border: `1px solid ${gold}`, 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="4" width="22" height="16" rx="2" stroke={activeTab === 'pricing' ? gold : '#ffffff'} strokeWidth="2" fill="none"/>
                  <path d="M1 10h22" stroke={activeTab === 'pricing' ? gold : '#ffffff'} strokeWidth="2"/>
                </svg>
                <span style={{ color: activeTab === 'pricing' ? gold : '#ffffff' }}>Paketler</span>
              </button>
              <button 
                onClick={() => {
                  if (canAccessHistory()) {
                    setActiveTab('history');
                    setSidebarOpen(false);
                  } else {
                    alert(language === 'TR' ? 'Bu özellik sadece Enterprise paketi için geçerlidir.' : 'This feature is only available for Enterprise members.');
                  }
                }} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: activeTab === 'history' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
                  color: canAccessHistory() ? (activeTab === 'history' ? gold : '#ffffff') : '#666666', 
                  border: `1px solid ${canAccessHistory() ? gold : '#666666'}`, 
                  borderRadius: '10px', 
                  cursor: canAccessHistory() ? 'pointer' : 'not-allowed', 
                  fontWeight: 'bold', 
                  textAlign: 'left', 
                  marginTop: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  opacity: canAccessHistory() ? 1 : 0.5
                }}
                title={!canAccessHistory() ? (language === 'TR' ? 'Bu özellik sadece Enterprise paketi için geçerlidir' : 'This feature is only for Enterprise members') : ''}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke={canAccessHistory() ? (activeTab === 'history' ? gold : '#ffffff') : '#666666'} strokeWidth="2" fill="none"/>
                  <path d="M8 2v4M16 2v4M3 10h18" stroke={canAccessHistory() ? (activeTab === 'history' ? gold : '#ffffff') : '#666666'} strokeWidth="2"/>
                </svg>
                <span style={{ color: canAccessHistory() ? (activeTab === 'history' ? gold : '#ffffff') : '#666666' }}>
                  {language === 'TR' ? 'Geçmiş' : 'History'}
                  {!canAccessHistory() && ' 🔒'}
                </span>
              </button>
              <button 
                onClick={() => {setActiveTab('about'); setSidebarOpen(false);}} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: activeTab === 'about' ? `rgba(199, 176, 121, 0.25)` : 'transparent', 
                  color: activeTab === 'about' ? gold : '#ffffff', 
                  border: `1px solid ${gold}`, 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  textAlign: 'left', 
                  marginTop: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke={activeTab === 'about' ? gold : '#ffffff'} strokeWidth="2" fill="none"/>
                  <path d="M12 16v-4M12 8h.01" stroke={activeTab === 'about' ? gold : '#ffffff'} strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={{ color: activeTab === 'about' ? gold : '#ffffff' }}>{ui[language].aboutBtn}</span>
              </button>
             </div>
          </aside>
        )}

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
                  alt="Veritas AI Mockup" 
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
              <div style={{ marginTop: '80px', width: '100%' }}>
                <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '40px', textAlign: 'center' }}>{ui[language].pricing}</h2>
                <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
                      onClick={() => document.getElementById('pdfInputFinal')?.click()} 
                      style={{ 
                        backgroundColor: '#ffffff !important', 
                        color: '#000000', 
                        borderRadius: '50px', 
                        padding: '15px 40px', 
                        fontWeight: 'bold',
                        border: 'none',
                        cursor: 'pointer',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 'fit-content',
                        margin: '0 auto 20px auto',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                        transition: 'background-color 0.3s ease',
                        fontSize: '16px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5 !important';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff !important';
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
                              onClick={() => setLimitWarningDismissed(true)}
                              style={{
                                padding: '8px 16px',
                                background: gold,
                                color: darkBlue,
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              {language === 'TR' ? 'Paketi Yükselt' : 'Upgrade Plan'}
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
                            style={{
                              padding: '8px 16px',
                              background: '#ff6b6b',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              fontSize: '13px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            {language === 'TR' ? 'Paketi Yükselt' : 'Upgrade Plan'}
                          </button>
                        </Link>
                      </div>
                    )}

                    <button 
                      onClick={handleAnalyze}
                      disabled={!file || loading || isLimitReached()}
                      style={{ 
                        width: '100%', 
                        padding: '18px', 
                        backgroundColor: isLimitReached() ? '#666666' : '#ffffff', 
                        color: isLimitReached() ? lightText : darkBlue, 
                        borderRadius: '12px', 
                        border: 'none', 
                        marginTop: '30px', 
                        fontWeight: '900',
                        cursor: (file && !loading && !isLimitReached()) ? 'pointer' : 'not-allowed',
                        opacity: (file && !loading && !isLimitReached()) ? 1 : 0.6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (file && !loading && !isLimitReached()) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (file && !loading && !isLimitReached()) {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                        }
                      }}
                    >
                      <span style={{ color: loading ? lightText : (isLimitReached() ? lightText : darkBlue) }}>
                        {loading ? ui[language].loading : (isLimitReached() ? (language === 'TR' ? 'Limit Doldu' : 'Limit Reached') : ui[language].btn)}
                      </span>
                    </button>
                    {result && (() => {
                      const { summary, detailed } = parseAnalysisResult(result);
                      return (
                        <div 
                          ref={reportRef} 
                          style={{ 
                            marginTop: '30px', 
                            background: '#1a1f2e', 
                            padding: '30px', 
                            borderRadius: '15px', 
                            border: `1px solid ${gold}44` 
                          }}
                        >
                          <h3 style={{ color: gold, marginBottom: '20px', fontSize: '1.5rem' }}>{ui[language].resultTitle}</h3>
                          
                          {/* Sekme Butonları */}
                          <div style={{
                            display: 'flex',
                            gap: '10px',
                            marginBottom: '25px',
                            borderBottom: `2px solid ${gold}33`
                          }}>
                            <button
                              onClick={() => setActiveResultTab('summary')}
                              style={{
                                padding: '12px 24px',
                                background: activeResultTab === 'summary' ? 'transparent' : 'transparent',
                                color: activeResultTab === 'summary' ? gold : lightText,
                                border: 'none',
                                borderBottom: activeResultTab === 'summary' ? `3px solid ${gold}` : '3px solid transparent',
                                cursor: 'pointer',
                                fontWeight: activeResultTab === 'summary' ? 'bold' : 'normal',
                                fontSize: '15px',
                                transition: 'all 0.2s',
                                opacity: activeResultTab === 'summary' ? 1 : 0.7
                              }}
                              onMouseEnter={(e) => {
                                if (activeResultTab !== 'summary') {
                                  e.currentTarget.style.opacity = '1';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (activeResultTab !== 'summary') {
                                  e.currentTarget.style.opacity = '0.7';
                                }
                              }}
                            >
                              {language === 'TR' ? 'Yönetici Özeti' : 'Executive Summary'}
                            </button>
                            <button
                              onClick={() => setActiveResultTab('detailed')}
                              style={{
                                padding: '12px 24px',
                                background: activeResultTab === 'detailed' ? 'transparent' : 'transparent',
                                color: activeResultTab === 'detailed' ? gold : lightText,
                                border: 'none',
                                borderBottom: activeResultTab === 'detailed' ? `3px solid ${gold}` : '3px solid transparent',
                                cursor: 'pointer',
                                fontWeight: activeResultTab === 'detailed' ? 'bold' : 'normal',
                                fontSize: '15px',
                                transition: 'all 0.2s',
                                opacity: activeResultTab === 'detailed' ? 1 : 0.7,
                                position: 'relative'
                              }}
                              onMouseEnter={(e) => {
                                if (activeResultTab !== 'detailed') {
                                  e.currentTarget.style.opacity = '1';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (activeResultTab !== 'detailed') {
                                  e.currentTarget.style.opacity = '0.7';
                                }
                              }}
                            >
                              {language === 'TR' ? 'Ayrıntılı Analiz' : 'Detailed Analysis'}
                              {!canViewDetailedAnalysis() && (
                                <span style={{ 
                                  marginLeft: '8px', 
                                  fontSize: '12px',
                                  opacity: 0.8
                                }}>🔒</span>
                              )}
                            </button>
                          </div>

                          {/* Sekme İçerikleri */}
                          <div style={{ minHeight: '200px' }}>
                            {activeResultTab === 'summary' && (
                              <div style={{ color: lightText, whiteSpace: 'pre-wrap', textAlign: 'left', lineHeight: '1.8' }}>
                                {summary || result}
                              </div>
                            )}
                            {activeResultTab === 'detailed' && (() => {
                              const riskScore = extractRiskScore(result);
                              const riskColor = getRiskColor(riskScore);
                              const riskLevel = getRiskLevel(riskScore);
                              const canViewDetailed = effectivePackage === 'professional' || effectivePackage === 'enterprise';
                              
                              return (
                                <div style={{ position: 'relative' }}>
                                  {/* Risk Skoru Göstergesi - Sadece Professional/Enterprise için net görünür */}
                                  <div style={{
                                    marginBottom: '30px',
                                    padding: '25px',
                                    background: midBlue,
                                    borderRadius: '15px',
                                    border: `1px solid ${gold}44`,
                                    filter: canViewDetailed ? 'none' : 'blur(8px)',
                                    opacity: canViewDetailed ? 1 : 0.3,
                                    pointerEvents: canViewDetailed ? 'auto' : 'none',
                                    position: 'relative'
                                  }}>
                                    <h4 style={{ 
                                      color: gold, 
                                      fontSize: '1.2rem', 
                                      marginBottom: '20px',
                                      fontWeight: 'bold',
                                      textAlign: 'center'
                                    }}>
                                      {language === 'TR' ? 'Risk Skoru Değerlendirmesi' : 'Risk Assessment Score'}
                                    </h4>
                                    
                                    {/* Yatay Bar Göstergesi */}
                                    <div style={{ marginBottom: '15px' }}>
                                      <div style={{
                                        width: '100%',
                                        height: '24px',
                                        background: 'linear-gradient(90deg, #4ade80 0%, #fbbf24 50%, #f97316 75%, #ef4444 100%)',
                                        borderRadius: '12px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                      }}>
                                        <div style={{
                                          width: `${currentRiskScore}%`,
                                          height: '100%',
                                          background: 'rgba(255,255,255,0.3)',
                                          borderRadius: '12px',
                                          transition: 'width 0.5s ease'
                                        }} />
                                        <div style={{
                                          position: 'absolute',
                                          left: `${currentRiskScore}%`,
                                          top: '50%',
                                          transform: 'translate(-50%, -50%)',
                                          width: '32px',
                                          height: '32px',
                                          background: riskColor,
                                          borderRadius: '50%',
                                          border: '3px solid #ffffff',
                                          boxShadow: `0 2px 8px ${riskColor}80`,
                                          transition: 'left 0.5s ease'
                                        }} />
                                      </div>
                                      
                                      {/* Skor ve Seviye */}
                                      <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: '15px'
                                      }}>
                                        <div style={{ textAlign: 'left' }}>
                                          <div style={{ 
                                            color: lightText, 
                                            fontSize: '14px', 
                                            opacity: 0.8,
                                            marginBottom: '5px'
                                          }}>
                                            {language === 'TR' ? 'Risk Seviyesi' : 'Risk Level'}
                                          </div>
                                          <div style={{ 
                                            color: riskColor, 
                                            fontSize: '1.5rem', 
                                            fontWeight: 'bold'
                                          }}>
                                            {riskLevel}
                                          </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <div style={{ 
                                            color: lightText, 
                                            fontSize: '14px', 
                                            opacity: 0.8,
                                            marginBottom: '5px'
                                          }}>
                                            {language === 'TR' ? 'Skor' : 'Score'}
                                          </div>
                                          <div style={{ 
                                            color: riskColor, 
                                            fontSize: '2rem', 
                                            fontWeight: 'bold'
                                          }}>
                                            {currentRiskScore}
                                            <span style={{ fontSize: '1rem', opacity: 0.7 }}>/100</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* İçerik - Blur efekti ile */}
                                  <div style={{ 
                                    color: lightText, 
                                    whiteSpace: 'pre-wrap', 
                                    textAlign: 'left', 
                                    lineHeight: '1.8',
                                    filter: canViewDetailed ? 'none' : 'blur(8px)',
                                    opacity: canViewDetailed ? 1 : 0.3,
                                    userSelect: canViewDetailed ? 'auto' : 'none',
                                    pointerEvents: canViewDetailed ? 'auto' : 'none'
                                  }}>
                                    {(() => {
                                      const content = detailed || result;
                                      const references = detectLegislationReferences(content);
                                      
                                      // Mevzuat referanslarını vurgula
                                      let highlightedContent = content;
                                      const uniqueRefs = Array.from(new Map(references.map(ref => [ref.match, ref])).values());
                                      
                                      uniqueRefs.forEach(ref => {
                                        const escapedMatch = ref.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                        const regex = new RegExp(`(${escapedMatch})`, 'gi');
                                        highlightedContent = highlightedContent.replace(regex, (match) => {
                                          if (canAccessLegislationDetails()) {
                                            return `<span style="color: ${gold}; font-weight: bold; cursor: pointer; text-decoration: underline; border-bottom: 1px dotted ${gold};" data-law="${ref.law}" data-article="${ref.article}">${match}</span>`;
                                          }
                                          return `<span style="color: ${gold}; font-weight: bold;">${match}</span>`;
                                        });
                                      });
                                      
                                      return (
                                        <div 
                                          dangerouslySetInnerHTML={{ __html: highlightedContent.replace(/\n/g, '<br>') }}
                                          onClick={(e) => {
                                            const target = e.target as HTMLElement;
                                            if (target.dataset.law && target.dataset.article && canAccessLegislationDetails()) {
                                              fetchLegislationDetail(target.dataset.law, target.dataset.article);
                                            }
                                          }}
                                        />
                                      );
                                    })()}
                                  </div>
                                  
                                  {/* Kilitli İçerik Overlay - Free/Basic için */}
                                  {!canViewDetailed && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'rgba(24, 35, 50, 0.95)',
                                    border: `2px solid ${gold}`,
                                    borderRadius: '15px',
                                    padding: '40px',
                                    textAlign: 'center',
                                    zIndex: 10,
                                    maxWidth: '500px',
                                    width: '90%',
                                    boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
                                    backdropFilter: 'blur(10px)'
                                  }}>
                                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
                                    <h3 style={{ color: gold, fontSize: '1.5rem', marginBottom: '15px', fontWeight: 'bold' }}>
                                      {language === 'TR' ? 'Ayrıntılı Risk Raporu' : 'Detailed Risk Report'}
                                    </h3>
                                    <p style={{ color: lightText, fontSize: '1rem', lineHeight: '1.6', marginBottom: '30px' }}>
                                      {language === 'TR' 
                                        ? 'Ayrıntılı risk analizi ve madde incelemeleri için Professional pakete geçin.'
                                        : 'Upgrade to Professional package for detailed risk analysis and article reviews.'
                                      }
                                    </p>
                                    <Link href="/#pricing" style={{ textDecoration: 'none' }}>
                                      <button
                                        style={{
                                          padding: '15px 35px',
                                          background: gold,
                                          color: darkBlue,
                                          border: 'none',
                                          borderRadius: '50px',
                                          fontWeight: 'bold',
                                          fontSize: '16px',
                                          cursor: 'pointer',
                                          transition: 'all 0.3s',
                                          boxShadow: `0 4px 12px rgba(199, 176, 121, 0.4)`
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'scale(1.05)';
                                          e.currentTarget.style.boxShadow = `0 6px 16px rgba(199, 176, 121, 0.6)`;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                          e.currentTarget.style.boxShadow = `0 4px 12px rgba(199, 176, 121, 0.4)`;
                                        }}
                                      >
                                        {language === 'TR' ? 'Paketi Yükselt' : 'Upgrade Plan'}
                                      </button>
                                    </Link>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* İndirme Butonları - Her iki sekmede de görünür */}
                          <div style={{ 
                            display: 'flex', 
                            gap: '15px', 
                            marginTop: '25px',
                            flexWrap: 'wrap'
                          }}>
                          <button 
                            onClick={canDownload() ? handleDownloadPDF : () => setShowLimitModal(true)}
                            disabled={!canDownload()}
                            style={{ 
                              background: canDownload() ? '#dc3545' : '#666666', 
                              color: '#ffffff', 
                              padding: '12px 25px', 
                              borderRadius: '10px', 
                              border: 'none', 
                              fontWeight: 'bold', 
                              cursor: canDownload() ? 'pointer' : 'not-allowed',
                              flex: '1',
                              minWidth: '150px',
                              opacity: canDownload() ? 1 : 0.6
                            }}
                            onMouseEnter={(e) => {
                              if (canDownload()) {
                                e.currentTarget.style.background = '#c82333';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (canDownload()) {
                                e.currentTarget.style.background = '#dc3545';
                              }
                            }}
                            title={!canDownload() ? (language === 'TR' ? 'İndirme özelliği için Professional veya Enterprise paketi gereklidir' : 'Download feature requires Professional or Enterprise package') : ''}
                          >
                            <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              {!canDownload() && <span>🔒</span>}
                              {ui[language].download}
                            </span>
                          </button>
                          <button 
                            onClick={canDownload() ? handleDownloadWord : () => setShowLimitModal(true)}
                            disabled={!canDownload()}
                            style={{ 
                              background: canDownload() ? '#2b579a' : '#666666', 
                              color: '#ffffff', 
                              padding: '12px 25px', 
                              borderRadius: '10px', 
                              border: 'none', 
                              fontWeight: 'bold', 
                              cursor: canDownload() ? 'pointer' : 'not-allowed',
                              flex: '1',
                              minWidth: '150px',
                              opacity: canDownload() ? 1 : 0.6
                            }}
                            onMouseEnter={(e) => {
                              if (canDownload()) {
                                e.currentTarget.style.background = '#1e3f6f';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (canDownload()) {
                                e.currentTarget.style.background = '#2b579a';
                              }
                            }}
                            title={!canDownload() ? (language === 'TR' ? 'İndirme özelliği için Professional veya Enterprise paketi gereklidir' : 'Download feature requires Professional or Enterprise package') : ''}
                          >
                            <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              {!canDownload() && <span>🔒</span>}
                              {ui[language].downloadWord || 'Word İndir'}
                            </span>
                          </button>
      </div>
      
      {/* Mevzuat Detay Modal (Enterprise) */}
      {showLegislationModal && selectedLegislation && (
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
          zIndex: 10000,
          padding: '20px'
        }}
        onClick={() => setShowLegislationModal(false)}
        >
          <div style={{
            background: midBlue,
            border: `2px solid ${gold}`,
            borderRadius: '15px',
            padding: '30px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: `0 8px 24px rgba(0,0,0,0.5)`
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: gold, fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                {selectedLegislation.title}
              </h3>
              <button
                onClick={() => setShowLegislationModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: lightText,
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              color: lightText,
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
              fontSize: '14px'
            }}>
              {selectedLegislation.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
})()}
                    
                    {/* AI Chat - Dosyaya Soru Sor (Professional/Enterprise) */}
                    {result && (effectivePackage === 'professional' || effectivePackage === 'enterprise') && (
                      <div style={{
                        marginTop: '30px',
                        background: midBlue,
                        padding: '25px',
                        borderRadius: '15px',
                        border: `1px solid ${gold}44`
                      }}>
                        <h4 style={{ color: gold, fontSize: '1.2rem', marginBottom: '20px', fontWeight: 'bold' }}>
                          {language === 'TR' ? '💬 Dosyaya Soru Sor' : '💬 Ask About Document'}
                        </h4>
                        
                        {/* Chat Mesajları */}
                        <div style={{
                          maxHeight: '300px',
                          overflowY: 'auto',
                          marginBottom: '15px',
                          padding: '15px',
                          background: darkBlue,
                          borderRadius: '10px',
                          minHeight: '150px'
                        }}>
                          {chatMessages.length === 0 ? (
                            <div style={{ color: lightText, opacity: 0.7, textAlign: 'center', padding: '20px' }}>
                              {language === 'TR' 
                                ? 'Dosya hakkında soru sorun...'
                                : 'Ask a question about the document...'}
                            </div>
                          ) : (
                            chatMessages.map((msg, idx) => (
                              <div
                                key={idx}
                                style={{
                                  marginBottom: '15px',
                                  padding: '12px',
                                  background: msg.role === 'user' ? `rgba(199, 176, 121, 0.2)` : 'transparent',
                                  borderRadius: '8px',
                                  textAlign: msg.role === 'user' ? 'right' : 'left'
                                }}
                              >
                                <div style={{
                                  color: msg.role === 'user' ? gold : lightText,
                                  fontSize: '14px',
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: '1.6'
                                }}>
                                  {msg.content}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        
                        {/* Chat Input */}
                        <div style={{ display: 'flex', gap: '10px' }}>
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
                            placeholder={language === 'TR' ? 'Sorunuzu yazın...' : 'Type your question...'}
                            style={{
                              flex: 1,
                              padding: '12px 15px',
                              background: darkBlue,
                              border: `1px solid ${gold}44`,
                              borderRadius: '8px',
                              color: lightText,
                              fontSize: '14px'
                            }}
                            disabled={chatLoading}
                          />
                          <button
                            onClick={handleChatSend}
                            disabled={chatLoading || !chatInput.trim()}
                            style={{
                              padding: '12px 25px',
                              background: chatLoading || !chatInput.trim() ? '#666666' : gold,
                              color: darkBlue,
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                              opacity: chatLoading || !chatInput.trim() ? 0.6 : 1
                            }}
                          >
                            {chatLoading ? '...' : '→'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'pricing' && (
                <div style={{ marginTop: '40px' }}>
                  <h2 style={{ color: gold, fontSize: '2rem', marginBottom: '40px', textAlign: 'center' }}>{ui[language].pricing}</h2>
                  <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
          © {new Date().getFullYear()} Veritas Legal AI. Tüm hakları saklıdır.
        </p>
      </footer>

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
