// src/utils/ocrParser.ts

export interface ParsedExpense {
  isFailed: boolean;
  amount: number | null;
  isAmountAmbiguous: boolean;
  payee: string | null;
  date: string | null;
  upiRef: string | null;
  rawText: string;
}

/**
 * PLUG IN YOUR OCR SERVICE HERE.
 * This is a mock function. In production, pass the image URI to
 * Google Cloud Vision, ML Kit, or a Cloud Function.
 */
export async function extractTextFromImage(imageUri: string): Promise<string> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000));
  
  // Mock OCR text for testing. In reality, this comes from the API.
  return `
    Payment Successful
    ₹ 450.00
    Paid to Rahul Sharma
    UPI Ref: 123456789012
    Date: 24 Oct 2026
  `;
}

export function parseUPIText(text: string): ParsedExpense {
  const lowerText = text.toLowerCase();
  
  // 1. Check for Failure
  const isFailed = 
    lowerText.includes("failed") || 
    lowerText.includes("declined") || 
    lowerText.includes("unsuccessful") ||
    lowerText.includes("विफल");

  // 2. Extract Amounts
  // Matches ₹ 450, Rs. 450, 450.00 INR, 450 रुपये
  const amountRegex = /(?:₹|rs\.?|inr|रुपये)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi;
  const matches = [...text.matchAll(amountRegex)];
  
  let amount: number | null = null;
  let isAmountAmbiguous = false;

  if (matches.length > 0) {
    // Parse all found amounts
    const amounts = matches.map(m => parseFloat(m[1].replace(/,/g, "")));
    // Get unique amounts
    const uniqueAmounts = [...new Set(amounts)];
    
    amount = uniqueAmounts[0];
    if (uniqueAmounts.length > 1) {
      isAmountAmbiguous = true;
    }
  }

  // 3. Extract Date
  const dateRegex = /([0-9]{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+[0-9]{4})|([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i;
  const dateMatch = text.match(dateRegex);
  const date = dateMatch ? dateMatch[0] : null;

  // 4. Extract UPI Ref (Typically 12 digits)
  const refRegex = /(?:upi\s*ref|ref\s*no|txn\s*id)[^\d]*([0-9]{12})/i;
  const refMatch = text.match(refRegex);
  const upiRef = refMatch ? refMatch[1] : null;

  // 5. Extract Payee
  const payeeRegex = /(?:paid\s*to|to)\s+([A-Za-z\s]{2,30})/i;
  const payeeMatch = text.match(payeeRegex);
  const payee = payeeMatch ? payeeMatch[1].trim() : null;

  return {
    isFailed,
    amount,
    isAmountAmbiguous,
    payee,
    date,
    upiRef,
    rawText: text
  };
}