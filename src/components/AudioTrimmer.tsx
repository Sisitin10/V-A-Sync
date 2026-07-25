import React from 'react';
import { Music, Play, Clock } from 'lucide-react';
import type { MediaMetadata } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface AudioTrimmerProps {
  audioMeta: MediaMetadata | null;
  audioStartOffset: number;
  audioDelay: number;
  onOffsetChange: (offset: number) => void;
  onDelayChange: (delay: number) => void;
}

export const AudioTrimmer: React.FC<AudioTrimmerProps> = ({
  audioMeta,
  audioStartOffset,
  audioDelay,
  onOffsetChange,
  onDelayChange,
}) => {
  const { t } = useTranslation();
  const maxDuration = audioMeta?.duration || 300;

  const formatTimecode = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = (totalSeconds % 60).toFixed(2);
    const paddedSecs = parseFloat(secs) < 10 ? `0${secs}` : secs;
    return `${mins < 10 ? `0${mins}` : mins}:${paddedSecs}`;
  };

  const presets = [
    { label: '0s', value: 0 },
    { label: '5s', value: 5 },
    { label: '10s', value: 10 },
    { label: '15s', value: 15 },
    { label: '30s', value: 30 },
  ].filter((p) => p.value < maxDuration);

  return (
    <div className="bg-[#121212] border border-white/10 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono mb-1">
            {t('audioStartProtocol')}
          </label>
          <h3 className="text-xl font-serif-italic font-light text-white">
            {t('audioCueTitle')}
          </h3>
        </div>

        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1 font-mono text-xs text-[#C69C6D]">
          <Play className="w-3 h-3 fill-current text-[#C69C6D]" />
          <span>{t('cueAt')} {formatTimecode(audioStartOffset)}</span>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-white/50 mb-3">
          <span className="flex items-center text-white">
            <Music className="w-3.5 h-3.5 mr-2 text-[#C69C6D]" />
            {t('scrubberTitle')}
          </span>
          <span className="text-[#C69C6D]">
            {formatTimecode(audioStartOffset)} / {formatTimecode(maxDuration)}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={Math.max(0.1, maxDuration - 0.5)}
          step="0.1"
          value={audioStartOffset}
          onChange={(e) => onOffsetChange(parseFloat(e.target.value))}
          className="w-full accent-[#C69C6D] bg-white/20 h-1.5 cursor-pointer"
        />

        <div className="mt-4 flex items-center space-x-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{t('presets')}</span>
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onOffsetChange(preset.value)}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-all border ${
                Math.abs(audioStartOffset - preset.value) < 0.2
                  ? 'border-[#C69C6D] bg-[#C69C6D]/20 text-[#C69C6D]'
                  : 'border-white/10 bg-black text-white/60 hover:text-white hover:border-white/30'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-white/10 p-3 bg-white/[0.01] flex items-center justify-between">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-white block">
              {t('audioCueOffset')}
            </label>
            <p className="text-[10px] text-white/40 font-mono">{t('audioCueOffsetDesc')}</p>
          </div>
          <div className="flex items-center space-x-1">
            <input
              type="number"
              min="0"
              max={maxDuration}
              step="0.1"
              value={audioStartOffset}
              onChange={(e) => onOffsetChange(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 bg-black border border-white/20 px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#C69C6D]"
            />
            <span className="text-xs font-mono text-white/40">SEC</span>
          </div>
        </div>

        <div className="border border-white/10 p-3 bg-white/[0.01] flex items-center justify-between">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-white block flex items-center">
              <Clock className="w-3.5 h-3.5 text-[#C69C6D] mr-1.5" />
              {t('leadSilenceDelay')}
            </label>
            <p className="text-[10px] text-white/40 font-mono">{t('leadSilenceDelayDesc')}</p>
          </div>
          <div className="flex items-center space-x-1">
            <input
              type="number"
              min="0"
              max="60"
              step="0.1"
              value={audioDelay}
              onChange={(e) => onDelayChange(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-20 bg-black border border-white/20 px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#C69C6D]"
            />
            <span className="text-xs font-mono text-white/40">SEC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
