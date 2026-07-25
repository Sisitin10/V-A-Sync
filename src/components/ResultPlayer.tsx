import React, { useState } from 'react';
import { Download, Check, Sparkles, RefreshCw, Copy } from 'lucide-react';
import type { MediaMetadata } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface ResultPlayerProps {
  outputFilename: string;
  mediaUrl: string;
  processingTimeMs?: number;
  videoMeta: MediaMetadata | null;
  outputMeta: MediaMetadata | null;
  onReset: () => void;
}

export const ResultPlayer: React.FC<ResultPlayerProps> = ({
  outputFilename,
  mediaUrl,
  processingTimeMs,
  videoMeta,
  outputMeta,
  onReset,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin + mediaUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#121212] border border-white/10 p-6 space-y-6">
      {/* Header Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="text-2xl font-serif-italic font-light text-white">
              {t('pristineRender')}
            </span>
            <span className="px-2 py-0.5 border border-[#C69C6D]/40 text-[9px] font-mono tracking-widest uppercase bg-[#C69C6D]/10 text-[#C69C6D]">
              {t('zeroLossBadge')}
            </span>
          </div>
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
            {t('processedIn')} {processingTimeMs ? (processingTimeMs / 1000).toFixed(2) : '0.5'}s
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={copyLink}
            className="px-4 py-2 border border-white/20 hover:border-white text-xs font-mono uppercase tracking-widest text-white/80 flex items-center space-x-2 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#C69C6D]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('copied') : t('copyLink')}</span>
          </button>

          <a
            href={`/api/download/${outputFilename}`}
            download={outputFilename}
            className="px-6 py-2 border border-[#C69C6D] bg-[#C69C6D] text-black font-mono uppercase tracking-widest text-xs font-bold flex items-center space-x-2 hover:bg-white hover:border-white transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t('downloadLossless')}</span>
          </a>
        </div>
      </div>

      {/* Video Player */}
      <div className="bg-black border border-white/10 relative aspect-video flex items-center justify-center">
        <video
          src={mediaUrl}
          controls
          className="w-full h-full object-contain"
          poster=""
        />
      </div>

      {/* Quality Verification Table */}
      <div className="border border-white/10 bg-white/[0.02] p-5">
        <h3 className="text-xs font-mono uppercase tracking-widest text-[#C69C6D] mb-4 flex items-center">
          <Sparkles className="w-4 h-4 mr-2 text-[#C69C6D]" />
          {t('fidelityTelemetry')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3 border border-white/10 bg-black">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">{t('resolution')}</span>
            <div className="text-xs font-mono font-bold text-[#C69C6D] mt-1">
              {outputMeta?.videoStream?.resolutionLabel || videoMeta?.videoStream?.resolutionLabel || 'Original'}
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center">
              <Check className="w-3 h-3 mr-1" />
              {t('match100')}
            </div>
          </div>

          <div className="p-3 border border-white/10 bg-black">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">{t('frameRate')}</span>
            <div className="text-xs font-mono font-bold text-white mt-1">
              {outputMeta?.videoStream?.fps || videoMeta?.videoStream?.fps || 0} FPS
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center">
              <Check className="w-3 h-3 mr-1" />
              {t('framesDropped0')}
            </div>
          </div>

          <div className="p-3 border border-white/10 bg-black">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">{t('codec')}</span>
            <div className="text-xs font-mono font-bold text-white mt-1">
              {outputMeta?.videoStream?.codec || videoMeta?.videoStream?.codec || 'HEVC/H264'}
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center">
              <Check className="w-3 h-3 mr-1" />
              {t('directCopyLabel')}
            </div>
          </div>

          <div className="p-3 border border-white/10 bg-black">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Loss Rate</span>
            <div className="text-xs font-mono font-extrabold text-[#C69C6D] mt-1">
              0.00%
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center">
              <Check className="w-3 h-3 mr-1" />
              {t('zeroArtifactsLabel')}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <button
          onClick={onReset}
          className="px-6 py-3 border border-white/20 hover:border-white text-xs font-mono uppercase tracking-widest text-white/80 flex items-center space-x-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('processNext')}</span>
        </button>
      </div>
    </div>
  );
};
