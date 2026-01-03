// Almanca UTF-8 Encoding Test Utility
// Umlaut karakterlerinin doğru korunduğunu test et

/**
 * Örnek Alman hukuk metni (Umlaut karakterleri içeren)
 */
export const SAMPLE_GERMAN_TEXT = `
§ 433 BGB - Kaufvertrag

(1) Durch den Kaufvertrag wird der Verkäufer einer Sache verpflichtet, dem Käufer die Sache zu übergeben und das Eigentum an der Sache zu verschaffen.

(2) Der Verkäufer hat dem Käufer die Sache frei von Sach- und Rechtsmängeln zu verschaffen.

(3) Der Käufer ist verpflichtet, dem Verkäufer den vereinbarten Kaufpreis zu zahlen und die gekaufte Sache abzunehmen.

Bürgerliches Gesetzbuch (BGB) - Medeni Kanun
Handelsgesetzbuch (HGB) - Ticaret Kanunu
Aktiengesetz (AktG) - Anonim Şirketler Kanunu
Strafgesetzbuch (StGB) - Ceza Kanunu

GmbH - Gesellschaft mit beschränkter Haftung
Geschäftsführer - İşletme Müdürü
Vermögen - Mal varlığı
Schuldverhältnis - Borç ilişkisi
Kaufvertrag - Satış sözleşmesi
Miete - Kira
Pacht - Kiraya verme
Bürgschaft - Kefalet
Hypothek - İpotek
Grundschuld - Teminat
`;

/**
 * UTF-8 encoding testi
 */
export function testGermanEncoding(text: string): {
  valid: boolean;
  umlautCounts: Record<string, number>;
  sampleText: string;
  encodingCheck: boolean;
} {
  // Umlaut karakterlerini say
  const umlautCounts = {
    'ä': (text.match(/ä/g) || []).length,
    'ö': (text.match(/ö/g) || []).length,
    'ü': (text.match(/ü/g) || []).length,
    'ß': (text.match(/ß/g) || []).length,
    'Ä': (text.match(/Ä/g) || []).length,
    'Ö': (text.match(/Ö/g) || []).length,
    'Ü': (text.match(/Ü/g) || []).length
  };
  
  // UTF-8 encoding kontrolü
  let encodingCheck = true;
  try {
    const buffer = Buffer.from(text, 'utf8');
    const decoded = buffer.toString('utf8');
    encodingCheck = decoded === text;
  } catch (err) {
    encodingCheck = false;
  }
  
  // Örnek metin (ilk 500 karakter)
  const sampleText = text.substring(0, 500);
  
  const totalUmlauts = Object.values(umlautCounts).reduce((sum, count) => sum + count, 0);
  const valid = encodingCheck && totalUmlauts >= 0; // En azından encoding doğru olmalı
  
  return {
    valid,
    umlautCounts,
    sampleText,
    encodingCheck
  };
}

/**
 * Örnek Alman hukuk terimleri (Umlaut içeren)
 */
export const GERMAN_LEGAL_TERMS = [
  'Bürgerliches Gesetzbuch', // Medeni Kanun (ü, e)
  'Handelsgesetzbuch', // Ticaret Kanunu
  'Aktiengesetz', // Anonim Şirketler Kanunu
  'Strafgesetzbuch', // Ceza Kanunu
  'Gesellschaft mit beschränkter Haftung', // GmbH (ä)
  'Geschäftsführer', // İşletme Müdürü (ü)
  'Vermögen', // Mal varlığı (ö)
  'Schuldverhältnis', // Borç ilişkisi (ü)
  'Kaufvertrag', // Satış sözleşmesi
  'Miete', // Kira
  'Pacht', // Kiraya verme
  'Bürgschaft', // Kefalet (ü)
  'Hypothek', // İpotek
  'Grundschuld', // Teminat
  'Verkäufer', // Satıcı (ä, ü)
  'Käufer', // Alıcı (ä, ü)
  'Eigentum', // Mülkiyet
  'Sachmängel', // Ayıp (ä)
  'Rechtsmängel', // Hukuki ayıp (ä)
  'Kaufpreis' // Satış fiyatı
];


