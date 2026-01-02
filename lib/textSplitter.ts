// RecursiveCharacterTextSplitter benzeri metin bölme
// Hukuki metinler için optimize edilmiş chunking

interface TextSplitterOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export class RecursiveCharacterTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(options: TextSplitterOptions = {}) {
    this.chunkSize = options.chunkSize || 1000; // Varsayılan 1000 karakter
    this.chunkOverlap = options.chunkOverlap || 200;
    
    // Hukuki metinler için özel ayırıcılar (öncelik sırasına göre)
    // Almanca için § paragraf işaretleri öncelikli
    this.separators = options.separators || [
      '\n\n§',          // Alman paragraf başlangıcı (en önemli - paragrafları bölme!)
      '\n§',            // Alman paragraf başlangıcı (tek satır)
      '\n\n',           // Paragraflar (en büyük birim)
      '\n',             // Satırlar
      '. ',             // Cümleler (nokta + boşluk)
      '; ',             // Yan cümleler
      ', ',             // Virgül + boşluk
      ' ',              // Kelimeler arası boşluk
      ''                // Son çare: karakter karakter
    ];
  }

  splitText(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Metni temizle
    text = text.trim();

    // Eğer metin chunk size'tan küçükse direkt döndür
    if (text.length <= this.chunkSize) {
      return [text];
    }

    return this._splitRecursive(text, this.separators);
  }

  private _splitRecursive(text: string, separators: string[]): string[] {
    const chunks: string[] = [];

    // Eğer separator kalmadıysa, karakter karakter böl
    if (separators.length === 0) {
      return this._splitByCharacters(text);
    }

    const separator = separators[0];
    const remainingSeparators = separators.slice(1);

    // Separator ile metni böl
    // Özel durum: § işareti için separator'ı korumak gerekir
    let splits: string[] = [];
    if (separator) {
      if (separator.includes('§')) {
        // § işareti için özel işlem: § işaretini koru
        // Örnek: '\n\n§' separator'ı için, § işaretini bir sonraki split ile birleştir
        const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = text.split(new RegExp(`(${escapedSeparator})`, 'g'));
        // Separator'ları bir sonraki part ile birleştir
        const merged: string[] = [];
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] === separator) {
            // Separator'ı bir sonraki part ile birleştir
            if (i + 1 < parts.length) {
              merged.push(separator + parts[i + 1]);
              i++; // Skip next
            } else {
              merged.push(separator);
            }
          } else if (parts[i].trim().length > 0) {
            merged.push(parts[i]);
          }
        }
        splits = merged;
      } else {
        splits = text.split(separator);
      }
    } else {
      splits = [text];
    }

    let currentChunk = '';
    let lastChunkEnd = '';

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const splitWithSeparator = separator ? split + separator : split;

      // Eğer tek split chunk size'tan büyükse, recursive olarak böl
      if (split.length > this.chunkSize) {
        // Mevcut chunk'ı kaydet
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          // Overlap için son kısmı sakla
          lastChunkEnd = this._getLastPart(currentChunk, this.chunkOverlap);
          currentChunk = lastChunkEnd;
        }

        // Büyük split'i recursive olarak böl
        const subChunks = this._splitRecursive(split, remainingSeparators);
        chunks.push(...subChunks.slice(0, -1)); // Son chunk'ı overlap için sakla
        if (subChunks.length > 0) {
          currentChunk = subChunks[subChunks.length - 1];
          if (separator) {
            currentChunk += separator;
          }
        }
      } else {
        // Yeni split'i ekle
        const potentialChunk = currentChunk + splitWithSeparator;

        if (potentialChunk.length <= this.chunkSize) {
          currentChunk = potentialChunk;
        } else {
          // Chunk doldu, kaydet ve yeni chunk başlat
          if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
            // Overlap için son kısmı sakla
            lastChunkEnd = this._getLastPart(currentChunk, this.chunkOverlap);
            currentChunk = lastChunkEnd + splitWithSeparator;
          } else {
            // Tek split bile chunk size'tan büyük, recursive olarak böl
            const subChunks = this._splitRecursive(split, remainingSeparators);
            chunks.push(...subChunks.slice(0, -1));
            if (subChunks.length > 0) {
              currentChunk = subChunks[subChunks.length - 1];
              if (separator) {
                currentChunk += separator;
              }
            }
          }
        }
      }
    }

    // Son chunk'ı ekle
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  private _splitByCharacters(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      chunks.push(text.substring(start, end));
      start = end - this.chunkOverlap;
    }

    return chunks;
  }

  private _getLastPart(text: string, length: number): string {
    if (text.length <= length) {
      return text;
    }
    return text.substring(text.length - length);
  }
}

// Convenience function
export function splitTextRecursively(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): string[] {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap
  });
  return splitter.splitText(text);
}

