"use client";
import React from 'react';
import { Info, ArrowLeft } from 'lucide-react';

type AboutSectionProps = {
  gold: string;
  midBlue: string;
  language?: string;
  onBack?: () => void;
};

export default function AboutSection({ gold, midBlue, language = 'TR', onBack }: AboutSectionProps) {
  return (
    <div style={{ background: midBlue, padding: '40px', borderRadius: '20px', border: `1px solid ${gold}33`, textAlign: 'left', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Info size={28} color={gold} />
        <h2 style={{ color: gold, margin: 0 }}>Veritas AI</h2>
      </div>
      <p style={{ lineHeight: '1.7', opacity: 0.9, marginBottom: '24px' }}>
        Veritas Legal AI, hukuk profesyonelleri için belgeleri saniyeler içinde analiz eden gelişmiş bir yapay zeka sistemidir.
      </p>
      {onBack && (
        <button 
          onClick={onBack} 
          style={{ 
            marginTop: '20px', 
            color: gold, 
            background: 'transparent', 
            border: `1px solid ${gold}`, 
            padding: '8px 16px', 
            borderRadius: '8px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600'
          }}
        >
          <ArrowLeft size={16} color={gold} />
          {language === 'TR' ? 'Geri Dön' : 'Back'}
        </button>
      )}
    </div>
  );
}

