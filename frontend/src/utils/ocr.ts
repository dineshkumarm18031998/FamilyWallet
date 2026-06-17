import * as SQLite from 'expo-sqlite';

// ============================================================
// OCR.SPACE API KEY
// 'helloworld' is OCR.space's PUBLIC DEMO KEY, shared globally by
// every app that follows their quickstart guide. It is rate-limited
// (~500 requests/day TOTAL across all users worldwide, and only
// accepts images under ~1MB). This is why receipt scanning and
// shared-screenshot detection fail intermittently with generic
// "Scan Failed" / "OCR Failed" errors.
//
// FIX: Get a free personal API key at https://ocr.space/ocrapi
// (free tier: 25,000 requests/month, up to 1MB per image, takes
// ~1 minute, no credit card required) and replace the value below.
// ============================================================
const OCR_API_KEY = 'helloworld';

export const processImageOCR = async (base64Image: string) => {
  try {
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'eng');
    formData.append('OCREngine', '2'); // Engine 2 handles screenshots/receipts better

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `OCR service returned HTTP ${response.status}. ${OCR_API_KEY === 'helloworld' ? 'You are using the shared demo API key, which is rate-limited globally - get your own free key at https://ocr.space/ocrapi' : 'Please try again.'}`
      };
    }

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      const errMsg = Array.isArray(result.ErrorMessage) ? result.ErrorMessage.join(', ') : (result.ErrorMessage || 'Unknown OCR error');
      return {
        success: false,
        error: `OCR processing failed: ${errMsg}. ${OCR_API_KEY === 'helloworld' ? 'You are using the shared demo API key, which is rate-limited globally - get your own free key at https://ocr.space/ocrapi' : ''}`
      };
    }

    const text = result.ParsedResults?.[0]?.ParsedText || "";

    if (!text || text.trim().length === 0) {
      return { success: false, error: 'No text could be detected in this image.' };
    }
    
    // 1. Amount Extraction (Max Value Heuristic)
    let finalAmount = 0;
    let explicitMatch = text.match(/(?:total|amount(?:\s*paid)?|sum|net|balance|grand\s*total|paid|sent)[\s:.-]*(?:₹|rs\.?|inr|[$£€?])?[\s\n]*([\d,]+(?:\.\d{1,2})?)/i) 
                      || text.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i)
                      || text.match(/[\n\s]((?:\d+,)*\d+\.\d{2})[\n\s]*$/);
                      
    if (explicitMatch) {
      finalAmount = parseFloat(explicitMatch[1].replace(/,/g, ''));
    } else {
      // Fallback: largest currency-marked number anywhere in the text.
      // This catches GPay/PhonePe/Paytm "Paid successfully" screenshots
      // where the amount appears in large text without a "Total"/"Amount" label.
      const allNumbers = text.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/gi);
      if (allNumbers && allNumbers.length > 0) {
        const vals = allNumbers.map((n: string) => parseFloat(n.replace(/[^\d.]/g, ''))).filter((n: number) => !isNaN(n));
        if (vals.length > 0) finalAmount = Math.max(...vals);
      } else {
        // Last resort: any standalone number with 1-2 decimals (e.g. "500.00")
        const decimalNumbers = text.match(/\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g);
        if (decimalNumbers && decimalNumbers.length > 0) {
          const vals = decimalNumbers.map((n: string) => parseFloat(n.replace(/,/g, ''))).filter((n: number) => !isNaN(n));
          if (vals.length > 0) finalAmount = Math.max(...vals);
        }
      }
    }
    
    // 2. UPI Details Extraction
    // Matches handles like "name@ybl", "9876543210@paytm", "merchant.name@okhdfcbank"
    let upiIdMatch = text.match(/[\w.-]+@[a-zA-Z]{2,}/i);
    let upiId = upiIdMatch ? upiIdMatch[0] : null;
    
    // 3. Merchant / Payee Name Extraction
    const textLines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 2);
    let merchantMatch = "Unknown Merchant";
    
    // Look for "To: NAME", "Paid to NAME", "Paid NAME" (common in GPay/PhonePe screenshots)
    for (const line of textLines) {
      let payeeMatch = line.match(/(?:to|paid to|paid from|sent to)[\s:]+([A-Za-z][A-Za-z\s.&'-]+)/i);
      if (payeeMatch && payeeMatch[1].trim().length > 2) {
        merchantMatch = payeeMatch[1].trim();
        break;
      }
    }
    
    // If no explicit "To:", fallback to first non-generic line
    if (merchantMatch === "Unknown Merchant") {
      for (const line of textLines) {
        const lowerLine = line.toLowerCase();
        if (!lowerLine.includes('tax invoice') && 
            !lowerLine.includes('receipt') && 
            !lowerLine.includes('cash memo') && 
            !lowerLine.includes('retail invoice') &&
            !lowerLine.includes('payment successful') &&
            !lowerLine.includes('transaction successful') &&
            !lowerLine.includes('completed') &&
            !/^[\d\W]+$/.test(line) &&
            !line.includes(upiId || '___')) { // don't use UPI ID as merchant name
          merchantMatch = line;
          break;
        }
      }
    }
    
    // 4. Auto Categorization
    let category = "Shopping";
    if (upiId) category = "Transfer";
    const lowerMerch = merchantMatch.toLowerCase();
    if (lowerMerch.includes('swiggy') || lowerMerch.includes('zomato')) category = "Food";
    if (lowerMerch.includes('airtel') || lowerMerch.includes('jio')) category = "Recharge";

    return {
      success: true,
      amount: finalAmount,
      merchant: merchantMatch,
      upiId: upiId,
      category: category,
      rawText: text
    };

  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error while contacting OCR service.' };
  }
};
