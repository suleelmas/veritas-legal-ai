import React, { useState } from "react";

const SHOPIER_LOGO = "https://shopier.com/static/images/logo/shopier_logo_200x50_white_bg.png";
const LEMON_LOGO = "https://assets-global.website-files.com/5f7fff4cf6f1503b8ad6b195/6170076096672015c22b8e97_lemon%20squeezy%20logo%20horizontal%20svg.svg";

type PricingCardProps = {
  gold: string;
  plan: string;
  price: string;
  features: string[];
  popular?: boolean;
  fullName?: string;
  description?: string;
  buttonText?: string;
};

export default function PricingCard({ gold, plan, price, features, popular, fullName, description, buttonText }: PricingCardProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [country, setCountry] = useState<string|null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        fetch('https://ipapi.co/json/')
          .then(r => r.json())
          .then(info => setCountry(info.country_code === 'TR' ? 'TR' : 'OTHER'));
      } catch { setCountry('OTHER'); }
    }
  }, []);
  
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
        top: -22,
        right: 20,
        background: gold,
        color: '#000000',
        padding: '4px 18px',
        borderRadius: 14,
        fontWeight: 800,
        fontSize: '.98rem',
        boxShadow: `0 2px 9px ${gold}22`,
        zIndex: 30,
        whiteSpace: 'nowrap',
        border: `2px solid ${gold}`
      }}>★ EN POPÜLER</div>}
      <div style={{ 
        fontSize: 27, 
        fontWeight: 900, 
        color: gold, 
        marginBottom: 10,
        paddingTop: popular ? '8px' : '0',
        zIndex: 1,
        position: 'relative'
      }}>{fullName || plan}</div>
      <div style={{ 
        fontSize: 19, 
        fontWeight: 700, 
        marginBottom: 10, 
        color: gold,
        zIndex: 1,
        position: 'relative'
      }}>{price}</div>
      {description && <div style={{ 
        fontSize: 14, 
        fontWeight: 500, 
        marginBottom: 18, 
        color: '#f1efca',
        lineHeight: '1.5',
        zIndex: 1,
        position: 'relative'
      }}>{description}</div>}
      <ul style={{ 
        padding: 0, 
        margin: 0, 
        listStyle: 'none', 
        marginBottom: 18,
        zIndex: 1,
        position: 'relative'
      }}>
        {features.map((f) => <li key={f} style={{ 
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
        {buttonText || 'Satın Al / Buy'}
      </button>
      {showPayment && country && (
        <div style={{ marginTop: 18, background: '#23243a', borderRadius: 12, padding: 18, textAlign: 'center', boxShadow: `0 2px 18px ${gold}22` }}>
          {country === 'TR' ? (
            <>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ fontSize: '1.08rem', fontWeight: 800, color: gold, marginBottom: 8 }}>Shopier ile Güvenli Ödeme</div>
                <a href={plan === "Basic" ? "https://www.shopier.com/mirale/42406232" : plan === "Professional" ? "https://www.shopier.com/mirale/42406252" : plan === "Enterprise" ? "https://www.shopier.com/mirale/42406288" : undefined} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:8, padding: '9px 24px', background: `rgba(199, 176, 121, 0.25)`, color: 'rgba(255, 255, 255, 0.9)', fontWeight: 800, border: `1px solid ${gold}`, borderRadius: 12, fontSize: '.99rem', cursor: 'pointer', textDecoration: 'none' }}>
  <svg width="60" height="22" viewBox="0 0 120 42" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:3}}><rect width="120" height="42" rx="8" fill="white"/><text x="50%" y="54%" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="14" fill="#6926A8" dy=".3em">Shopier</text></svg>
  <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Shopier ile Satın Al</span>
</a>
              </div>
            </>
          ) : (
            <>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ fontSize: '1.08rem', fontWeight: 800, color: gold, marginBottom: 8 }}>Lemon Squeezy ile Secure Checkout</div>
                <button style={{ display:'flex', alignItems:'center', gap:10, padding: '9px 24px', background: `rgba(199, 176, 121, 0.25)`, color: gold, fontWeight: 800, border: `1px solid ${gold}`, borderRadius: 12, fontSize: '.99rem', cursor: 'pointer' }}>
                  <img src={LEMON_LOGO} alt="Lemon Squeezy" style={{height:23, background:'white', borderRadius:7, padding:'2px 6px'}} />
                  Buy with Lemon Squeezy
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
