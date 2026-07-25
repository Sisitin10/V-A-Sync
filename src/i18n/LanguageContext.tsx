import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, translations } from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  isAutoSystem: boolean;
  setLanguage: (lang: SupportedLanguage, manualOverride?: boolean) => void;
  resetToSystemLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectSystemLanguage(): SupportedLanguage {
  if (typeof window === 'undefined' || !navigator) return 'en';

  const userLangs = navigator.languages || [navigator.language || 'en'];
  for (const langStr of userLangs) {
    const code = langStr.toLowerCase().split('-')[0] as SupportedLanguage;
    if (SUPPORTED_LANGUAGES.some((item) => item.code === code)) {
      return code;
    }
  }
  return 'en';
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [isAutoSystem, setIsAutoSystem] = useState<boolean>(true);

  useEffect(() => {
    // Check if user previously manually selected a language
    const savedLang = localStorage.getItem('vasync_user_language') as SupportedLanguage | null;
    if (savedLang && SUPPORTED_LANGUAGES.some((l) => l.code === savedLang)) {
      setLanguageState(savedLang);
      setIsAutoSystem(false);
    } else {
      const detected = detectSystemLanguage();
      setLanguageState(detected);
      setIsAutoSystem(true);
    }
  }, []);

  const setLanguage = (lang: SupportedLanguage, manualOverride = true) => {
    setLanguageState(lang);
    if (manualOverride) {
      setIsAutoSystem(false);
      localStorage.setItem('vasync_user_language', lang);
    }
  };

  const resetToSystemLanguage = () => {
    const detected = detectSystemLanguage();
    setLanguageState(detected);
    setIsAutoSystem(true);
    localStorage.removeItem('vasync_user_language');
  };

  const t = (key: string): string => {
    const dict = translations[language] || translations.en;
    return dict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isAutoSystem,
        setLanguage,
        resetToSystemLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
