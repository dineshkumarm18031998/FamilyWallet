import * as SQLite from 'expo-sqlite';

export const processImageOCR = async (base64Image: string) => {
  try {
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    formData.append('apikey', 'helloworld'); 
    formData.append('language', 'eng');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (result.IsErroredOnProcessing) {
      throw new Error("OCR Processing failed");
    }

    const text = result.ParsedResults?.[0]?.ParsedText || "";
    
    // 1. Amount Extraction (Max Value Heuristic)
    let finalAmount = 0;
    let explicitMatch = text.match(/(?:total|amount(?:\s*paid)?|sum|net|balance|grand\s*total|paid)[\s:.-]*(?:₹|rs\.?|inr|[$£€?])?[\s\n]*([\d,]+(?:\.\d{2})?)/i) 
                      || text.match(/(?:₹|rs\.?|inr|[$£€?])\s*([\d,]+(?:\.\d{2})?)/i)
                      || text.match(/[\n\s]((?:\d+,)*\d+\.\d{2})[\n\s]*$/);
                      
    if (explicitMatch) {
      finalAmount = parseFloat(explicitMatch[1].replace(/,/g, ''));
    } else {
      const allNumbers = text.match(/(?:\b|₹|rs\.?|inr)\s*([\d,]+(?:\.\d{2})?)\b/gi);
      if (allNumbers && allNumbers.length > 0) {
        const vals = allNumbers.map((n: string) => parseFloat(n.replace(/[^\d.]/g, ''))).filter((n: number) => !isNaN(n));
        if (vals.length > 0) finalAmount = Math.max(...vals);
      }
    }
    
    // 2. UPI Details Extraction
    let upiIdMatch = text.match(/[\w.-]+@[a-zA-Z]+/i);
    let upiId = upiIdMatch ? upiIdMatch[0] : null;
    
    // 3. Merchant / Payee Name Extraction
    const textLines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 2);
    let merchantMatch = "Unknown Merchant";
    
    // Look for "To: NAME" or "Paid to NAME" first
    for (const line of textLines) {
      let payeeMatch = line.match(/(?:to|paid to|paid from)[\s:]+([A-Za-z\s]+)/i);
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

  } catch (e) {
    return { success: false };
  }
};
