"use client";
import React from 'react';
import PricingCard from "./PricingCard";

type PricingSectionProps = {
  gold: string;
  language?: string;
};

export default function PricingSection({ gold, language = 'TR' }: PricingSectionProps) {
  return (
    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
      <PricingCard 
        gold={gold} 
        plan="Basic" 
        priceTR="49₺" 
        priceGlobal="$9" 
        features={["10 Analiz"]} 
        language={language}
      />
      <PricingCard 
        gold={gold} 
        plan="Pro" 
        priceTR="149₺" 
        priceGlobal="$29" 
        popular 
        features={["50 Analiz"]} 
        language={language}
      />
    </div>
  );
}

