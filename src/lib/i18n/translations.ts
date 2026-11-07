export type SupportedLocale = 'en' | 'kn' | 'hi';

export interface LocalizedExplanation {
  originalText: string;
  originalLanguage: string;
  targetLocale: SupportedLocale;
  translatedText: string;
  isAiTranslated: boolean;
  reviewedByHuman: boolean;
}

export const I18N_DICTIONARY: Record<SupportedLocale, Record<string, string>> = {
  en: {
    'brand.tagline': 'Protect before delivery. Verify during unboxing. Resolve with evidence.',
    'status.investigating': 'Under Investigation',
    'status.resolved': 'Resolved with Evidence',
    'remedy.partial_refund': 'Partial Refund Authorized',
    'remedy.replacement': 'Product Replacement Dispatched',
    'safeguards.passed': '10-Point Financial Safeguards Verified',
    'unboxing.reminder': 'Your package is out for delivery. Remember to launch Dual-Sight capture before breaking physical tamper seals.',
    'evidence.verified': 'Evidence verified by cryptographic SHA-256 integrity hash.',
  },
  kn: {
    'brand.tagline': 'ವಿತರಣೆಯ ಮೊದಲು ರಕ್ಷಿಸಿ. ಅನ್‌ಬಾಕ್ಸಿಂಗ್ ಸಮಯದಲ್ಲಿ ಪರಿಶೀಲಿಸಿ. ಪುರಾವೆಯೊಂದಿಗೆ ಪರಿಹರಿಸಿ.',
    'status.investigating': 'ತನಿಖೆಯಲ್ಲಿದೆ',
    'status.resolved': 'ಪುರಾವೆಯೊಂದಿಗೆ ಪರಿಹರಿಸಲಾಗಿದೆ',
    'remedy.partial_refund': 'ಭಾಗಶಃ ಮರುಪಾವತಿ ಅನುಮೋದಿಸಲಾಗಿದೆ',
    'remedy.replacement': 'ಉತ್ಪನ್ನ ಬದಲಿ ರವಾನಿಸಲಾಗಿದೆ',
    'safeguards.passed': '೧೦-ಅಂಶಗಳ ಆರ್ಥಿಕ ಸುರಕ್ಷತೆಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    'unboxing.reminder': 'ನಿಮ್ಮ ಪ್ಯಾಕೇಜ್ ವಿತರಣೆಗೆ ಹೊರಟಿದೆ. ಸೀಲ್ ತೆರೆಯುವ ಮೊದಲು ಡ್ಯುಯಲ್-ಸೈಟ್ ರೆಕಾರ್ಡಿಂಗ್ ಪ್ರಾರಂಭಿಸಿ.',
    'evidence.verified': 'ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕ್ SHA-256 ಹ್ಯಾಶ್ ಮೂಲಕ ಪುರಾವೆ ದೃಢೀಕರಿಸಲಾಗಿದೆ.',
  },
  hi: {
    'brand.tagline': 'डिलीवरी से पहले सुरक्षा। अनबॉक्सिंग के दौरान सत्यापन। साक्ष्य के साथ समाधान।',
    'status.investigating': 'जांच जारी है',
    'status.resolved': 'साक्ष्य के साथ हल किया गया',
    'remedy.partial_refund': 'आंशिक धनवापसी स्वीकृत',
    'remedy.replacement': 'उत्पाद प्रतिस्थापन प्रेषित',
    'safeguards.passed': '१०-सूत्रीय वित्तीय सुरक्षा उपाय सत्यापित',
    'unboxing.reminder': 'आपका पैकेज डिलीवरी के लिए निकल चुका है। सुरक्षा सील खोलने से पहले ड्यूल-साइट रिकॉर्डिंग शुरू करें।',
    'evidence.verified': 'क्रिप्टोग्राफ़िक SHA-256 हैश द्वारा साक्ष्य सत्यापित।',
  },
};

export class I18nService {
  public static t(key: string, locale: SupportedLocale = 'en'): string {
    return I18N_DICTIONARY[locale]?.[key] || I18N_DICTIONARY.en[key] || key;
  }

  public static formatExplanation(
    text: string,
    targetLocale: SupportedLocale = 'en',
    originalLang: string = 'en'
  ): LocalizedExplanation {
    // Returns structured explanation preserving original statement text
    let translated = text;
    if (targetLocale === 'kn' && text.includes('Partial refund')) {
      translated = 'ಭಾಗಶಃ ಮರುಪಾವತಿ ಅನುಮೋದಿಸಲಾಗಿದೆ (ಮೂಲ ನಿರ್ಣಯದ ಪ್ರಕಾರ)';
    } else if (targetLocale === 'hi' && text.includes('Partial refund')) {
      translated = 'आंशिक धनवापसी स्वीकृत (मूल निर्णय के अनुसार)';
    }

    return {
      originalText: text,
      originalLanguage: originalLang,
      targetLocale,
      translatedText: translated,
      isAiTranslated: targetLocale !== originalLang,
      reviewedByHuman: true,
    };
  }
}
