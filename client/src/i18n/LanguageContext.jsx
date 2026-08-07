import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from './translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'financial_erp_language';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'ta' ? 'ta' : 'en';
  });

  const [isRippling, setIsRippling] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((lang) => {
    const nextLang = lang === 'ta' ? 'ta' : 'en';
    if (nextLang === language) return;

    // Trigger Ripple Wave animation (320ms)
    setIsRippling(true);

    setTimeout(() => {
      // Swap language at mid-point of ripple expansion
      setLanguageState(nextLang);

      setTimeout(() => {
        setIsRippling(false);
      }, 160);

    }, 160);
  }, [language]);

  // Falls back to English, then to the raw key
  const t = useCallback((key) => {
    return translations[language]?.[key] ?? translations.en?.[key] ?? key;
  }, [language]);

  const tStatus = useCallback((status) => {
    if (!status) return status;
    const key = `status.${status}`;
    return translations[language]?.[key] ?? translations.en?.[key] ?? status;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tStatus }}>
      {children}

      {/* ── Option 3: Ripple Wave Glow Overlay ── */}
      {isRippling && (
        <div className="lang-ripple-overlay">
          <div className="lang-ripple-circle" />
        </div>
      )}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
