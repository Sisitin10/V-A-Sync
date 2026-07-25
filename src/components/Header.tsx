import React, { useState } from 'react';
import { ShieldCheck, Zap, Sparkles, Globe, Check, RotateCcw } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n/translations';

export const Header: React.FC = () => {
  const { language, isAutoSystem, setLanguage, resetToSystemLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="border-b border-white/10 bg-[#0F0F0F]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <span className="text-3xl font-serif-italic font-light tracking-tighter text-white">
              {t('appTitle')}
            </span>
            <span className="px-2 py-0.5 border border-white/20 text-[10px] tracking-[0.25em] uppercase font-mono text-[#C69C6D]">
              {t('appSub')}
            </span>
          </div>
          <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-white/10">
            <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-mono tracking-widest uppercase bg-[#C69C6D]/10 text-[#C69C6D] border border-[#C69C6D]/30">
              <ShieldCheck className="w-3 h-3 mr-1" />
              {t('directStreamCopy')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-[11px] uppercase tracking-[0.2em] font-medium text-white/70">
          <div className="hidden md:flex items-center space-x-4">
            <span className="flex items-center text-white/80">
              <Zap className="w-3.5 h-3.5 text-[#C69C6D] mr-1.5" />
              {t('zeroArtifacts')}
            </span>
            <span className="flex items-center text-white/80">
              <Sparkles className="w-3.5 h-3.5 text-white/60 mr-1.5" />
              {t('highFpsSupport')}
            </span>
          </div>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 border border-white/20 hover:border-[#C69C6D] bg-white/[0.03] hover:bg-white/[0.08] text-white transition-all text-[11px] font-mono uppercase tracking-widest"
            >
              <Globe className="w-3.5 h-3.5 text-[#C69C6D]" />
              <span>{currentLangObj.flag} {currentLangObj.code.toUpperCase()}</span>
              {isAutoSystem && (
                <span className="text-[9px] px-1 py-0.2 border border-[#C69C6D]/40 text-[#C69C6D] bg-[#C69C6D]/10">
                  {t('autoSystem')}
                </span>
              )}
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-[#141414] border border-white/20 shadow-2xl p-2 z-50 font-mono">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-2 pt-1 text-[10px] text-white/50 uppercase tracking-widest">
                    <span>{t('selectLanguage')}</span>
                    {!isAutoSystem && (
                      <button
                        onClick={() => {
                          resetToSystemLanguage();
                          setIsOpen(false);
                        }}
                        className="text-[#C69C6D] hover:text-white flex items-center"
                        title={t('systemLanguage')}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        {t('autoSystem')}
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSelected = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code as SupportedLanguage, true);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#C69C6D]/20 text-[#C69C6D] border border-[#C69C6D]/40'
                              : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span>{lang.flag}</span>
                            <span>{lang.nativeName}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#C69C6D]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
