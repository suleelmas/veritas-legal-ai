"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface ComparisonResultProps {
  result: string;
  differences?: Array<{
    section: string;
    changeType: string;
    riskImpact: string;
    description: string;
  }>;
  isCrossLanguage?: boolean;
  gold: string;
  darkBlue: string;
  midBlue: string;
  lightText: string;
  language: string;
  file1Name?: string;
  file2Name?: string;
}

export default function ComparisonResult({
  result,
  differences = [],
  isCrossLanguage = false,
  gold,
  darkBlue,
  midBlue,
  lightText,
  language,
  file1Name,
  file2Name
}: ComparisonResultProps) {
  if (!result) return null;

  const getChangeTypeColor = (changeType: string) => {
    if (changeType.toLowerCase().includes('eklendi') || changeType.toLowerCase().includes('added')) {
      return '#4ade80'; // Yeşil
    }
    if (changeType.toLowerCase().includes('silindi') || changeType.toLowerCase().includes('removed') || changeType.toLowerCase().includes('deleted')) {
      return '#ef4444'; // Kırmızı
    }
    if (changeType.toLowerCase().includes('değiştirildi') || changeType.toLowerCase().includes('changed') || changeType.toLowerCase().includes('modified')) {
      return '#fbbf24'; // Sarı
    }
    return gold;
  };

  const getRiskImpactColor = (riskImpact: string) => {
    if (riskImpact.toLowerCase().includes('artmış') || riskImpact.toLowerCase().includes('increased') || riskImpact.toLowerCase().includes('higher')) {
      return '#ef4444'; // Kırmızı
    }
    if (riskImpact.toLowerCase().includes('azalmış') || riskImpact.toLowerCase().includes('decreased') || riskImpact.toLowerCase().includes('lower')) {
      return '#4ade80'; // Yeşil
    }
    return '#fbbf24'; // Sarı (değişmedi)
  };

  return (
    <div style={{
      marginTop: '30px',
      background: '#1a1f2e',
      padding: '30px',
      borderRadius: '15px',
      border: `1px solid ${gold}44`
    }}>
      <h3 style={{ color: gold, marginBottom: '20px', fontSize: '1.5rem' }}>
        {language === 'TR' ? 'Dosya Karşılaştırma Sonuçları' : 'Document Comparison Results'}
      </h3>

      {/* Cross-Language Badge */}
      {isCrossLanguage && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 20px',
          background: `linear-gradient(135deg, ${gold}22, ${gold}11)`,
          borderRadius: '10px',
          border: `2px solid ${gold}`,
          textAlign: 'center'
        }}>
          <span style={{
            color: gold,
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}>
            ⚛️ {language === 'TR' ? 'Çapraz Dil Karşılaştırması (Quantum Global)' : 'Cross-Language Comparison (Quantum Global)'}
          </span>
        </div>
      )}

      {/* File Names */}
      {(file1Name || file2Name) && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: darkBlue,
          borderRadius: '10px',
          border: `1px solid ${gold}33`
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px'
          }}>
            <div>
              <div style={{ color: gold, fontSize: '0.85rem', marginBottom: '5px', fontWeight: 'bold' }}>
                {language === 'TR' ? 'İlk Dosya:' : 'Document 1:'}
              </div>
              <div style={{ color: lightText, fontSize: '0.9rem' }}>
                {file1Name || '-'}
              </div>
            </div>
            <div>
              <div style={{ color: gold, fontSize: '0.85rem', marginBottom: '5px', fontWeight: 'bold' }}>
                {language === 'TR' ? 'İkinci Dosya:' : 'Document 2:'}
              </div>
              <div style={{ color: lightText, fontSize: '0.9rem' }}>
                {file2Name || '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Differences Table */}
      {differences && differences.length > 0 && (
        <div style={{
          marginBottom: '30px',
          overflowX: 'auto'
        }}>
          <h4 style={{
            color: gold,
            fontSize: '1.2rem',
            marginBottom: '15px',
            fontWeight: 'bold'
          }}>
            {language === 'TR' ? 'Tespit Edilen Farklar' : 'Detected Differences'}
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {differences.map((diff, idx) => {
              const changeColor = getChangeTypeColor(diff.changeType);
              const riskColor = getRiskImpactColor(diff.riskImpact);
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  style={{
                    padding: '20px',
                    background: darkBlue,
                    borderRadius: '12px',
                    border: `2px solid ${changeColor}66`,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 2fr',
                    gap: '15px',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{
                      color: gold,
                      fontSize: '0.8rem',
                      marginBottom: '5px',
                      fontWeight: 'bold'
                    }}>
                      {language === 'TR' ? 'Madde/Bölüm' : 'Section'}
                    </div>
                    <div style={{
                      color: lightText,
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}>
                      {diff.section}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      color: gold,
                      fontSize: '0.8rem',
                      marginBottom: '5px',
                      fontWeight: 'bold'
                    }}>
                      {language === 'TR' ? 'Değişiklik Tipi' : 'Change Type'}
                    </div>
                    <div style={{
                      color: changeColor,
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      padding: '4px 10px',
                      background: `${changeColor}22`,
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      {diff.changeType}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      color: gold,
                      fontSize: '0.8rem',
                      marginBottom: '5px',
                      fontWeight: 'bold'
                    }}>
                      {language === 'TR' ? 'Risk Etkisi' : 'Risk Impact'}
                    </div>
                    <div style={{
                      color: riskColor,
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      padding: '4px 10px',
                      background: `${riskColor}22`,
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      {diff.riskImpact}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      color: gold,
                      fontSize: '0.8rem',
                      marginBottom: '5px',
                      fontWeight: 'bold'
                    }}>
                      {language === 'TR' ? 'Açıklama' : 'Description'}
                    </div>
                    <div style={{
                      color: lightText,
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}>
                      {diff.description}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Comparison Text */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: darkBlue,
        borderRadius: '12px',
        border: `1px solid ${gold}33`
      }}>
        <h4 style={{
          color: gold,
          fontSize: '1.2rem',
          marginBottom: '15px',
          fontWeight: 'bold'
        }}>
          {language === 'TR' ? 'Detaylı Karşılaştırma Raporu' : 'Detailed Comparison Report'}
        </h4>
        <div style={{
          color: lightText,
          whiteSpace: 'pre-wrap',
          textAlign: 'left',
          lineHeight: '1.8',
          fontSize: '0.95rem'
        }}>
          {result}
        </div>
      </div>
    </div>
  );
}

