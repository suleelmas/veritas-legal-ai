import React, { useState } from "react";

const SHOPIER_LOGO = "https://shopier.com/static/images/logo/shopier_logo_200x50_white_bg.png";

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
  testMode?: boolean | null;
};

export default function PricingCard({ gold, plan, priceTR, priceGlobal, features, featuresGlobal, popular, fullName, fullNameGlobal, description, descriptionGlobal, buttonText, buttonTextGlobal, shopierLink, lemonSqueezyLink, language = 'EN', ui, testMode }: PricingCardProps) {
  const [country, setCountry] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && testMode === null) {
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
    } else if (testMode !== null) {
      setCountry(testMode ? 'TR' : 'GLOBAL');
      setLoading(false);
    }
  }, [testMode]);

  const isTurkey = country === 'TR';
  const displayPrice = isTurkey ? priceTR : priceGlobal;
  const displayFullName = isTurkey ? (fullName || plan) : (fullNameGlobal || plan);
  const displayDescription = isTurkey ? description : (descriptionGlobal || description);
  const displayFeatures = isTurkey ? features : (featuresGlobal || features);
  const displayButtonText = isTurkey ? 'Satın Al' : 'Get Started';
  const buttonLink = isTurkey ? shopierLink : lemonSqueezyLink;
  
  return (
    <div style={{
      position: 'relative',
      overflow: 'visible',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flex: '1 1 0',
      paddingTop: '50px'
    }}>
      {popular && (
        <div style={{
          position: 'absolute',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#182332',
          color: gold,
          padding: '10px 26px',
          borderRadius: 14,
          fontWeight: 800,
          fontSize: '.98rem',
          boxShadow: `0 2px 9px ${gold}22, 0 0 0 4px #182332`,
          zIndex: 30,
          whiteSpace: 'nowrap',
          border: `2px solid ${gold}`,
          lineHeight: '1.2',
          marginTop: '0'
        }}>
          {ui?.[language]?.popularBadge || (isTurkey ? '★ EN POPÜLER' : '★ MOST POPULAR')}
        </div>
      )}
      <div style={{
        background: popular ? `linear-gradient(135deg, ${gold}22 0%, #313950 100%)` : `rgba(23,28,45,0.7)`,
        border: popular ? `3px solid ${gold}` : `1.5px solid #414564`,
        color: '#f8fafc',
        borderRadius: 18,
        padding: '36px',
        boxShadow: popular ? `0 10px 36px ${gold}44` : 'none',
        minWidth: 280,
        maxWidth: 'none',
        position: 'relative',
        overflow: 'visible',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: '1 1 auto',
        minHeight: '600px'
      }}>
      <div style={{ 
        fontSize: 27, 
        fontWeight: 900, 
        color: gold, 
        marginBottom: 10,
        paddingTop: '0',
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
        position: 'relative',
        flex: '1 1 auto'
      }}>
        {displayFeatures.map((f, idx) => <li key={idx} style={{ 
          marginBottom: 7, 
          color: '#f1efca', 
          fontWeight: 700,
          paddingLeft: '4px'
        }}>&#10003; {f}</li>)}
      </ul>
      <div style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!loading && shopierLink && lemonSqueezyLink ? (
          <>
            <a
              href={lemonSqueezyLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 0',
                background: '#c7b079',
                backgroundColor: '#c7b079',
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                textDecoration: 'none',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                boxShadow: `0 4px 12px rgba(199, 176, 121, 0.3)`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.setProperty('background-color', '#b8a269', 'important');
                e.currentTarget.style.setProperty('background', '#b8a269', 'important');
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 20px rgba(199, 176, 121, 0.5)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.setProperty('background-color', '#c7b079', 'important');
                e.currentTarget.style.setProperty('background', '#c7b079', 'important');
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 12px rgba(199, 176, 121, 0.3)`;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span>💳</span>
                <span>{isTurkey ? 'Subscribe Globally ($)' : 'Pay in USD'}</span>
              </div>
            </a>
            <a
              href={shopierLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 0',
                background: 'transparent',
                color: gold,
                fontWeight: 'bold',
                fontSize: '0.9rem',
                border: `2px solid ${gold}`,
                borderRadius: 12,
                cursor: 'pointer',
                textDecoration: 'none',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${gold}22`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span>{isTurkey ? 'Türkiye Kartı ile Öde (TL / Taksit)' : 'Pay with Turkish Card (TL / Installment)'}</span>
                <span style={{
                  fontSize: '0.65rem',
                  background: `${gold}33`,
                  color: gold,
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  marginTop: '2px'
                }}>
                  {isTurkey ? '✓ Taksit İmkanı' : '✓ Installment Available'}
                </span>
              </div>
            </a>
            {/* Payment Methods Info */}
            {isTurkey && (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                textAlign: 'center',
                fontSize: '0.7rem',
                color: '#a0a0a0',
                lineHeight: '1.4',
                opacity: 0.85
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span>💳</span>
                  <span>Kredi kartına 12 aya varan taksit</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  flexWrap: 'wrap',
                  fontSize: '0.65rem'
                }}>
                  <span style={{ fontWeight: '600' }}>Bonus</span>
                  <span>•</span>
                  <span style={{ fontWeight: '600' }}>World</span>
                  <span>•</span>
                  <span style={{ fontWeight: '600' }}>Maximum</span>
                  <span>•</span>
                  <span style={{ fontWeight: '600' }}>Axess</span>
                  <span>ve diğer tüm kartlar</span>
                </div>
              </div>
            )}
            {/* Payment Disclaimer */}
            <div style={{
              marginTop: '12px',
              padding: '10px',
              background: 'rgba(199, 176, 121, 0.08)',
              borderRadius: '8px',
              border: `1px solid ${gold}22`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px'
              }}>
                <span style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>⚠️</span>
                <div style={{
                  flex: 1,
                  fontSize: '0.7rem',
                  color: '#a0a0a0',
                  lineHeight: '1.4',
                  fontStyle: 'italic',
                  opacity: 0.85
                }}>
                  {language === 'TR' 
                    ? 'Satın alarak, Veritas\'ın bir AI aracı olduğunu ve hukuki danışmanlık hizmeti olmadığını kabul etmiş olursunuz.'
                    : 'By purchasing, you acknowledge that Veritas is an AI tool and not a legal advisory service.'}
                </div>
              </div>
            </div>
          </>
        ) : !loading && buttonLink ? (
          <a
            href={buttonLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              width: '100%',
              padding: '15px 0',
              background: '#c7b079',
              backgroundColor: '#c7b079',
              color: '#000000',
              fontWeight: 'bold',
              fontSize: '1rem',
              border: 'none',
              borderRadius: 15,
              cursor: 'pointer',
              textDecoration: 'none',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              boxShadow: `0 4px 12px rgba(199, 176, 121, 0.3)`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.setProperty('background-color', '#b8a269', 'important');
              e.currentTarget.style.setProperty('background', '#b8a269', 'important');
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 6px 20px rgba(199, 176, 121, 0.5)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.setProperty('background-color', '#c7b079', 'important');
              e.currentTarget.style.setProperty('background', '#c7b079', 'important');
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 12px rgba(199, 176, 121, 0.3)`;
            }}
          >
            {displayButtonText}
          </a>
        ) : (
          <button
            disabled
            style={{
              width: '100%',
              padding: '15px 0',
              background: '#666666',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '1rem',
              border: 'none',
              borderRadius: 15,
              cursor: 'not-allowed',
              opacity: 0.6
            }}
          >
            {loading ? '...' : displayButtonText}
          </button>
        )}
        {/* Payment Disclaimer (for single button) */}
        {(!loading && buttonLink) && (
          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: 'rgba(199, 176, 121, 0.08)',
            borderRadius: '8px',
            border: `1px solid ${gold}22`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px'
            }}>
              <span style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>⚠️</span>
              <div style={{
                flex: 1,
                fontSize: '0.7rem',
                color: '#a0a0a0',
                lineHeight: '1.4',
                fontStyle: 'italic',
                opacity: 0.85
              }}>
                {language === 'TR' 
                  ? 'Satın alarak, Veritas\'ın bir AI aracı olduğunu ve hukuki danışmanlık hizmeti olmadığını kabul etmiş olursunuz.'
                  : 'By purchasing, you acknowledge that Veritas is an AI tool and not a legal advisory service.'}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
