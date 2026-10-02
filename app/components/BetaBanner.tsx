"use client";
import React, { useEffect, useState } from 'react';
import { ct } from '@/lib/componentTranslations';

interface BetaBannerProps {
  language: string;
  onReportClick: () => void;
}

export default function BetaBanner({ language, onReportClick }: BetaBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('language', language);
    }
  }, [language]);

  if (dismissed) return null;

  const gold = "#c7b079";
  const darkBlue = "#182332";

  return (
    <div style={{
      background: `linear-gradient(135deg, ${gold} 0%, #d4c08a 100%)`,
      color: darkBlue,
      padding: '12px 20px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: '600',
      position: 'relative',
      boxShadow: '0 2px 8px rgba(199, 176, 121, 0.3)',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <span>{ct(language, 'betaMessage')}</span>
        <button
          onClick={onReportClick}
          style={{
            background: darkBlue,
            color: '#ffffff',
            border: `2px solid ${darkBlue}`,
            padding: '6px 16px',
            borderRadius: '6px',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1a2d42';
            e.currentTarget.style.borderColor = gold;
            e.currentTarget.style.color = gold;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = darkBlue;
            e.currentTarget.style.borderColor = darkBlue;
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {ct(language, 'reportBug')}
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: darkBlue,
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0 8px',
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          aria-label={ct(language, 'close')}
        >
          ×
        </button>
      </div>
    </div>
  );
}
