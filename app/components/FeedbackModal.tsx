"use client";
import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { ct } from '@/lib/componentTranslations';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, screenshot: File | null) => Promise<void>;
  language: string;
  gold: string;
  darkBlue: string;
  lightText: string;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  language,
  gold,
  darkBlue,
  lightText
}: FeedbackModalProps) {
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (modalRef.current) {
        modalRef.current.style.setProperty('background', '#000000', 'important');
        modalRef.current.style.setProperty('background-color', '#000000', 'important');
        modalRef.current.style.setProperty('opacity', '1', 'important');
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(ct(language, 'fileTooLarge', { size: (file.size / 1024 / 1024).toFixed(2) }));
        e.target.value = '';
        return;
      }
      setScreenshot(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setScreenshotPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setScreenshotPreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert(ct(language, 'enterBugTitle'));
      return;
    }
    if (!description.trim()) {
      alert(ct(language, 'enterBugDescription'));
      return;
    }

    setLoading(true);
    try {
      await onSubmit(title, description, screenshot);
      setTitle('');
      setDescription('');
      setScreenshot(null);
      setScreenshotPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      handleClose();
    } catch (error) {
      console.error('Feedback submission error:', error);
      alert(ct(language, 'bugSubmitError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setTitle('');
    setDescription('');
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        style={{
          background: '#000000',
          backgroundColor: '#000000',
          opacity: 1,
          borderRadius: '15px',
          padding: '30px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          border: `2px solid ${gold}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.9), 0 0 0 1px ${gold}44`,
          position: 'relative',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: gold, margin: 0, fontSize: '1.5rem' }}>
                {ct(language, 'thankYou')}
              </h2>
              <button
                onClick={handleClose}
                aria-label={ct(language, 'close')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: lightText,
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.7,
                  transition: 'opacity 0.2s'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px', background: '#1a1a1a', borderRadius: '12px', border: `2px solid ${gold}66`, marginBottom: '24px' }}>
              <p style={{ color: lightText, fontSize: '16px', lineHeight: '1.8', margin: 0, textAlign: 'center' }}>
                {ct(language, 'bugSuccess')}
              </p>
              <div style={{ marginTop: '20px', padding: '15px', background: `linear-gradient(135deg, ${gold}22, ${gold}11)`, borderRadius: '8px', border: `2px solid ${gold}`, textAlign: 'center' }}>
                <div style={{ color: gold, fontSize: '24px', fontWeight: '700', letterSpacing: '2px', fontFamily: 'monospace' }}>VERITAS50</div>
                <div style={{ color: lightText, fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>{ct(language, 'discountProfessional')}</div>
              </div>
            </div>
            <button onClick={handleClose} style={{ width: '100%', padding: '12px 20px', background: gold, border: 'none', borderRadius: '8px', color: darkBlue, cursor: 'pointer', fontSize: '14px', fontWeight: '700', transition: 'all 0.2s' }}>
              {ct(language, 'close')}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${gold}22, ${gold}11)`, border: `2px solid ${gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertCircle size={20} color={gold} strokeWidth={2.5} />
                </div>
                <h2 style={{ color: gold, margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{ct(language, 'reportBug')}</h2>
              </div>
              <button onClick={handleClose} aria-label={ct(language, 'close')} style={{ background: 'transparent', border: 'none', color: lightText, fontSize: '28px', cursor: 'pointer', padding: '0', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7, transition: 'all 0.2s', borderRadius: '6px' }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1', minHeight: 0 }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: lightText, marginBottom: '10px', fontWeight: '600', fontSize: '14px' }}>{ct(language, 'bugTitle')}</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ct(language, 'bugTitlePlaceholder')} required style={{ width: '100%', padding: '14px', background: '#1a1a1a', border: `2px solid ${gold}66`, borderRadius: '10px', color: lightText, fontSize: '15px', fontFamily: 'inherit', transition: 'all 0.2s', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: lightText, marginBottom: '10px', fontWeight: '600', fontSize: '14px' }}>{ct(language, 'bugDescription')}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={ct(language, 'bugDescriptionPlaceholder')} required style={{ width: '100%', minHeight: '140px', padding: '14px', background: '#1a1a1a', border: `2px solid ${gold}66`, borderRadius: '10px', color: lightText, fontSize: '15px', fontFamily: 'inherit', resize: 'vertical', transition: 'all 0.2s', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: lightText, marginBottom: '10px', fontWeight: '600', fontSize: '14px' }}>{ct(language, 'fileAttachment')}</label>
                <input ref={fileInputRef} type="file" accept="*/*" onChange={handleFileChange} style={{ width: '100%', padding: '12px', background: '#1a1a1a', border: `2px solid ${gold}44`, borderRadius: '10px', color: lightText, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box' }} />
                {screenshot && (
                  <div style={{ marginTop: '12px' }}>
                    {screenshotPreview ? (
                      <img src={screenshotPreview} alt={ct(language, 'previewAlt')} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: `1px solid ${gold}44` }} />
                    ) : (
                      <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '8px', border: `1px solid ${gold}44`, color: lightText, fontSize: '14px' }}>📎 {screenshot.name} ({(screenshot.size / 1024 / 1024).toFixed(2)} MB)</div>
                    )}
                    <button type="button" onClick={() => { setScreenshot(null); setScreenshotPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ marginTop: '8px', background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>{ct(language, 'remove')}</button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', flexShrink: 0 }}>
                <button type="button" onClick={onClose} style={{ padding: '12px 24px', background: 'transparent', border: `2px solid ${gold}44`, borderRadius: '10px', color: lightText, cursor: 'pointer', fontSize: '15px', fontWeight: '600', transition: 'all 0.2s' }}>{ct(language, 'cancel')}</button>
                <button type="submit" disabled={loading} style={{ padding: '14px 32px', background: gold, border: 'none', borderRadius: '10px', color: lightText, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', transition: 'all 0.3s', opacity: loading ? 0.6 : 1, boxShadow: `0 4px 20px ${gold}44`, position: 'relative', overflow: 'hidden' }}>
                  {loading ? (screenshot ? ct(language, 'uploadingFile') : ct(language, 'submitting')) : ct(language, 'send')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
