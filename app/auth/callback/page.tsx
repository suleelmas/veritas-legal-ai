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
      
      // Dinamik olarak ana sayfaya gönder (base URL kullanarak)
      const baseUrl = window.location.origin;
      window.location.assign(`${baseUrl}/`);
    };

    handleCallback();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#f59e0b' }}>
      <p>Sistem doğrulanıyor...</p>
    </div>
  );
}