import React from 'react';
import { Film, Music, Scissors, Repeat, Clock } from 'lucide-react';
import type { DurationMode, MediaMetadata } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface DurationSelectorProps {
  durationMode: DurationMode;
  customDuration?: number;
  videoMeta: MediaMetadata | null;
  audioMeta: MediaMetadata | null;
  audioStartOffset: number;
  onDurationModeChange: (mode: DurationMode) => void;
  onCustomDurationChange: (sec: number) => void;
}

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  durationMode,
  customDuration = 10,
  videoMeta,
  audioMeta,
  audioStartOffset,
  onDurationModeChange,
  onCustomDurationChange,
}) => {
  const { t } = useTranslation();
  const videoDur = videoMeta?.duration || 0;
  const audioDur = Math.max(0, (audioMeta?.duration || 0) - audioStartOffset);

  const formatSec = (s: number) => {
    if (!s) return '0.0s';
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const cards: {
    id: DurationMode;
    title: string;
    description: string;
    calculatedText: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: 'video',
      title: t('videoLength'),
      description: t('videoLengthDesc'),
      calculatedText: videoDur > 0 ? formatSec(videoDur) : 'Auto',
      icon: <Film className="w-4 h-4" />,
      badge: t('recommended'),
    },
    {
      id: 'audio',
      title: t('audioLength'),
      description: t('audioLengthDesc'),
      calculatedText: audioDur > 0 ? formatSec(audioDur) : 'Auto',
      icon: <Music className="w-4 h-4" />,
      badge: audioDur > videoDur && videoDur > 0 ? t('videoWillLoop') : undefined,
    },
    {
      id: 'shortest',
      title: t('shortestStream'),
      description: t('shortestStreamDesc'),
      calculatedText: videoDur > 0 && audioDur > 0 ? formatSec(Math.min(videoDur, audioDur)) : 'Auto',
      icon: <Scissors className="w-4 h-4" />,
    },
    {
      id: 'longest',
      title: t('longestStream'),
      description: t('longestStreamDesc'),
      calculatedText: videoDur > 0 && audioDur > 0 ? formatSec(Math.max(videoDur, audioDur)) : 'Auto',
      icon: <Repeat className="w-4 h-4" />,
    },
    {
      id: 'custom',
      title: t('customDuration'),
      description: t('customDurationDesc'),
      calculatedText: `${customDuration}s`,
      icon: <Clock className="w-4 h-4" />,
    },
  ];

  return (
    <div className="bg-[#121212] border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono mb-1">
            {t('masterLengthProtocol')}
          </label>
          <h3 className="text-xl font-serif-italic font-light text-white">
            {t('targetTimelineStrategy')}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((card) => {
          const isSelected = durationMode === card.id;
          return (
            <div
              key={card.id}
              onClick={() => onDurationModeChange(card.id)}
              className={`p-4 border cursor-pointer transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-[#C69C6D] bg-white/10 text-white'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/70'
              }`}
            >
              {card.badge && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-mono tracking-widest uppercase border border-[#C69C6D]/40 text-[#C69C6D] bg-[#C69C6D]/10">
                  {card.badge}
                </span>
              )}

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`p-1 ${isSelected ? 'text-[#C69C6D]' : 'text-white/40'}`}>
                    {card.icon}
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    {card.title}
                  </h4>
                </div>

                <p className="text-[10px] text-white/50 leading-relaxed mb-3">
                  {card.description}
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/40 uppercase">{t('duration')}:</span>
                <span className="font-bold text-[#C69C6D]">{card.calculatedText}</span>
              </div>
            </div>
          );
        })}
      </div>

      {durationMode === 'custom' && (
        <div className="mt-4 p-4 border border-white/10 bg-white/[0.02] flex items-center justify-between">
          <label className="text-xs font-mono uppercase tracking-widest text-white/80 flex items-center">
            <Clock className="w-4 h-4 text-[#C69C6D] mr-2" />
            {t('customDurationLimit')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={customDuration}
              onChange={(e) => onCustomDurationChange(Math.max(0.1, parseFloat(e.target.value) || 1))}
              className="w-28 px-3 py-1.5 bg-black border border-white/20 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#C69C6D]"
            />
            <span className="text-xs font-mono text-white/40">SEC</span>
          </div>
        </div>
      )}
    </div>
  );
};
