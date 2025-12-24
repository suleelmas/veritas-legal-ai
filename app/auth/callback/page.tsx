"use client";
import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(
        new URL(window.location.href).searchParams.get('code') || ''
      );
      
      // Zorla ana sayfaya gönder ve çerezleri yenilet
      window.location.assign('/');
    };

    handleCallback();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#f59e0b' }}>
      <p>Sistem doğrulanıyor...</p>
    </div>
  );
}