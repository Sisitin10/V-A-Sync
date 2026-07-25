import React from 'react';
import { HardDrive, Cpu, Info, CheckCircle2 } from 'lucide-react';
import type { AudioCodecChoice, OutputContainer } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface LosslessSettingsProps {
  container: OutputContainer;
  audioCodec: AudioCodecChoice;
  onContainerChange: (c: OutputContainer) => void;
  onAudioCodecChange: (codec: AudioCodecChoice) => void;
}

export const LosslessSettings: React.FC<LosslessSettingsProps> = ({
  container,
  audioCodec,
  onContainerChange,
  onAudioCodecChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-[#121212] border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono mb-1">
            {t('streamCopySpec')}
          </label>
          <h3 className="text-xl font-serif-italic font-light text-white">
            {t('containerAndCodecTitle')}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Container Selection */}
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <label className="text-xs font-mono uppercase tracking-widest text-[#C69C6D] block mb-3 flex items-center">
            <HardDrive className="w-3.5 h-3.5 mr-2" />
            {t('containerMultiplexing')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'mp4', label: 'MP4 Stream', desc: 'Universal Playback' },
              { id: 'mkv', label: 'MKV Stream', desc: 'Supports Lossless FLAC' },
              { id: 'mov', label: 'MOV QuickTime', desc: 'ProRes / Final Cut' },
              { id: 'webm', label: 'WebM Format', desc: 'Web Browser Standard' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => onContainerChange(fmt.id as OutputContainer)}
                className={`p-3 border text-left transition-all ${
                  container === fmt.id
                    ? 'border-[#C69C6D] bg-[#C69C6D]/20 text-white'
                    : 'border-white/10 bg-black text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="text-xs font-mono uppercase font-bold">{fmt.label}</div>
                <div className="text-[10px] font-mono text-white/40 mt-0.5">{fmt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Audio Codec Selection */}
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <label className="text-xs font-mono uppercase tracking-widest text-[#C69C6D] block mb-3 flex items-center">
            <Cpu className="w-3.5 h-3.5 mr-2" />
            {t('acousticFidelity')}
          </label>
          <div className="space-y-2">
            {[
              { id: 'aac', label: 'Studio AAC (320 kbps)', desc: 'Pristine fidelity & universal compatibility' },
              { id: 'flac', label: 'FLAC Lossless (24-bit)', desc: 'Bit-perfect audio compression (best with MKV)' },
              { id: 'pcm_s24le', label: 'Uncompressed PCM (WAV)', desc: 'Raw uncompressed audio stream' },
            ].map((codec) => (
              <label
                key={codec.id}
                onClick={() => onAudioCodecChange(codec.id as AudioCodecChoice)}
                className={`flex items-center justify-between p-3 border cursor-pointer transition-all ${
                  audioCodec === codec.id
                    ? 'border-[#C69C6D] bg-[#C69C6D]/20 text-white'
                    : 'border-white/10 bg-black text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <div>
                  <div className="text-xs font-mono font-bold uppercase">{codec.label}</div>
                  <div className="text-[10px] font-mono text-white/40">{codec.desc}</div>
                </div>
                <div className={`w-4 h-4 border flex items-center justify-center ${audioCodec === codec.id ? 'border-[#C69C6D] bg-[#C69C6D] text-black' : 'border-white/20'}`}>
                  {audioCodec === codec.id && <CheckCircle2 className="w-3 h-3" />}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Stream-Copy Technical Breakdown Card */}
      <div className="p-4 bg-white/[0.02] border border-white/10">
        <div className="flex items-start space-x-3">
          <Info className="w-4 h-4 text-[#C69C6D] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-mono font-bold text-[#C69C6D] uppercase tracking-wider">
              {t('zeroReencodeProtocol')}
            </h4>
            <p className="text-xs text-white/60 mt-1 leading-relaxed font-mono">
              {t('zeroReencodeDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
