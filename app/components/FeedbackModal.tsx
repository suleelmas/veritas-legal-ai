"use client";
import React, { useState, useRef } from 'react';

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

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert(language === 'TR' ? 'Lütfen hata başlığı girin.' : 'Please enter a bug title.');
      return;
    }
    if (!description.trim()) {
      alert(language === 'TR' ? 'Lütfen hata açıklaması girin.' : 'Please enter a bug description.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(title, description, screenshot);
      setSuccess(true);
      // Form verilerini temizle ama modal'ı kapatma
      setTitle('');
      setDescription('');
      setScreenshot(null);
      setScreenshotPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      alert(language === 'TR' ? 'Hata bildirimi gönderilirken bir sorun oluştu.' : 'An error occurred while submitting the bug report.');
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
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: darkBlue,
          borderRadius: '15px',
          padding: '30px',
          maxWidth: '600px',
          width: '100%',
          border: `2px solid ${gold}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: gold, margin: 0, fontSize: '1.5rem' }}>
                {language === 'TR' ? 'Teşekkürler!' : 'Thank You!'}
              </h2>
              <button
                onClick={handleClose}
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
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                ×
              </button>
            </div>
            <div style={{ 
              padding: '20px', 
              background: '#232d3c', 
              borderRadius: '12px',
              border: `1px solid ${gold}44`,
              marginBottom: '20px'
            }}>
              <p style={{ 
                color: lightText, 
                fontSize: '16px', 
                lineHeight: '1.8',
                margin: 0,
                textAlign: 'center'
              }}>
                {language === 'TR' 
                  ? 'Harika! Hata raporun alındı. Beta sürecine katkın için teşekkürler. İncelememizden sonra Professional pakette geçerli VERITAS50 kodunu ödeme ekranında kullanabilirsin!'
                  : language === 'EN'
                  ? 'Great! Your bug report has been received. Thanks for contributing to our Beta. You can use the code VERITAS50 at checkout for a 50% discount on the Professional plan!'
                  : 'Great! Your bug report has been received. Thanks for contributing to our Beta. You can use the code VERITAS50 at checkout for a 50% discount on the Professional plan!'
                }
              </p>
              <div style={{
                marginTop: '20px',
                padding: '15px',
                background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
                borderRadius: '8px',
                border: `2px solid ${gold}`,
                textAlign: 'center'
              }}>
                <div style={{ 
                  color: gold, 
                  fontSize: '24px', 
                  fontWeight: '700',
                  letterSpacing: '2px',
                  fontFamily: 'monospace'
                }}>
                  VERITAS50
                </div>
                <div style={{ 
                  color: lightText, 
                  fontSize: '12px', 
                  marginTop: '8px',
                  opacity: 0.8
                }}>
                  {language === 'TR' ? 'Professional Paket için %50 İndirim' : '50% Off on Professional Plan'}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: gold,
                border: 'none',
                borderRadius: '8px',
                color: darkBlue,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#d4c08a';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = gold;
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {language === 'TR' ? 'Kapat' : 'Close'}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: gold, margin: 0, fontSize: '1.5rem' }}>
                {language === 'TR' ? 'Hata Bildir' : 'Report Bug'}
              </h2>
              <button
                onClick={handleClose}
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
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: lightText, marginBottom: '8px', fontWeight: '500' }}>
              {language === 'TR' ? 'Hata Başlığı *' : 'Bug Title *'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'TR' ? 'Örn: Giriş sayfasında buton çalışmıyor' : 'E.g., Login button not working'}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#232d3c',
                border: `1px solid ${gold}44`,
                borderRadius: '8px',
                color: lightText,
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: lightText, marginBottom: '8px', fontWeight: '500' }}>
              {language === 'TR' ? 'Hata Açıklaması *' : 'Bug Description *'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'TR' ? 'Hatanın ne olduğunu ve nasıl oluştuğunu açıklayın...' : 'Describe what the bug is and how it occurred...'}
              required
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                background: '#232d3c',
                border: `1px solid ${gold}44`,
                borderRadius: '8px',
                color: lightText,
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', color: lightText, marginBottom: '8px', fontWeight: '500' }}>
              {language === 'TR' ? 'Ekran Görüntüsü (Opsiyonel)' : 'Screenshot (Optional)'}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '10px',
                background: '#232d3c',
                border: `1px solid ${gold}44`,
                borderRadius: '8px',
                color: lightText,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            />
            {screenshotPreview && (
              <div style={{ marginTop: '12px' }}>
                <img
                  src={screenshotPreview}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    border: `1px solid ${gold}44`
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setScreenshot(null);
                    setScreenshotPreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  style={{
                    marginTop: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ff6b6b',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textDecoration: 'underline'
                  }}
                >
                  {language === 'TR' ? 'Kaldır' : 'Remove'}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: `1px solid ${gold}44`,
                borderRadius: '8px',
                color: lightText,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = gold;
                e.currentTarget.style.background = `${gold}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${gold}44`;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {language === 'TR' ? 'İptal' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: gold,
                border: 'none',
                borderRadius: '8px',
                color: darkBlue,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#d4c08a';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = gold;
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {loading 
                ? (language === 'TR' ? 'Gönderiliyor...' : 'Submitting...')
                : (language === 'TR' ? 'Gönder' : 'Submit')
              }
            </button>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
}

