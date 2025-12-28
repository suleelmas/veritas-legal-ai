import React, { useState } from "react";

const SHOPIER_LOGO = "https://shopier.com/static/images/logo/shopier_logo_200x50_white_bg.png";
const LEMON_LOGO = "https://assets-global.website-files.com/5f7fff4cf6f1503b8ad6b195/6170076096672015c22b8e97_lemon%20squeezy%20logo%20horizontal%20svg.svg";

type PricingCardProps = {
  gold: string;
  plan: string;
  priceTR: string;
  priceGlobal: string;
  features: string[];
  featuresGlobal?: string[];
  popular?: boolean;
  fullName?: string;
  fullNameGlobal?: string;
  description?: string;
  descriptionGlobal?: string;
  buttonText?: string;
  buttonTextGlobal?: string;
  shopierLink?: string;
  lemonSqueezyLink?: string;
  language?: string;
  ui?: any;
};

export default function PricingCard({ gold, plan, priceTR, priceGlobal, features, featuresGlobal, popular, fullName, fullNameGlobal, description, descriptionGlobal, buttonText, buttonTextGlobal, shopierLink, lemonSqueezyLink, language = 'EN', ui }: PricingCardProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [country, setCountry] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setLoading(true);
      try {
        fetch('https://ipapi.co/json/')
          .then(r => r.json())
          .then(info => {
            setCountry(info.country_code === 'TR' ? 'TR' : 'GLOBAL');
            setLoading(false);
          })
          .catch(() => {
            setCountry('GLOBAL');
            setLoading(false);
          });
      } catch { 
        setCountry('GLOBAL');
        setLoading(false);
      }
    }
  }, []);

  const isTurkey = country === 'TR';
  const displayPrice = isTurkey ? priceTR : priceGlobal;
  const displayFullName = isTurkey ? (fullName || plan) : (fullNameGlobal || plan);
  const displayDescription = isTurkey ? description : (descriptionGlobal || description);
  const displayFeatures = isTurkey ? features : (featuresGlobal || features);
  const displayButtonText = isTurkey ? (buttonText || 'Satın Al / Buy') : (buttonTextGlobal || 'Buy Now');
  
  return (
    <div style={{
      background: popular ? `linear-gradient(135deg, ${gold}22 0%, #313950 100%)` : `rgba(23,28,45,0.7)`,
      border: popular ? `3px solid ${gold}` : `1.5px solid #414564`,
      color: '#f8fafc',
      borderRadius: 18,
      padding: '36px 36px 36px 36px',
      paddingTop: popular ? '50px' : '36px',
      boxShadow: popular ? `0 10px 36px ${gold}44` : 'none',
      minWidth: 280,
      flex: '0 0 300px',
      maxWidth: 320,
      position: 'relative',
      overflow: 'visible',
      zIndex: 1
    }}>
      {popular && <div style={{
        position: 'absolute',
        top: '-50%',
        right: 20,
        transform: 'translateY(-50%)',
        background: '#182332',
        color: gold,
        padding: '6px 20px',
        borderRadius: 14,
        fontWeight: 800,
        fontSize: '.98rem',
        boxShadow: `0 2px 9px ${gold}22`,
        zIndex: 30,
        whiteSpace: 'nowrap',
        border: `2px solid ${gold}`,
        lineHeight: '1.2'
      }}>{ui?.[language]?.popularBadge || (isTurkey ? '★ EN POPÜLER' : '★ MOST POPULAR')}</div>}
      <div style={{ 
        fontSize: 27, 
        fontWeight: 900, 
        color: gold, 
        marginBottom: 10,
        paddingTop: popular ? '8px' : '0',
        zIndex: 1,
        position: 'relative'
      }}>{displayFullName}</div>
      <div style={{ 
        fontSize: 19, 
        fontWeight: 700, 
        marginBottom: 10, 
        color: gold,
        zIndex: 1,
        position: 'relative'
      }}>{loading ? '...' : displayPrice}</div>
      {displayDescription && <div style={{ 
        fontSize: 14, 
        fontWeight: 500, 
        marginBottom: 18, 
        color: '#f1efca',
        lineHeight: '1.5',
        zIndex: 1,
        position: 'relative'
      }}>{displayDescription}</div>}
      <ul style={{ 
        padding: 0, 
        margin: 0, 
        listStyle: 'none', 
        marginBottom: 18,
        zIndex: 1,
        position: 'relative'
      }}>
        {displayFeatures.map((f, idx) => <li key={idx} style={{ 
          marginBottom: 7, 
          color: '#f1efca', 
          fontWeight: 700,
          paddingLeft: '4px'
        }}>&#10003; {f}</li>)}
      </ul>
      <button
        style={{ width: '100%', padding: '13px 0', background: `rgba(199, 176, 121, 0.25)`, color: gold, fontWeight: 800, fontSize: '1rem', border: `1px solid ${gold}`, borderRadius: 15, cursor: 'pointer', marginTop: 12 }}
        onClick={() => setShowPayment(s => !s)}
      >
        {displayButtonText}
      </button>
      {showPayment && country && !loading && (
        <div style={{ marginTop: 18, background: '#23243a', borderRadius: 12, padding: 18, textAlign: 'center', boxShadow: `0 2px 18px ${gold}22` }}>
          {country === 'TR' ? (
            <>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ fontSize: '1.08rem', fontWeight: 800, color: gold, marginBottom: 8 }}>{ui?.[language]?.shopierSecurePayment || 'Shopier ile Güvenli Ödeme'}</div>
                <a 
                  href={shopierLink || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ 
                    display:'flex', 
                    alignItems:'center', 
                    gap:8, 
                    padding: '9px 24px', 
                    background: `rgba(199, 176, 121, 0.25)`, 
                    color: 'rgba(255, 255, 255, 0.9)', 
                    fontWeight: 800, 
                    border: `1px solid ${gold}`, 
                    borderRadius: 12, 
                    fontSize: '.99rem', 
                    cursor: 'pointer', 
                    textDecoration: 'none' 
                  }}
                >
                  <svg width="60" height="22" viewBox="0 0 120 42" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:3}}>
                    <rect width="120" height="42" rx="8" fill="white"/>
                    <text x="50%" y="54%" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="14" fill="#6926A8" dy=".3em">Shopier</text>
                  </svg>
                  <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{ui?.[language]?.shopierBuy || 'Shopier ile Satın Al'}</span>
                </a>
              </div>
            </>
          ) : (
            <>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ fontSize: '1.08rem', fontWeight: 800, color: gold, marginBottom: 8 }}>{ui?.[language]?.lemonSqueezyCheckout || 'Lemon Squeezy ile Secure Checkout'}</div>
                <a
                  href={lemonSqueezyLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    display:'flex', 
                    alignItems:'center', 
                    gap:10, 
                    padding: '9px 24px', 
                    background: `rgba(199, 176, 121, 0.25)`, 
                    color: gold, 
                    fontWeight: 800, 
                    border: `1px solid ${gold}`, 
                    borderRadius: 12, 
                    fontSize: '.99rem', 
                    cursor: 'pointer',
                    textDecoration: 'none',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  <img src={LEMON_LOGO} alt="Lemon Squeezy" style={{height:23, background:'white', borderRadius:7, padding:'2px 6px'}} />
                  <span style={{ color: gold }}>{ui?.[language]?.buyWithLemonSqueezy || 'Buy with Lemon Squeezy'}</span>
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
