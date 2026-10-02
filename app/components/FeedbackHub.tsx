"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ct } from '@/lib/componentTranslations';

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

export default function FeedbackHub({ isOpen, onClose, language, gold, darkBlue, midBlue, lightText, userEmail }: FeedbackHubProps) {
  const [email, setEmail] = useState(userEmail || '');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && userEmail) setEmail(userEmail);
  }, [isOpen, userEmail]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) {
      alert(ct(language, 'enterSuggestion'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/request-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || 'Anonim', suggestion: suggestion.trim() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || ct(language, 'feedbackSubmitError'));

      setSuccess(true);
      setSuggestion('');
      setEmail(userEmail || '');
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      alert(error.message || ct(language, 'feedbackSubmitError'));
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} onClick={handleClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 10000 }} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '500px', background: darkBlue, borderLeft: `2px solid ${gold}`, boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)', zIndex: 10001, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${gold}33`, background: `linear-gradient(135deg, ${midBlue}, ${darkBlue})` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ color: gold, fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{ct(language, 'feedbackHub')}</h2>
                <button onClick={handleClose} aria-label={ct(language, 'close')}
                  style={{ background: 'transparent', border: 'none', color: lightText, fontSize: '28px', cursor: 'pointer', padding: 0, width: '32px', height: '32px', opacity: 0.7, borderRadius: '6px' }}>×</button>
              </div>
              <p style={{ color: lightText, fontSize: '0.9rem', margin: 0, opacity: 0.8, lineHeight: '1.5' }}>{ct(language, 'feedbackIntro')}</p>
            </div>

            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              {success ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✨</div>
                  <h3 style={{ color: gold, fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>{ct(language, 'thankYou')}</h3>
                  <p style={{ color: lightText, fontSize: '1rem', lineHeight: '1.6', opacity: 0.9 }}>{ct(language, 'feedbackSuccess')}</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', color: lightText, marginBottom: '10px', fontWeight: '600', fontSize: '14px' }}>
                      {ct(language, 'emailOptional')}
                      <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: 'normal', marginLeft: '6px' }}>{ct(language, 'emailReason')}</span>
                    </label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com"
                      style={{ width: '100%', padding: '14px', background: midBlue, border: `2px solid ${gold}66`, borderRadius: '10px', color: lightText, fontSize: '15px', boxSizing: 'border-box' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: lightText, marginBottom: '10px', fontWeight: '600', fontSize: '14px' }}>{ct(language, 'suggestionIdea')}</label>
                    <textarea value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder={ct(language, 'suggestionPlaceholder')} required rows={8}
                      style={{ width: '100%', padding: '14px', background: midBlue, border: `2px solid ${gold}66`, borderRadius: '10px', color: lightText, fontSize: '15px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', minHeight: '150px' }} />
                  </div>

                  <button type="submit" disabled={loading}
                    style={{ width: '100%', padding: '16px', background: gold, border: 'none', borderRadius: '10px', color: darkBlue, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', opacity: loading ? 0.6 : 1, boxShadow: `0 4px 20px ${gold}44`, marginTop: '10px' }}>
                    {loading ? ct(language, 'sending') : ct(language, 'sendDevelopers')}
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
