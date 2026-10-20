"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { getLanguage, localeMap, type Language } from '@/lib/translations';

type UserPackage = "free" | "basic" | "professional" | "enterprise" | "quantum_global" | null;
type ProfileTab = "overview" | "settings" | "subscription" | "security";

const PROFILE_TEXT: Record<Language, Record<string, string>> = {
  TR: {
    loadingProfile: 'Profil yükleniyor...', backHome: 'Ana Sayfaya Dön', profile: 'Profil',
    photoSoon: 'Fotoğraf yükleme özelliği yakında', bugHunter: 'Bug Avcısı / Beta Üyesi',
    overview: 'Genel Bakış', settings: 'Ayarlar', subscription: 'Abonelik', security: 'Güvenlik',
    currentPackage: 'Mevcut Paket', analysesUsed: 'Kullanılan Analizler', remainingOne: 'Bu ay {count} analiz hakkınız kaldı.', remainingMany: 'Bu ay {count} analiz hakkınız kaldı.',
    monthlyLimit: 'Aylık limitinize ulaştınız. Analize devam etmek için paketinizi yükseltin.',
    totalAnalyses: 'Toplam Analiz', packageType: 'Paket Türü', fullName: 'Ad Soyad', fullNamePlaceholder: 'Adınızı ve soyadınızı girin',
    emailAddress: 'E-posta Adresi', emailLocked: 'E-posta adresi değiştirilemez.', updating: 'Güncelleniyor...', updateProfile: 'Profili Güncelle',
    updateSuccess: 'Profil başarıyla güncellendi!', updateError: 'Profil güncellenirken hata oluştu',
    currentPlan: 'Mevcut Plan', planFeatures: 'Plan Özellikleri:', upgradePlan: 'Paketi Yükselt',
    authentication: 'Kimlik Doğrulama', loginMethod: 'Giriş Yöntemi', accountCreated: 'Hesap Oluşturma', lastSignIn: 'Son Giriş',
    securityNote: 'Hesabınız Google OAuth kimlik doğrulamasıyla korunmaktadır. Parola yönetimi gerekmez.',
    free: 'Ücretsiz', basic: 'Temel', professional: 'Profesyonel', enterprise: 'Kurumsal', quantum_global: 'Kuantum Global',
    featureFree1: 'Ayda 1 analiz', featureFree2: 'Temel AI analizi', featureFree3: 'Web erişimi',
    featureBasic1: 'Ayda 10 analiz', featureBasic2: 'AI destekli analiz', featureBasic3: '7/24 web erişimi', featureBasic4: 'Dosya takibi',
    featurePro1: 'Ayda 50 analiz', featurePro2: 'PDF & Word indirme', featurePro3: 'Kapsamlı mevzuat taraması', featurePro4: 'Yapılandırılmış hukuki görüş', featurePro5: 'Hızlı işlem',
    featureEnt1: 'Sınırsız analiz', featureEnt2: 'PDF & Word indirme', featureEnt3: 'Analiz geçmişi', featureEnt4: 'Dosya yönetimi', featureEnt5: 'En yüksek öncelik', featureEnt6: 'Kurumsal destek'
  },
  EN: {
    loadingProfile: 'Loading profile...', backHome: 'Back to Home', profile: 'Profile',
    photoSoon: 'Photo upload feature coming soon', bugHunter: 'Bug Hunter / Beta Member',
    overview: 'Overview', settings: 'Settings', subscription: 'Subscription', security: 'Security',
    currentPackage: 'Current Package', analysesUsed: 'Analyses Used', remainingOne: 'You have {count} analysis remaining this month.', remainingMany: 'You have {count} analyses remaining this month.',
    monthlyLimit: 'You have reached your monthly limit. Upgrade to continue analyzing.',
    totalAnalyses: 'Total Analyses', packageType: 'Package Type', fullName: 'Full Name', fullNamePlaceholder: 'Enter your full name',
    emailAddress: 'Email Address', emailLocked: 'Email cannot be changed.', updating: 'Updating...', updateProfile: 'Update Profile',
    updateSuccess: 'Profile updated successfully!', updateError: 'Error updating profile',
    currentPlan: 'Current Plan', planFeatures: 'Plan Features:', upgradePlan: 'Upgrade Plan',
    authentication: 'Authentication', loginMethod: 'Login Method', accountCreated: 'Account Created', lastSignIn: 'Last Sign In',
    securityNote: 'Your account is secured with Google OAuth authentication. No password management is required.',
    free: 'Free', basic: 'Basic', professional: 'Professional', enterprise: 'Enterprise', quantum_global: 'Quantum Global',
    featureFree1: '1 analysis per month', featureFree2: 'Basic AI analysis', featureFree3: 'Web access',
    featureBasic1: '10 analyses per month', featureBasic2: 'AI-powered analysis', featureBasic3: '24/7 web access', featureBasic4: 'File tracking',
    featurePro1: '50 analyses per month', featurePro2: 'PDF & Word download', featurePro3: 'Comprehensive legislation scanning', featurePro4: 'Structured legal opinion', featurePro5: 'Fast processing',
    featureEnt1: 'Unlimited analyses', featureEnt2: 'PDF & Word download', featureEnt3: 'Analysis history', featureEnt4: 'File management', featureEnt5: 'Highest priority', featureEnt6: 'Corporate support'
  },
  FR: {
    loadingProfile: 'Chargement du profil...', backHome: 'Retour à l’accueil', profile: 'Profil',
    photoSoon: 'Le téléversement de photo sera bientôt disponible', bugHunter: 'Chasseur de bugs / Membre bêta',
    overview: 'Vue d’ensemble', settings: 'Paramètres', subscription: 'Abonnement', security: 'Sécurité',
    currentPackage: 'Forfait actuel', analysesUsed: 'Analyses utilisées', remainingOne: 'Il vous reste {count} analyse ce mois-ci.', remainingMany: 'Il vous reste {count} analyses ce mois-ci.',
    monthlyLimit: 'Vous avez atteint votre limite mensuelle. Passez à un forfait supérieur pour continuer les analyses.',
    totalAnalyses: 'Analyses totales', packageType: 'Type de forfait', fullName: 'Nom complet', fullNamePlaceholder: 'Saisissez votre nom complet',
    emailAddress: 'Adresse e-mail', emailLocked: 'L’adresse e-mail ne peut pas être modifiée.', updating: 'Mise à jour...', updateProfile: 'Mettre à jour le profil',
    updateSuccess: 'Profil mis à jour avec succès !', updateError: 'Erreur lors de la mise à jour du profil',
    currentPlan: 'Forfait actuel', planFeatures: 'Fonctionnalités du forfait :', upgradePlan: 'Changer de forfait',
    authentication: 'Authentification', loginMethod: 'Méthode de connexion', accountCreated: 'Compte créé le', lastSignIn: 'Dernière connexion',
    securityNote: 'Votre compte est protégé par l’authentification Google OAuth. Aucun mot de passe n’est à gérer.',
    free: 'Gratuit', basic: 'Basique', professional: 'Professionnel', enterprise: 'Entreprise', quantum_global: 'Quantique Global',
    featureFree1: '1 analyse par mois', featureFree2: 'Analyse IA de base', featureFree3: 'Accès web',
    featureBasic1: '10 analyses par mois', featureBasic2: 'Analyse assistée par IA', featureBasic3: 'Accès web 24 h/24 et 7 j/7', featureBasic4: 'Suivi des fichiers',
    featurePro1: '50 analyses par mois', featurePro2: 'Téléchargement PDF & Word', featurePro3: 'Analyse complète de la législation', featurePro4: 'Avis juridique structuré', featurePro5: 'Traitement rapide',
    featureEnt1: 'Analyses illimitées', featureEnt2: 'Téléchargement PDF & Word', featureEnt3: 'Historique des analyses', featureEnt4: 'Gestion des fichiers', featureEnt5: 'Priorité maximale', featureEnt6: 'Support entreprise'
  },
  DE: {
    loadingProfile: 'Profil wird geladen...', backHome: 'Zur Startseite', profile: 'Profil',
    photoSoon: 'Foto-Upload ist demnächst verfügbar', bugHunter: 'Bug-Jäger / Beta-Mitglied',
    overview: 'Übersicht', settings: 'Einstellungen', subscription: 'Abonnement', security: 'Sicherheit',
    currentPackage: 'Aktuelles Paket', analysesUsed: 'Verwendete Analysen', remainingOne: 'Diesen Monat ist noch {count} Analyse verfügbar.', remainingMany: 'Diesen Monat sind noch {count} Analysen verfügbar.',
    monthlyLimit: 'Sie haben Ihr Monatslimit erreicht. Wechseln Sie zu einem höheren Paket, um weiter zu analysieren.',
    totalAnalyses: 'Analysen insgesamt', packageType: 'Pakettyp', fullName: 'Vollständiger Name', fullNamePlaceholder: 'Geben Sie Ihren vollständigen Namen ein',
    emailAddress: 'E-Mail-Adresse', emailLocked: 'Die E-Mail-Adresse kann nicht geändert werden.', updating: 'Wird aktualisiert...', updateProfile: 'Profil aktualisieren',
    updateSuccess: 'Profil erfolgreich aktualisiert!', updateError: 'Fehler beim Aktualisieren des Profils',
    currentPlan: 'Aktueller Tarif', planFeatures: 'Tariffunktionen:', upgradePlan: 'Paket upgraden',
    authentication: 'Authentifizierung', loginMethod: 'Anmeldemethode', accountCreated: 'Konto erstellt', lastSignIn: 'Letzte Anmeldung',
    securityNote: 'Ihr Konto ist durch Google OAuth geschützt. Eine Passwortverwaltung ist nicht erforderlich.',
    free: 'Kostenlos', basic: 'Basis', professional: 'Professionell', enterprise: 'Unternehmen', quantum_global: 'Quantum Global',
    featureFree1: '1 Analyse pro Monat', featureFree2: 'Grundlegende KI-Analyse', featureFree3: 'Webzugriff',
    featureBasic1: '10 Analysen pro Monat', featureBasic2: 'KI-gestützte Analyse', featureBasic3: '24/7-Webzugriff', featureBasic4: 'Dateiverfolgung',
    featurePro1: '50 Analysen pro Monat', featurePro2: 'PDF- & Word-Download', featurePro3: 'Umfassende Gesetzgebungsprüfung', featurePro4: 'Strukturierte rechtliche Einschätzung', featurePro5: 'Schnelle Verarbeitung',
    featureEnt1: 'Unbegrenzte Analysen', featureEnt2: 'PDF- & Word-Download', featureEnt3: 'Analyseverlauf', featureEnt4: 'Dateiverwaltung', featureEnt5: 'Höchste Priorität', featureEnt6: 'Unternehmenssupport'
  }
};

export default function ProfilePage() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [userPackage, setUserPackage] = useState<UserPackage>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [updating, setUpdating] = useState(false);
  const [language, setLanguage] = useState<Language>('EN');
  const [isEarlyBird, setIsEarlyBird] = useState(false);

  const gold = "#c7b079";
  const darkBlue = "#182332";
  const midBlue = "#232d3c";
  const lightText = "#f1efca";

  useEffect(() => {
    const initProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/');
        return;
      }

      setUser(session.user);
      setUserEmail(session.user.email || "");
      setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "");
      
      // Dil tercihini localStorage'dan yükle
      const savedLanguage = localStorage.getItem('language') || localStorage.getItem('lang') || window.navigator.language.slice(0, 2).toUpperCase();
      setLanguage(getLanguage(savedLanguage));

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('package_type, analysis_count, is_early_bird')
          .eq('id', session.user.id)
          .single();

        if (!error && profile) {
          setUserPackage(profile.package_type as UserPackage);
          setAnalysisCount(profile.analysis_count || 0);
          setIsEarlyBird(profile.is_early_bird || false);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    initProfile();
  }, [supabase, router]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setUpdating(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: userName }
      });

      if (error) throw error;
      alert(PROFILE_TEXT[language].updateSuccess);
    } catch (err: any) {
      console.error('Update error:', err);
      alert(PROFILE_TEXT[language].updateError + ': ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getPackageLimit = (pkg: UserPackage): number => {
    if (!pkg) return 1;
    const limits: Record<Exclude<UserPackage, null>, number> = {
      'free': 1,
      'basic': 10,
      'professional': 50,
      'enterprise': Infinity,
      'quantum_global': Infinity
    };
    return limits[pkg || 'free'] || 1;
  };

  const getPackageName = (pkg: UserPackage): string => {
    const key = pkg || 'free';
    return PROFILE_TEXT[language][key] || PROFILE_TEXT.EN[key] || key;
  };

  // Avatar oluşturma fonksiyonu
  const getAvatarInitials = (userData: any): string => {
    if (!userData) return 'U';
    
    // Önce full_name'i kontrol et
    const fullName = userData.user_metadata?.full_name || userData.user_metadata?.name || userName || '';
    
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
    const email = userData.email || userEmail || '';
    if (email) {
      const emailParts = email.split('@')[0];
      if (emailParts.length >= 2) {
        return emailParts.substring(0, 2).toUpperCase();
      }
      return emailParts.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  const getPackageFeatures = (pkg: UserPackage): string[] => {
    const t = PROFILE_TEXT[language];
    if (!pkg) return [];
    if (pkg === 'free') return [t.featureFree1, t.featureFree2, t.featureFree3];
    if (pkg === 'basic') return [t.featureBasic1, t.featureBasic2, t.featureBasic3, t.featureBasic4];
    if (pkg === 'professional') return [t.featurePro1, t.featurePro2, t.featurePro3, t.featurePro4, t.featurePro5];
    return [t.featureEnt1, t.featureEnt2, t.featureEnt3, t.featureEnt4, t.featureEnt5, t.featureEnt6];
  };

  const t = PROFILE_TEXT[language];
  const tx = (key: string, params?: Record<string, string | number>) => {
    let value = t[key] || PROFILE_TEXT.EN[key] || key;
    if (params) {
      for (const [name, replacement] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), String(replacement));
      }
    }
    return value;
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: darkBlue, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: lightText
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>⏳</div>
          <div>{t.loadingProfile}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const limit = getPackageLimit(userPackage);
  const usagePercentage = limit === Infinity ? 0 : Math.min((analysisCount / limit) * 100, 100);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: darkBlue, color: lightText, fontFamily: 'sans-serif' }}>
      {/* Header */}
      <nav style={{ 
        width: '100%', 
        background: '#131b26', 
        padding: '15px 20px', 
        borderBottom: `1px solid ${gold}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link href="/" style={{ textDecoration: 'none', color: gold, fontWeight: 'bold', fontSize: '20px' }}>
          ← {t.backHome}
        </Link>
        <div style={{ color: gold, fontWeight: 'bold' }}>{t.profile}</div>
      </nav>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)' }}>
        {/* Sidebar Navigation */}
        <aside style={{ 
          width: '250px', 
          background: '#131b26', 
          padding: '30px 20px',
          borderRight: `1px solid ${gold}33`
        }}>
          <div style={{ marginBottom: '30px' }}>
            <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto 15px' }}>
              <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                background: `linear-gradient(135deg, ${gold}, #d4c08a)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                fontWeight: 'bold',
                color: darkBlue,
                boxShadow: `0 4px 16px rgba(199, 176, 121, 0.4)`,
                border: `3px solid ${gold}`
              }}>
                {getAvatarInitials(user)}
              </div>
              {/* Fotoğraf yükleme placeholder */}
              <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: midBlue,
                border: `2px solid ${gold}`,
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'not-allowed',
                opacity: 0.6
              }} title={t.photoSoon}>
                <span style={{ fontSize: '16px' }}>📷</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', color: gold, fontWeight: 'bold', fontSize: '18px' }}>
              {userName || userEmail.split('@')[0]}
            </div>
            {isEarlyBird && (
              <div style={{
                textAlign: 'center',
                marginTop: '8px',
                marginBottom: '5px'
              }}>
                <span style={{
                  display: 'inline-block',
                  background: `linear-gradient(135deg, ${gold}, #d4c08a)`,
                  color: darkBlue,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: `0 2px 8px rgba(199, 176, 121, 0.4)`
                }}>
                  🐛 {t.bugHunter}
                </span>
              </div>
            )}
            <div style={{ textAlign: 'center', color: lightText, fontSize: '12px', marginTop: '5px', opacity: 0.7 }}>
              {userEmail}
            </div>
            <div style={{ 
              textAlign: 'center', 
              color: lightText, 
              fontSize: '11px', 
              marginTop: '8px', 
              opacity: 0.5,
              fontStyle: 'italic'
            }}>
              {t.photoSoon}
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(['overview', 'settings', 'subscription', 'security'] as ProfileTab[]).map((tab) => (
              <button
                key={t[tab]}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 15px',
                  background: activeTab === tab ? `rgba(199, 176, 121, 0.25)` : 'transparent',
                  color: activeTab === tab ? gold : lightText,
                  border: `1px solid ${activeTab === tab ? gold : 'transparent'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {tab === 'overview' && '📊 '}
                {tab === 'settings' && '⚙️ '}
                {tab === 'subscription' && '💳 '}
                {tab === 'security' && '🔒 '}
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h1 style={{ color: gold, fontSize: '2rem', marginBottom: '30px' }}>{t.overview}</h1>
              
              {/* Package Card */}
              <div style={{
                background: midBlue,
                padding: '30px',
                borderRadius: '15px',
                marginBottom: '30px',
                border: `1px solid ${gold}44`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <h2 style={{ color: gold, fontSize: '1.5rem', marginBottom: '20px' }}>
                  {t.currentPackage}: {getPackageName(userPackage)}
                </h2>
                
                <div style={{ marginBottom: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: lightText }}>{t.analysesUsed}</span>
                    <span style={{ color: gold, fontWeight: 'bold' }}>
                      {analysisCount} / {limit === Infinity ? '∞' : limit}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '12px',
                    background: 'rgba(199, 176, 121, 0.2)',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${usagePercentage}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${gold}, #d4c08a)`,
                      transition: 'width 0.3s ease',
                      borderRadius: '6px'
                    }} />
                  </div>
                </div>

                {limit !== Infinity && (
                  <div style={{ 
                    padding: '15px', 
                    background: 'rgba(199, 176, 121, 0.1)', 
                    borderRadius: '8px',
                    color: lightText,
                    fontSize: '14px'
                  }}>
                    {limit - analysisCount > 0 
                      ? tx(limit - analysisCount === 1 ? 'remainingOne' : 'remainingMany', { count: limit - analysisCount })
                      : t.monthlyLimit
                    }
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div style={{
                  background: midBlue,
                  padding: '20px',
                  borderRadius: '12px',
                  border: `1px solid ${gold}44`,
                  textAlign: 'center'
                }}>
                  <div style={{ color: gold, fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px' }}>
                    {analysisCount}
                  </div>
                  <div style={{ color: lightText, fontSize: '14px' }}>{t.totalAnalyses}</div>
                </div>
                <div style={{
                  background: midBlue,
                  padding: '20px',
                  borderRadius: '12px',
                  border: `1px solid ${gold}44`,
                  textAlign: 'center'
                }}>
                  <div style={{ color: gold, fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px' }}>
                    {getPackageName(userPackage)}
                  </div>
                  <div style={{ color: lightText, fontSize: '14px' }}>{t.packageType}</div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h1 style={{ color: gold, fontSize: '2rem', marginBottom: '30px' }}>{t.settings}</h1>
              
              <div style={{
                background: midBlue,
                padding: '30px',
                borderRadius: '15px',
                border: `1px solid ${gold}44`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: gold, 
                    fontWeight: 'bold', 
                    marginBottom: '10px',
                    fontSize: '14px'
                  }}>
                    {t.fullName}
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      background: darkBlue,
                      border: `1px solid ${gold}44`,
                      borderRadius: '8px',
                      color: lightText,
                      fontSize: '16px'
                    }}
                    placeholder={t.fullNamePlaceholder}
                  />
                </div>

                <div style={{ marginBottom: '25px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: gold, 
                    fontWeight: 'bold', 
                    marginBottom: '10px',
                    fontSize: '14px'
                  }}>
                    {t.emailAddress}
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      background: '#1a1f2e',
                      border: `1px solid ${gold}33`,
                      borderRadius: '8px',
                      color: lightText,
                      fontSize: '16px',
                      opacity: 0.6,
                      cursor: 'not-allowed'
                    }}
                  />
                  <div style={{ color: lightText, fontSize: '12px', marginTop: '5px', opacity: 0.7 }}>
                    {t.emailLocked}
                  </div>
                </div>

                <button
                  onClick={handleUpdateProfile}
                  disabled={updating}
                  style={{
                    padding: '12px 30px',
                    background: gold,
                    color: darkBlue,
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    opacity: updating ? 0.6 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  {updating ? t.updating : t.updateProfile}
                </button>
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div>
              <h1 style={{ color: gold, fontSize: '2rem', marginBottom: '30px' }}>{t.subscription}</h1>
              
              <div style={{
                background: midBlue,
                padding: '30px',
                borderRadius: '15px',
                border: `1px solid ${gold}44`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                marginBottom: '30px'
              }}>
                <h2 style={{ color: gold, fontSize: '1.5rem', marginBottom: '20px' }}>
                  {t.currentPlan}: {getPackageName(userPackage)}
                </h2>
                
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ color: lightText, fontSize: '16px', marginBottom: '15px' }}>{t.planFeatures}</h3>
                  <ul style={{ color: lightText, lineHeight: '2', paddingLeft: '20px' }}>
                    {getPackageFeatures(userPackage).map((feature, idx) => (
                      <li key={idx} style={{ marginBottom: '8px' }}>✓ {feature}</li>
                    ))}
                  </ul>
                </div>

                {(userPackage === 'free' || userPackage === 'basic') && (
                  <Link href="/#pricing">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        if (window.location.pathname !== '/') {
                          router.push('/#pricing');
                          setTimeout(() => {
                            window.location.href = '/#pricing';
                          }, 100);
                        } else {
                          router.push('/#pricing');
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
                        width: '100%',
                        padding: '15px',
                        background: '#c7b079',
                        backgroundColor: '#c7b079',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '16px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.setProperty('background', '#b8a269', 'important');
                        e.currentTarget.style.setProperty('backgroundColor', '#b8a269', 'important');
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.setProperty('background', '#c7b079', 'important');
                        e.currentTarget.style.setProperty('backgroundColor', '#c7b079', 'important');
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      <span style={{ color: '#000000' }}>{t.upgradePlan}</span>
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <h1 style={{ color: gold, fontSize: '2rem', marginBottom: '30px' }}>{t.security}</h1>
              
              <div style={{
                background: midBlue,
                padding: '30px',
                borderRadius: '15px',
                border: `1px solid ${gold}44`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ color: gold, fontSize: '18px', marginBottom: '15px' }}>{t.authentication}</h3>
                  <div style={{ color: lightText, fontSize: '14px', lineHeight: '1.8' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>{t.loginMethod}:</strong> Google OAuth
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>{t.accountCreated}:</strong> {new Date(user.created_at).toLocaleDateString(localeMap[language])}
                    </div>
                    <div>
                      <strong>{t.lastSignIn}:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString(localeMap[language]) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '15px',
                  background: 'rgba(199, 176, 121, 0.1)',
                  borderRadius: '8px',
                  color: lightText,
                  fontSize: '14px'
                }}>
                  🔒 {t.securityNote}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

