import { isValid } from 'date-fns';

// ===============================
// CHARACTER NORMALIZATION
// ===============================
function normalizeOcrText(text: string): string {
  return text
    .toUpperCase()
    .replace(/O(?=\d)/g, '0')   // O before digit → 0
    .replace(/(?<=\d)O/g, '0')  // O after digit → 0
    .replace(/(?<=\d)I/g, '1')  // I after digit → 1
    .replace(/I(?=\d)/g, '1')   // I before digit → 1
    .replace(/(?<=\d)S/g, '5')  // S after digit → 5
    .replace(/(?<=\d)B/g, '8'); // B after digit → 8
}

// ===============================
// DATE PATTERNS
// ===============================
const DATE_PATTERNS = [
  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g,
  // YYYY/MM/DD, YYYY-MM-DD
  /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g,
  // DD/MM/YY
  /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})(?!\d)/g,
  // MM/YYYY, MM-YYYY
  /(\d{1,2})[\/\-](\d{4})/g,
  // MM/YY
  /(\d{1,2})[\/\-](\d{2})(?!\d)/g,
  // DDMMYYYY (e.g., 15012025)
  /(?<!\d)(\d{2})(\d{2})(\d{4})(?!\d)/g,
  // DDMMYY (e.g., 150125)
  /(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)/g,
  // DD MMM YYYY (e.g., 15 Jan 2025)
  /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{2,4})/g,
  // MMM DD YYYY
  /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{1,2}),?\s*(\d{2,4})/g,
  // DDMMMYYYY or DDMMMYY (e.g., 15JAN2025 or 15JAN25)
  /(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2,4})/g,
  // MMM/YYYY or MMM-YYYY
  /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\-]?(\d{2,4})/g,
];

const MONTH_MAP: Record<string, number> = {
  'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
};

const EXPIRY_KEYWORDS = [
  'EXP', 'EXPIRY', 'BEST BEFORE', 'USE BY', 'BB', 'VALID TILL', 'BEST BY', 'CONSUME BY',
  'E:', 'ED:', 'EXP.DATE', 'BBE', 'MFG', 'PROD' // MFG/PROD to differentiate or find nearby
];

// ===============================
// DATE CANDIDATE PARSER
// ===============================
function parseDateFromMatch(match: RegExpMatchArray): Date | null {
  try {
    let day: number, month: number, year: number;
    const parts = match.slice(1).filter(Boolean);

    // Handle month-name patterns
    const monthNamePart = parts.find(p => MONTH_MAP[p]);
    if (monthNamePart) {
      month = MONTH_MAP[monthNamePart];
      const numParts = parts.filter(p => !MONTH_MAP[p]).map(Number);
      if (numParts.length === 2) {
        // DDMMMYYYY or MMMDDYYYY
        if (numParts[1] > 31) {
          day = numParts[0];
          year = numParts[1];
        } else {
          day = numParts[0];
          year = numParts[1];
        }
      } else if (numParts.length === 1) {
        // MMM/YYYY
        day = 1;
        year = numParts[0];
      } else {
        return null;
      }
    } else {
      const nums = parts.map(Number);
      if (nums.length === 3) {
        if (nums[0] > 1000) {
          // YYYY/MM/DD
          year = nums[0]; month = nums[1]; day = nums[2] || 1;
        } else {
          // DD/MM/YYYY
          day = nums[0]; month = nums[1]; year = nums[2];
        }
      } else if (nums.length === 2) {
        // MM/YYYY
        month = nums[0]; year = nums[1]; day = 1;
      } else {
        return null;
      }
    }

    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    if (year < 2024 || year > 2100) return null;

    const date = new Date(year, month - 1, day);
    if (isValid(date) && date > new Date()) {
      return date;
    }
  } catch {
    // skip
  }
  return null;
}

// ===============================
// SCORED EXPIRY EXTRACTION
// ===============================
interface DateCandidate {
  date: Date;
  score: number;
  line: string;
}

export function extractExpiryDate(rawText: string): Date | null {
  const text = normalizeOcrText(rawText);
  const lines = text.split('\n');
  const candidates: DateCandidate[] = [];

  for (const line of lines) {
    let lineScore = 0;

    // Boost score if line contains expiry keywords
    if (EXPIRY_KEYWORDS.some(k => line.includes(k))) {
      lineScore += 3;
    }

    for (const pattern of DATE_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      const matches = line.matchAll(regex);
      for (const match of matches) {
        const date = parseDateFromMatch(match);
        if (date) {
          let score = lineScore;
          // Future dates get bonus
          if (date > new Date()) score += 2;
          candidates.push({ date, score, line });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // Sort by score descending, then by latest date
  candidates.sort((a, b) => b.score - a.score || b.date.getTime() - a.date.getTime());
  return candidates[0].date;
}

// ===============================
// IMAGE PREPROCESSING (Canvas)
// ===============================
export function preprocessImage(canvas: HTMLCanvasElement, video: HTMLVideoElement): ImageData[] {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, w, h);

  const original = ctx.getImageData(0, 0, w, h);
  const variants: ImageData[] = [];

  // Variant 1: Grayscale with contrast enhancement (CLAHE-like)
  const gray = new ImageData(new Uint8ClampedArray(original.data), w, h);
  for (let i = 0; i < gray.data.length; i += 4) {
    const avg = 0.299 * gray.data[i] + 0.587 * gray.data[i + 1] + 0.114 * gray.data[i + 2];
    // Simple contrast stretch
    const stretched = Math.min(255, Math.max(0, (avg - 128) * 1.5 + 128));
    gray.data[i] = gray.data[i + 1] = gray.data[i + 2] = stretched;
  }
  variants.push(gray);

  // Variant 2: Otsu-like binary threshold
  const binary = new ImageData(new Uint8ClampedArray(original.data), w, h);
  // Calculate histogram
  const hist = new Array(256).fill(0);
  for (let i = 0; i < binary.data.length; i += 4) {
    const g = Math.round(0.299 * binary.data[i] + 0.587 * binary.data[i + 1] + 0.114 * binary.data[i + 2]);
    hist[g]++;
  }
  // Find Otsu threshold
  const total = w * h;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * hist[i];
  let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVar) {
      maxVar = variance;
      threshold = t;
    }
  }
  for (let i = 0; i < binary.data.length; i += 4) {
    const g = Math.round(0.299 * binary.data[i] + 0.587 * binary.data[i + 1] + 0.114 * binary.data[i + 2]);
    const v = g > threshold ? 255 : 0;
    binary.data[i] = binary.data[i + 1] = binary.data[i + 2] = v;
  }
  variants.push(binary);

  // Variant 3: Inverted binary (white text on dark background)
  const inverted = new ImageData(new Uint8ClampedArray(binary.data), w, h);
  for (let i = 0; i < inverted.data.length; i += 4) {
    inverted.data[i] = 255 - inverted.data[i];
    inverted.data[i + 1] = 255 - inverted.data[i + 1];
    inverted.data[i + 2] = 255 - inverted.data[i + 2];
  }
  variants.push(inverted);

  return variants;
}

export async function createBlobFromImageData(canvas: HTMLCanvasElement, imageData: ImageData): Promise<Blob> {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/png', 1.0);
  });
}
