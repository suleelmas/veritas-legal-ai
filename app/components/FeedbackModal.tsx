"use client";
import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

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
      // Modal açıldığında body scroll'u dondur
      document.body.style.overflow = 'hidden';
      
      if (modalRef.current) {
        // Modal açıldığında arka planı zorla opak yap
        modalRef.current.style.setProperty('background', '#000000', 'important');
        modalRef.current.style.setProperty('background-color', '#000000', 'important');
        modalRef.current.style.setProperty('opacity', '1', 'important');
      }
    } else {
      // Modal kapandığında body scroll'u geri aç
      document.body.style.overflow = 'unset';
    }

    // Cleanup: Component unmount olduğunda veya modal kapandığında
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Dosya boyutu kontrolü (50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        alert(language === 'TR' 
          ? `Dosya boyutu çok büyük. Maksimum 50MB olmalıdır. (Mevcut: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
          : `File size is too large. Maximum 50MB allowed. (Current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        e.target.value = '';
        return;
      }
      
      // Herhangi bir dosya türünü kabul et (sadece resim değil)
      setScreenshot(file);
      
      // Eğer resim ise preview göster
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setScreenshotPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // Resim değilse preview'i temizle
        setScreenshotPreview(null);
      }
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
      // Form verilerini temizle
      setTitle('');
      setDescription('');
      setScreenshot(null);
      setScreenshotPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Modal'ı kapat - başarı mesajı toast olarak gösterilecek
      handleClose();
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
              padding: '24px', 
              background: '#1a1a1a', 
              borderRadius: '12px',
              border: `2px solid ${gold}66`,
              marginBottom: '24px'
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
                  border: `2px solid ${gold}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertCircle size={20} color={gold} strokeWidth={2.5} />
                </div>
                <h2 style={{ color: gold, margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {language === 'TR' ? 'Hata Bildir' : 'Report Bug'}
                </h2>
              </div>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1', minHeight: 0 }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: lightText, marginBottom: '10px', fontWeight: '600', fontSize: '14px' }}>
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
                padding: '14px',
                background: '#1a1a1a',
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
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: lightText, marginBottom: '10px', fontWeight: '600', fontSize: '14px' }}>
              {language === 'TR' ? 'Hata Açıklaması *' : 'Bug Description *'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'TR' ? 'Hatanın ne olduğunu ve nasıl oluştuğunu açıklayın...' : 'Describe what the bug is and how it occurred...'}
              required
              style={{
                width: '100%',
                minHeight: '140px',
                padding: '14px',
                background: '#1a1a1a',
                border: `2px solid ${gold}66`,
                borderRadius: '10px',
                color: lightText,
                fontSize: '15px',
                fontFamily: 'inherit',
                resize: 'vertical',
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

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: lightText, marginBottom: '10px', fontWeight: '600', fontSize: '14px' }}>
              {language === 'TR' ? 'Dosya Eki (Opsiyonel - Maks. 50MB)' : 'File Attachment (Optional - Max 50MB)'}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: `2px solid ${gold}44`,
                borderRadius: '10px',
                color: lightText,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = gold;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${gold}22`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = `${gold}44`;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {screenshot && (
              <div style={{ marginTop: '12px' }}>
                {screenshotPreview ? (
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
                ) : (
                  <div style={{
                    padding: '12px',
                    background: '#1a1a1a',
                    borderRadius: '8px',
                    border: `1px solid ${gold}44`,
                    color: lightText,
                    fontSize: '14px'
                  }}>
                    📎 {screenshot.name} ({(screenshot.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
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

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: `2px solid ${gold}44`,
                borderRadius: '10px',
                color: lightText,
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
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
                padding: '14px 32px',
                background: gold,
                border: 'none',
                borderRadius: '10px',
                color: lightText,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.3s',
                opacity: loading ? 0.6 : 1,
                boxShadow: `0 4px 20px ${gold}44`,
                position: 'relative',
                overflow: 'hidden'
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
                ? (language === 'TR' 
                    ? (screenshot ? 'Dosya Yükleniyor...' : 'Gönderiliyor...')
                    : (screenshot ? 'Uploading File...' : 'Submitting...'))
                : (language === 'TR' ? 'Gönder' : 'Send')
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

