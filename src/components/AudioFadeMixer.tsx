import React from 'react';
import { Volume2, VolumeX, Sliders, Layers } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface AudioFadeMixerProps {
  fadeInDuration: number;
  fadeOutDuration: number;
  audioVolume: number;
  replaceOriginalAudio: boolean;
  originalAudioVolume: number;
  onFadeInChange: (v: number) => void;
  onFadeOutChange: (v: number) => void;
  onVolumeChange: (v: number) => void;
  onReplaceOriginalAudioChange: (replace: boolean) => void;
  onOriginalVolumeChange: (v: number) => void;
}

export const AudioFadeMixer: React.FC<AudioFadeMixerProps> = ({
  fadeInDuration,
  fadeOutDuration,
  audioVolume,
  replaceOriginalAudio,
  originalAudioVolume,
  onFadeInChange,
  onFadeOutChange,
  onVolumeChange,
  onReplaceOriginalAudioChange,
  onOriginalVolumeChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-[#121212] border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono mb-1">
            {t('acousticDynamics')}
          </label>
          <h3 className="text-xl font-serif-italic font-light text-white">
            {t('fadeAndMixerTitle')}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fade Controls */}
        <div className="border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <h4 className="text-xs font-mono uppercase tracking-widest text-[#C69C6D] flex items-center">
            <Sliders className="w-3.5 h-3.5 mr-2" />
            {t('envelopeTransitions')}
          </h4>

          {/* Fade In */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest mb-1.5">
              <span className="text-white/70">{t('fadeInDuration')}</span>
              <span className="text-[#C69C6D] font-bold">{fadeInDuration.toFixed(1)}s</span>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={fadeInDuration}
                onChange={(e) => onFadeInChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 accent-[#C69C6D] cursor-pointer"
              />
              <div className="flex items-center space-x-1">
                {[0, 1, 2, 3, 5].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onFadeInChange(preset)}
                    className={`px-2 py-1 text-[9px] font-mono border transition-all ${
                      fadeInDuration === preset
                        ? 'border-[#C69C6D] bg-[#C69C6D]/20 text-[#C69C6D]'
                        : 'border-white/10 bg-black text-white/40 hover:text-white'
                    }`}
                  >
                    {preset}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fade Out */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest mb-1.5">
              <span className="text-white/70">{t('fadeOutDuration')}</span>
              <span className="text-[#C69C6D] font-bold">{fadeOutDuration.toFixed(1)}s</span>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={fadeOutDuration}
                onChange={(e) => onFadeOutChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 accent-[#C69C6D] cursor-pointer"
              />
              <div className="flex items-center space-x-1">
                {[0, 1, 2, 3, 5].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onFadeOutChange(preset)}
                    className={`px-2 py-1 text-[9px] font-mono border transition-all ${
                      fadeOutDuration === preset
                        ? 'border-[#C69C6D] bg-[#C69C6D]/20 text-[#C69C6D]'
                        : 'border-white/10 bg-black text-white/40 hover:text-white'
                    }`}
                  >
                    {preset}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Volume & Soundtrack Mixing */}
        <div className="border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <h4 className="text-xs font-mono uppercase tracking-widest text-[#C69C6D] flex items-center">
            <Volume2 className="w-3.5 h-3.5 mr-2" />
            {t('gainLevelsStrategy')}
          </h4>

          {/* Replacement Audio Volume */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest mb-1.5">
              <span className="text-white/70">{t('newTrackGain')}</span>
              <span className="text-[#C69C6D] font-bold">{audioVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={audioVolume}
              onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-white/20 accent-[#C69C6D] cursor-pointer"
            />
          </div>

          {/* Audio Strategy Toggle */}
          <div className="pt-2 border-t border-white/10">
            <label className="text-xs font-mono uppercase tracking-widest text-white/70 block mb-2">
              {t('origTrackTreatment')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onReplaceOriginalAudioChange(true)}
                className={`px-3 py-2 text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-2 border transition-all ${
                  replaceOriginalAudio
                    ? 'border-[#C69C6D] bg-[#C69C6D]/20 text-[#C69C6D]'
                    : 'border-white/10 bg-black text-white/50 hover:text-white'
                }`}
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>{t('muteOriginal')}</span>
              </button>

              <button
                type="button"
                onClick={() => onReplaceOriginalAudioChange(false)}
                className={`px-3 py-2 text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-2 border transition-all ${
                  !replaceOriginalAudio
                    ? 'border-[#C69C6D] bg-[#C69C6D]/20 text-[#C69C6D]'
                    : 'border-white/10 bg-black text-white/50 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('mixStreams')}</span>
              </button>
            </div>
          </div>

          {!replaceOriginalAudio && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest mb-1.5">
                <span className="text-white/70">{t('originalVideoGain')}</span>
                <span className="text-[#C69C6D] font-bold">{originalAudioVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={originalAudioVolume}
                onChange={(e) => onOriginalVolumeChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-white/20 accent-[#C69C6D] cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
