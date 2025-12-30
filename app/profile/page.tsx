"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

type UserPackage = "free" | "basic" | "professional" | "enterprise" | null;
type ProfileTab = "overview" | "settings" | "subscription" | "security";

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
  const [language, setLanguage] = useState<'TR' | 'EN'>('EN');
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
      const savedLanguage = localStorage.getItem('language') || 'EN';
      setLanguage(savedLanguage === 'TR' ? 'TR' : 'EN');

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
      alert('Profile updated successfully!');
    } catch (err: any) {
      console.error('Update error:', err);
      alert('Error updating profile: ' + err.message);
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
      'enterprise': Infinity
    };
    return limits[pkg || 'free'] || 1;
  };

  const getPackageName = (pkg: UserPackage, lang: 'TR' | 'EN' = 'EN'): string => {
    if (!pkg) return lang === 'TR' ? 'Ücretsiz' : 'Free';
    const names: Record<string, Record<Exclude<UserPackage, null>, string>> = {
      TR: {
        'free': 'Ücretsiz',
        'basic': 'Basic',
        'professional': 'Professional',
        'enterprise': 'Enterprise'
      },
      EN: {
        'free': 'Free',
        'basic': 'Basic',
        'professional': 'Professional',
        'enterprise': 'Enterprise'
      }
    };
    return names[lang][pkg || 'free'] || 'Free';
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
    if (!pkg) return [];
    const features: Record<Exclude<UserPackage, null>, string[]> = {
      'free': [
        '1 Analysis per month',
        'Basic AI Analysis',
        'Web Access'
      ],
      'basic': [
        '10 Analyses per month',
        'AI-Powered Analysis',
        '24/7 Web Access',
        'File Tracking'
      ],
      'professional': [
        '50 Analyses per month',
        'PDF & Word Download',
        'Comprehensive Legislation Scanning',
        'Structured Legal Opinion',
        'Fast Processing'
      ],
      'enterprise': [
        'Unlimited Analyses',
        'PDF & Word Download',
        'Analysis History',
        'File Management',
        'Highest Priority',
        'Corporate Support'
      ]
    };
    return features[pkg || 'free'] || [];
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
          <div>Loading profile...</div>
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
          ← Back to Home
        </Link>
        <div style={{ color: gold, fontWeight: 'bold' }}>Profile</div>
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
              }} title={language === 'TR' ? 'Fotoğraf yükleme özelliği yakında' : 'Photo upload feature coming soon'}>
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
                  🐛 {language === 'TR' ? 'Bug Hunter / Beta Member' : 'Bug Hunter / Beta Member'}
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
              {language === 'TR' ? 'Fotoğraf yükleme özelliği yakında' : 'Photo upload feature coming soon'}
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(['overview', 'settings', 'subscription', 'security'] as ProfileTab[]).map((tab) => (
              <button
                key={tab}
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
              <h1 style={{ color: gold, fontSize: '2rem', marginBottom: '30px' }}>Overview</h1>
              
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
                  Current Package: {getPackageName(userPackage)}
                </h2>
                
                <div style={{ marginBottom: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: lightText }}>Analyses Used</span>
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
                      ? `You have ${limit - analysisCount} analysis${limit - analysisCount > 1 ? 'es' : ''} remaining this month.`
                      : 'You have reached your monthly limit. Upgrade to continue analyzing.'
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
                  <div style={{ color: lightText, fontSize: '14px' }}>Total Analyses</div>
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
                  <div style={{ color: lightText, fontSize: '14px' }}>Package Type</div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h1 style={{ color: gold, fontSize: '2rem', marginBottom: '30px' }}>Settings</h1>
              
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
                    Full Name
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
                    placeholder="Enter your full name"
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
                    Email Address
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
                    Email cannot be changed
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
                  {updating ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div>
              <h1 style={{ color: gold, fontSize: '2rem', marginBottom: '30px' }}>Subscription</h1>
              
              <div style={{
                background: midBlue,
                padding: '30px',
                borderRadius: '15px',
                border: `1px solid ${gold}44`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                marginBottom: '30px'
              }}>
                <h2 style={{ color: gold, fontSize: '1.5rem', marginBottom: '20px' }}>
                  Current Plan: {getPackageName(userPackage)}
                </h2>
                
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ color: lightText, fontSize: '16px', marginBottom: '15px' }}>Plan Features:</h3>
                  <ul style={{ color: lightText, lineHeight: '2', paddingLeft: '20px' }}>
                    {getPackageFeatures(userPackage).map((feature, idx) => (
                      <li key={idx} style={{ marginBottom: '8px' }}>✓ {feature}</li>
                    ))}
                  </ul>
                </div>

                {(userPackage === 'free' || userPackage === 'basic') && (
                  <Link href="/#pricing">
                    <button style={{
                      width: '100%',
                      padding: '15px',
                      background: gold,
                      color: darkBlue,
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '16px',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Upgrade Plan
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <h1 style={{ color: gold, fontSize: '2rem', marginBottom: '30px' }}>Security</h1>
              
              <div style={{
                background: midBlue,
                padding: '30px',
                borderRadius: '15px',
                border: `1px solid ${gold}44`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ color: gold, fontSize: '18px', marginBottom: '15px' }}>Authentication</h3>
                  <div style={{ color: lightText, fontSize: '14px', lineHeight: '1.8' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Login Method:</strong> Google OAuth
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>Account Created:</strong> {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}
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
                  🔒 Your account is secured with Google OAuth authentication. No password management required.
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

