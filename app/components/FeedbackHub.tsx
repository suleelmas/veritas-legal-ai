"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackHubProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  gold: string;
  darkBlue: string;
  midBlue: string;
  lightText: string;
  userEmail?: string;
}

export default function FeedbackHub({
  isOpen,
  onClose,
  language,
  gold,
  darkBlue,
  midBlue,
  lightText,
  userEmail
}: FeedbackHubProps) {
  const [email, setEmail] = useState(userEmail || '');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && userEmail) {
      setEmail(userEmail);
    }
  }, [isOpen, userEmail]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!suggestion.trim()) {
      alert(language === 'TR' ? 'Lütfen önerinizi girin.' : 'Please enter your suggestion.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/request-feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email || 'Anonim',
          suggestion: suggestion.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit suggestion');
      }

      setSuccess(true);
      setSuggestion('');
      setEmail(userEmail || '');
      
      // 2 saniye sonra kapat
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      alert(error.message || (language === 'TR' 
        ? 'Öneri gönderilirken bir sorun oluştu.' 
        : 'An error occurred while submitting your suggestion.'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setSuggestion('');
    setEmail(userEmail || '');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000
            }}
          />
          
          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: '500px',
              background: darkBlue,
              borderLeft: `2px solid ${gold}`,
              boxShadow: `-8px 0 32px rgba(0, 0, 0, 0.5)`,
              zIndex: 10001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: `1px solid ${gold}33`,
              background: `linear-gradient(135deg, ${midBlue}, ${darkBlue})`
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h2 style={{
                  color: gold,
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  margin: 0
                }}>
                  {language === 'TR' ? 'İstek & Öneri' : 'Feedback Hub'}
                </h2>
                <button
                  onClick={handleClose}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: lightText,
                    fontSize: '28px',
                    cursor: 'pointer',
                    padding: '0',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.7,
                    transition: 'all 0.2s',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.background = `${gold}22`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.7';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  ×
                </button>
              </div>
              <p style={{
                color: lightText,
                fontSize: '0.9rem',
                margin: 0,
                opacity: 0.8,
                lineHeight: '1.5'
              }}>
                {language === 'TR' 
                  ? 'Veritas Q-AI\'da ne görmek istersiniz? (Yeni ülkeler, daha hızlı analiz, özel hukuk araçları...)'
                  : 'What would you like to see in Veritas Q-AI? (New countries, faster analysis, specific legal tools...)'}
              </p>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto'
            }}>
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    textAlign: 'center',
                    padding: '40px 20px'
                  }}
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: 0
                    }}
                    style={{
                      fontSize: '4rem',
                      marginBottom: '20px'
                    }}
                  >
                    ✨
                  </motion.div>
                  <h3 style={{
                    color: gold,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    marginBottom: '16px'
                  }}>
                    {language === 'TR' ? 'Teşekkürler!' : 'Thank You!'}
                  </h3>
                  <p style={{
                    color: lightText,
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    opacity: 0.9
                  }}>
                    {language === 'TR' 
                      ? 'Öneriniz ekibimize iletildi. Geri bildiriminiz için teşekkürler!'
                      : 'Thank you! Your suggestion has been beamed to our core team.'}
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}>
                  {/* Email Input */}
                  <div>
                    <label style={{
                      display: 'block',
                      color: lightText,
                      marginBottom: '10px',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      {language === 'TR' ? 'E-posta (Opsiyonel)' : 'Email (Optional)'}
                      <span style={{
                        color: '#666',
                        fontSize: '0.85rem',
                        fontWeight: 'normal',
                        marginLeft: '6px'
                      }}>
                        {language === 'TR' ? '- Dönüş yapabilmemiz için' : '- So we can get back to you'}
                      </span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === 'TR' ? 'ornek@email.com' : 'example@email.com'}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: midBlue,
                        border: `2px solid ${gold}66`,
                        borderRadius: '10px',
                        color: lightText,
                        fontSize: '15px',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = gold;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${gold}22`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = `${gold}66`;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Suggestion Textarea */}
                  <div>
                    <label style={{
                      display: 'block',
                      color: lightText,
                      marginBottom: '10px',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      {language === 'TR' ? 'Öneri / Düşünce *' : 'Suggestion / Idea *'}
                    </label>
                    <textarea
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                      placeholder={language === 'TR' 
                        ? 'Örneğin: "Fransa hukuku desteği eklenebilir mi?" veya "Analiz süresini kısaltmak için...'
                        : 'E.g., "Can you add France legal support?" or "To speed up analysis..."'}
                      required
                      rows={8}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: midBlue,
                        border: `2px solid ${gold}66`,
                        borderRadius: '10px',
                        color: lightText,
                        fontSize: '15px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        minHeight: '150px'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = gold;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${gold}22`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = `${gold}66`;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: gold,
                      border: 'none',
                      borderRadius: '10px',
                      color: darkBlue,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s',
                      opacity: loading ? 0.6 : 1,
                      boxShadow: `0 4px 20px ${gold}44`,
                      marginTop: '10px'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = '#d4c08a';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 6px 25px ${gold}66`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = gold;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = `0 4px 20px ${gold}44`;
                      }
                    }}
                  >
                    {loading 
                      ? (language === 'TR' ? 'Gönderiliyor...' : 'Sending...')
                      : (language === 'TR' ? 'Geliştiricilere Gönder' : 'Send to Developers')
                    }
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

