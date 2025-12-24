import React from "react";

// Gelişmiş 3D gold, cam ve shadow efektli Scales (Terazi) SVG Logo
export default function Logo3D({ size = 110, withText = true }: { size?: number, withText?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: withText ? 8 : 0, userSelect: 'none', pointerEvents: 'none', minHeight: size * 1.2 }}>
      <svg 
        width={size} height={size * 0.97} 
        viewBox="0 0 138 128"
        style={{ display: 'block', filter: 'drop-shadow(0 10px 22px #FFD70088) drop-shadow(0 12px 35px #222b)', margin: 0 }}
      >
        <defs>
          <radialGradient id="goldGlow" cx="50%" cy="48%" r="60%">
            <stop offset="5%" stopColor="#fffbe8" stopOpacity="1"/>
            <stop offset="34%" stopColor="#ffe396"/>
            <stop offset="65%" stopColor="#e1c261"/>
            <stop offset="100%" stopColor="#a99128"/>
          </radialGradient>
          <linearGradient id="goldEdge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffbe8"/>
            <stop offset="49%" stopColor="#FFD700"/>
            <stop offset="100%" stopColor="#775B1B"/>
          </linearGradient>
          <radialGradient id="glass" cx="48%" cy="32%" r="72%">
            <stop offset="1%" stopColor="#fff" stopOpacity=".85"/>
            <stop offset="48%" stopColor="#ffe477" stopOpacity=".4"/>
            <stop offset="90%" stopColor="#D4AF3790" stopOpacity="0"/>
          </radialGradient>
        </defs>
        {/* Massive blurred outer shadow */}
        <ellipse cx="69" cy="118" rx="46" ry="10" fill="#d4af3714" filter="url(#f1)"/>
        {/* Platform base */}
        <rect x="44" y="105.5" width="50" height="12" rx="6" fill="url(#goldGlow)" filter="url(#f2)"/>
        {/* Center Pillar */}
        <rect x="63" y="28" width="12" height="78" rx="7" fill="url(#goldGlow)" stroke="#fffbe888" strokeWidth="2" />
        {/* Top arch */}
        <path d="M45 45 Q69 7 93 45" stroke="url(#goldEdge)" strokeWidth="4.4" fill="none"/>
        {/* Cap ellipse */}
        <ellipse cx="69" cy="39" rx="6.6" ry="9" fill="url(#glass)" opacity="0.82" />
        {/* Strings R & L */}
        <line x1="93" y1="45" x2="120" y2="88.5" stroke="url(#goldEdge)" strokeWidth="4.2" />
        <line x1="45" y1="45" x2="18" y2="88.5" stroke="url(#goldEdge)" strokeWidth="4.2" />
        {/* Plates */}
        <ellipse cx="120" cy="94" rx="15" ry="8" fill="url(#goldGlow)" filter="url(#f3)" />
        <ellipse cx="18" cy="94" rx="15" ry="8" fill="url(#goldGlow)" filter="url(#f3)" />
        {/* Rim highlights */}
        <ellipse cx="120" cy="94" rx="8.4" ry="4" fill="#fffde6bb" opacity=".74" />
        <ellipse cx="18" cy="94" rx="8.4" ry="4" fill="#fffde6bb" opacity=".74" />
        {/* Central glassy shine */}
        <ellipse cx="69" cy="47" rx="23" ry="7" fill="#fffde6ad" opacity={0.22}/>
        {/* Decorative overlay for 3D effect */}
        <ellipse cx="69" cy="75" rx="32" ry="11.5" fill="#fffbe81f" opacity={0.12}/>
        <ellipse cx="69" cy="58" rx="22" ry="6.6" fill="#fffbe8a9" opacity={0.1}/>
        <ellipse cx="69" cy="114.5" rx="30" ry="5.0" fill="#fffde602"/>
      </svg>
      {withText && (
        <span
          style={{
            color: '#D4AF37',
            fontWeight: 900,
            fontSize: size / 1.4,
            letterSpacing: 5,
            fontFamily: 'Serif, Times New Roman, Arial',
            textShadow:
              '0 4px 18px #FFD70066, 0 15px 40px #223, 0 2px 12px #a6912d55',
            WebkitTextStroke: '2.5px #1a1302b0',
            lineHeight: 1.08,
            marginTop: 18,
            zIndex: 4,
            filter: 'drop-shadow(0 2px 22px #D4AF3750)'
          }}
        >
          VERITAS
        </span>
      )}
    </div>
  );
}
