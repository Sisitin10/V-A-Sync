import React, { useEffect, useRef } from 'react';
import { Terminal, Play, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import type { ProcessingJob } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface ProcessingConsoleProps {
  job: ProcessingJob | null;
  isProcessing: boolean;
  canProcess: boolean;
  onStartProcessing: () => void;
}

export const ProcessingConsole: React.FC<ProcessingConsoleProps> = ({
  job,
  isProcessing,
  canProcess,
  onStartProcessing,
}) => {
  const { t } = useTranslation();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [job?.logs]);

  return (
    <div className="bg-[#121212] border border-white/10 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono mb-1">
            {t('productionEngine')}
          </label>
          <h3 className="text-xl font-serif-italic font-light text-white">
            {t('executeMultiplexing')}
          </h3>
        </div>

        <button
          onClick={onStartProcessing}
          disabled={!canProcess || isProcessing}
          className={`px-8 py-4 font-mono text-xs uppercase tracking-[0.2em] font-bold border transition-all flex items-center justify-center ${
            !canProcess || isProcessing
              ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
              : 'border-[#C69C6D] bg-[#C69C6D] text-black hover:bg-white hover:border-white active:scale-[0.99]'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>{t('remuxing')} ({job?.progressPercentage || 10}%)...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current mr-2" />
              <span>{t('initProcessing')}</span>
              <ShieldCheck className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-white/60 mb-2">
            <span className="flex items-center text-[#C69C6D]">
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
              {t('directCopyActive')}
            </span>
            <span className="text-[#C69C6D] font-bold">{job?.progressPercentage || 10}%</span>
          </div>
          <div className="w-full bg-white/10 h-1 overflow-hidden">
            <div
              className="bg-[#C69C6D] h-full transition-all duration-200"
              style={{ width: `${job?.progressPercentage || 10}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Real-time Terminal Log Window */}
      {job && (
        <div className="mt-4 bg-black border border-white/10 p-4 font-mono text-[11px] text-white/80">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] uppercase tracking-widest text-white/40">
            <div className="flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 text-[#C69C6D]" />
              <span>{t('consoleTelemetry')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                {job.status === 'processing' && (
                  <span className="animate-ping absolute inline-flex h-full w-full bg-[#C69C6D] opacity-75"></span>
                )}
                <span className={`relative inline-flex h-2 w-2 ${job.status === 'completed' ? 'bg-emerald-400' : job.status === 'failed' ? 'bg-red-500' : 'bg-[#C69C6D]'}`}></span>
              </span>
              <span className="uppercase text-[9px] font-bold text-[#C69C6D]">
                {job.status}
              </span>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
            {job.logs.map((log, idx) => (
              <div
                key={idx}
                className={`leading-relaxed ${
                  log.includes('[Error]')
                    ? 'text-red-400 font-bold'
                    : log.includes('[Success]')
                    ? 'text-[#C69C6D] font-bold'
                    : log.includes('[Lossless Engine]')
                    ? 'text-white'
                    : 'text-white/50'
                }`}
              >
                {log}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {job.status === 'failed' && job.errorMessage && (
            <div className="mt-3 p-3 bg-red-950/40 border border-red-500/30 text-red-400 font-mono text-[11px] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="break-all">{job.errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
