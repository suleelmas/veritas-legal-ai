"use client";
import React, { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { getLanguage, type Language } from '@/lib/translations';

export default function AuthCallbackPage() {
  const [language, setLanguage] = React.useState<Language>('EN');

  useEffect(() => {
    const saved = window.localStorage.getItem('language') || window.localStorage.getItem('lang') || window.navigator.language.slice(0, 2).toUpperCase();
    setLanguage(getLanguage(saved));
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(
        new URL(window.location.href).searchParams.get('code') || ''
      );
      
      if (error) {
        console.error('Auth callback error:', error);
        // Hata durumunda da ana sayfaya yönlendir
      }
      
      // Dinamik olarak ana sayfaya gönder (base URL kullanarak)
      // veritasq.ai domain'ine yönlendir, vercel.app'e değil
      const baseUrl = window.location.origin;
      // Eğer hala vercel.app domain'indeyse, veritasq.ai'ye yönlendir
      const finalUrl = baseUrl.includes('vercel.app') 
        ? 'https://veritasq.ai' 
        : baseUrl;
      
      window.location.assign(`${finalUrl}/`);
    };

    handleCallback();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#f59e0b' }}>
      <p>{{TR:'Sistem doğrulanıyor...',EN:'Verifying your session...',FR:'Vérification de votre session...',DE:'Sitzung wird überprüft...'}[language]}</p>
    </div>
  );
}