import React, { useState } from "react";

const SHOPIER_LOGO = "https://shopier.com/static/images/logo/shopier_logo_200x50_white_bg.png";
const LEMON_LOGO = "https://assets-global.website-files.com/5f7fff4cf6f1503b8ad6b195/6170076096672015c22b8e97_lemon%20squeezy%20logo%20horizontal%20svg.svg";

type PricingCardProps = {
  gold: string;
  plan: string;
  price: string;
  features: string[];
  popular?: boolean;
};

export default function PricingCard({ gold, plan, price, features, popular }: PricingCardProps) {
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
      padding: 36,
      boxShadow: popular ? `0 10px 36px ${gold}44` : 'none',
      minWidth: 225,
      flex: '0 0 250px',
      maxWidth: 260,
      position: 'relative',
    }}>
      {popular && <div style={{
        position: 'absolute',
        top: -16,
        right: 16,
        background: gold,
        color: '#000000',
        padding: '3px 16px',
        borderRadius: 14,
        fontWeight: 800,
        fontSize: '.98rem',
        boxShadow: `0 2px 9px ${gold}22`,
      }}>★ POPÜLER</div>}
      <div style={{ fontSize: 27, fontWeight: 900, color: gold, marginBottom: 10 }}>{plan}</div>
      <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 22, color: '#f8fafc' }}>{price}</div>
      <ul style={{ padding: 0, margin: 0, listStyle: 'none', marginBottom: 18 }}>
        {features.map((f) => <li key={f} style={{ marginBottom: 7, color: '#ffe18d', fontWeight: 700 }}>&#10003; {f}</li>)}
      </ul>
      <button
        style={{ width: '100%', padding: '13px 0', background: gold, color: '#000000', fontWeight: 800, fontSize: '1rem', border: 'none', borderRadius: 15, cursor: 'pointer', marginTop: 12 }}
        onClick={() => setShowPayment(s => !s)}
      >
        Satın Al / Buy
      </button>
      {showPayment && country && (
        <div style={{ marginTop: 18, background: '#23243a', borderRadius: 12, padding: 18, textAlign: 'center', boxShadow: `0 2px 18px ${gold}22` }}>
          {country === 'TR' ? (
            <>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ fontSize: '1.08rem', fontWeight: 800, color: gold, marginBottom: 8 }}>Shopier ile Güvenli Ödeme</div>
                <a href={plan === "Basic" ? "https://www.shopier.com/mirale/42406232" : plan === "Professional" ? "https://www.shopier.com/mirale/42406252" : plan === "Elite" ? "https://www.shopier.com/mirale/42406288" : undefined} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:8, padding: '9px 24px', background: gold, color: '#000000', fontWeight: 800, border: 'none', borderRadius: 12, fontSize: '.99rem', cursor: 'pointer', textDecoration: 'none' }}>
  <svg width="60" height="22" viewBox="0 0 120 42" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:3}}><rect width="120" height="42" rx="8" fill="white"/><text x="50%" y="54%" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="14" fill="#6926A8" dy=".3em">Shopier</text></svg>
  Shopier ile Satın Al
</a>
              </div>
            </>
          ) : (
            <>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ fontSize: '1.08rem', fontWeight: 800, color: gold, marginBottom: 8 }}>Lemon Squeezy ile Secure Checkout</div>
                <button style={{ display:'flex', alignItems:'center', gap:10, padding: '9px 24px', background: gold, color: '#000000', fontWeight: 800, border: 'none', borderRadius: 12, fontSize: '.99rem', cursor: 'pointer' }}>
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
