"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Tab = "analyze" | "pricing" | "about" | "history";
type UserPackage = "free" | "basic" | "professional" | "enterprise" | null;

interface HeaderProps {
  gold: string;
  darkBlue: string;
  lightText: string;
  language: string;
  setLanguage: (lang: string) => void;
  languageMenuOpen: boolean;
  setLanguageMenuOpen: (open: boolean) => void;
  user: any;
  userMenuOpen: boolean;
  setUserMenuOpen: (open: boolean) => void;
  isAdmin?: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: Tab) => void;
  setFile: (file: File | null) => void;
  setResult: (result: string) => void;
  setLoading: (loading: boolean) => void;
  supabase: any;
  setUser: (user: any) => void;
  canAccessHistory: () => boolean;
  getAvatarInitials: (user: any) => string;
}

export default function Header({
  gold,
  darkBlue,
  lightText,
  language,
  setLanguage,
  languageMenuOpen,
  setLanguageMenuOpen,
  user,
  userMenuOpen,
  setUserMenuOpen,
  isAdmin = false,
  sidebarOpen,
  setSidebarOpen,
  setActiveTab,
  setFile,
  setResult,
  setLoading,
  supabase,
  setUser,
  canAccessHistory,
  getAvatarInitials
}: HeaderProps) {
  const router = useRouter();

  return (
    <nav style={{ width: '100%', background: '#131b26', padding: '15px 20px', position: 'relative', top: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${gold}33` }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('analyze'); 
            setSidebarOpen(false);
            setFile(null);
            setResult("");
            setLoading(false);
            if (window.location.pathname !== '/') {
              router.push('/');
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 100);
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
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
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '40px' }}>
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
                
                {/* VIP/Admin Status */}
                {isAdmin && (
                  <div style={{
                    padding: '10px 15px',
                    borderBottom: `1px solid ${gold}33`,
                    background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '18px' }}>⭐</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: gold,
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginBottom: '2px'
                      }}>
                        {language === 'TR' ? 'Plan: Veritas VIP / Developer' : 'Plan: Veritas VIP / Developer'}
                      </div>
                      <div style={{
                        color: lightText,
                        fontSize: '10px',
                        opacity: 0.7
                      }}>
                        {language === 'TR' ? 'Sınırsız Analiz' : 'Unlimited Analysis'}
                      </div>
                    </div>
                  </div>
                )}
                
                {isAdmin && (
                  <div style={{
                    padding: '10px 15px',
                    borderBottom: `1px solid ${gold}33`,
                    background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}>⭐</span>
                    <span style={{
                      color: gold,
                      fontSize: '13px',
                      fontWeight: 'bold'
                    }}>
                      Plan: Veritas VIP / Developer
                    </span>
                  </div>
                )}
                
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
  );
}




