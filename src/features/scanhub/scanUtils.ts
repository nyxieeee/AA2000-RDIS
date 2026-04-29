import type { DocumentRecord, DocumentStatus, TaxType } from '../../types/document';

interface ExtractedLineItem {
  description?: string;
  qty?: number;
  price?: number;
  net?: number;
}

/** Groq vision system role: line-item descriptions must be literal OCR, not invented products. */
export const GROQ_RECEIPT_VISION_SYSTEM_PROMPT = `You are a receipt and invoice OCR engine. Output structured JSON when asked.

Line items (strict):
- Each lineItems[].description must be literal text visible on the document for that row — same words, not a paraphrase or "better" product name.
- Never invent retail products (meat cuts, snacks, drinks, sizes) you do not read on the paper. Wrong: outputting a specific burger or brand when the slip says "Assorted Items", "Miscellaneous", "Various", or similar.
- Sales invoices often have one handwritten or printed line under Particulars / Description / Items. If that is the only line, return exactly one lineItem and copy that line verbatim (including "Assorted Items").
- If a line is unreadable, use description "" and say so in notes — do not substitute a plausible product.`;

export function normalizeLineItemDescription(input?: string): string {
  const raw = (input || '').trim();
  if (!raw) return 'Item';
  const preserveCase = (replacement: string) => (match: string) =>
    match === match.toUpperCase()
      ? replacement.toUpperCase()
      : match[0] === match[0].toUpperCase()
        ? replacement[0].toUpperCase() + replacement.slice(1)
        : replacement;
  return raw
    // Ensure SKU code is separated from product text.
    .replace(/^(\d{5,7})([A-Za-z])/, '$1 $2')
    // Split letters/numbers boundaries: TrixPods160g -> Trix Pods 160 g
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    // Split uppercase acronym runs when next token starts as a word.
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2')
    // Split lower-to-upper boundaries: CacaoPudr -> Cacao Pudr
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Normalize common size units
    .replace(/\b(\d+)\s*(g|kg|mg|ml|l|oz|pcs?|pc|ct)\b/gi, '$1 $2')
    // Keep decimal quantities together
    .replace(/(\d)\s+\.\s+(\d)/g, '$1.$2')
    // Product-specific OCR corrections observed in receipts
    .replace(/\btrix\b/gi, preserveCase('twix'))
    .replace(/\bpudr\b/gi, preserveCase('pwdr'))
    // Normalize whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface ExtractedData {
  confidence?: number;
  taxType?: string;
  category?: string;
  vendor?: string;
  registeredAddress?: string;
  lineItems?: ExtractedLineItem[];
  totalAmount?: number;
  vatableSales?: number;
  vat?: number;
  documentType?: string;
  taxId?: string;
  paymentMethod?: string;
  documentNumber?: string;
  date?: string;
  notes?: string;
}

function detectTaxType(category?: string, vendor?: string): TaxType {
  const text = `${category ?? ''} ${vendor ?? ''}`.toLowerCase();
  if (/cinema|movie|amusement|entertainment|theatre|theater/.test(text)) return 'Amusement Tax';
  if (/zero.rated|export|overseas/.test(text)) return 'Zero-Rated';
  // Do not treat generic "food"/"grocery" category as tax-exempt — many VAT receipts use Food.
  if (/\bexempt\b|vat.?exempt|medicine|pharma|hospital|senior|pwd|person w\/ disability/i.test(text)) return 'Exempt';
  return 'VAT';
}

export function buildDocumentRecord(
  file: File | null,
  extracted: ExtractedData,
  base64: string,
  mediaType: string,
  fileName?: string,
): DocumentRecord {
  const confidence: number =
    typeof extracted.confidence === 'number' ? extracted.confidence : 60;
  const status: DocumentStatus = 'Auto OK';
  const taxType: TaxType =
    (extracted.taxType as TaxType) || detectTaxType(extracted.category, extracted.vendor);
  const isVatable = taxType === 'VAT';

  const rawLineItems =
    Array.isArray(extracted.lineItems) && extracted.lineItems.length > 0
      ? extracted.lineItems
      : null;
  const aiTotal: number =
    typeof extracted.totalAmount === 'number' && extracted.totalAmount > 0
      ? extracted.totalAmount
      : 0;
  const lineItemTotal = rawLineItems
    ? parseFloat(
        rawLineItems
          .reduce(
            (sum: number, li: ExtractedLineItem) =>
              sum + (Number(li.net) || Number(li.price) || 0),
            0,
          )
          .toFixed(2),
      )
    : 0;
  // Prefer explicit document total from the model (matches printed Total Payable). Never let
  // hallucinated line-item nets override the receipt total when both are present.
  const total: number =
    aiTotal > 0 ? aiTotal : lineItemTotal > 0 ? lineItemTotal : 0;

  let lineTotalMismatch = '';
  if (aiTotal > 0 && lineItemTotal > 0) {
    const maxT = Math.max(aiTotal, lineItemTotal);
    if (maxT > 0 && Math.abs(aiTotal - lineItemTotal) / maxT > 0.05) {
      lineTotalMismatch = `Line item nets sum to ${lineItemTotal} but document total is ${aiTotal}; verify line items against the image.`;
    }
  }

  const lineItems = rawLineItems
    ? rawLineItems.map((li: ExtractedLineItem, i: number) => ({
        id: String(i + 1),
        description: normalizeLineItemDescription(li.description),
        qty: Number(li.qty) || 1,
        price: Number(li.price) || Number(li.net) || 0,
        net: Number(li.net) || Number(li.price) || 0,
      }))
    : [{ id: '1', description: 'Extracted Item', qty: 1, price: total, net: total }];

  const vatableSales = isVatable
    ? typeof extracted.vatableSales === 'number'
      ? extracted.vatableSales
      : parseFloat((total / 1.12).toFixed(2))
    : 0;
  const vat = isVatable
    ? typeof extracted.vat === 'number'
      ? extracted.vat
      : parseFloat((total - vatableSales).toFixed(2))
    : 0;
  const zeroRatedSales = !isVatable ? total : 0;

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: file?.name ?? fileName ?? 'camera-capture.jpg',
    type: extracted.documentType || 'Receipt',
    vendor: extracted.vendor || 'Unknown Vendor',
    registeredAddress: extracted.registeredAddress || '',
    taxId:
      extracted.taxId && extracted.taxId.replace(/[^0-9-]/g, '').length >= 9
        ? extracted.taxId
        : '',
    category: extracted.category || 'Expense',
    paymentMethod: extracted.paymentMethod || '',
    taxType,
    docNum:
      extracted.documentNumber && extracted.documentNumber.length > 1
        ? extracted.documentNumber
        : '',
    total,
    confidence,
    status,
    date:
      extracted.date && /^\d{4}-\d{2}-\d{2}$/.test(extracted.date) ? extracted.date : '',
    lineItems,
    vatableSales: parseFloat(vatableSales.toFixed(2)),
    vat: parseFloat(vat.toFixed(2)),
    zeroRatedSales: parseFloat(zeroRatedSales.toFixed(2)),
    reviewReason: (() => {
      const parts: string[] = [];
      if (confidence < 80) {
        parts.push(`Confidence at ${confidence}%. ${extracted.notes || 'Manual review recommended.'}`);
      } else if (extracted.notes) {
        parts.push(extracted.notes);
      }
      if (lineTotalMismatch) parts.push(lineTotalMismatch);
      return parts.length ? parts.join(' ') : undefined;
    })(),
    imageData: base64,
    imageType: mediaType,
  };
}
