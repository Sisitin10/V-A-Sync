import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FileDropzone } from './components/FileDropzone';
import { DurationSelector } from './components/DurationSelector';
import { AudioTrimmer } from './components/AudioTrimmer';
import { AudioFadeMixer } from './components/AudioFadeMixer';
import { LosslessSettings } from './components/LosslessSettings';
import { ProcessingConsole } from './components/ProcessingConsole';
import { ResultPlayer } from './components/ResultPlayer';
import type {
  MediaMetadata,
  DurationMode,
  OutputContainer,
  AudioCodecChoice,
  CombineOptions,
  ProcessingJob,
} from './types';
import { useTranslation } from './i18n/LanguageContext';

export default function App() {
  const { t } = useTranslation();
  const [videoMeta, setVideoMeta] = useState<MediaMetadata | null>(null);
  const [audioMeta, setAudioMeta] = useState<MediaMetadata | null>(null);

  // Combination options
  const [durationMode, setDurationMode] = useState<DurationMode>('video');
  const [customDuration, setCustomDuration] = useState<number>(10);
  const [audioStartOffset, setAudioStartOffset] = useState<number>(0);
  const [audioDelay, setAudioDelay] = useState<number>(0);
  const [fadeInDuration, setFadeInDuration] = useState<number>(1.5);
  const [fadeOutDuration, setFadeOutDuration] = useState<number>(2.0);
  const [audioVolume, setAudioVolume] = useState<number>(100);
  const [replaceOriginalAudio, setReplaceOriginalAudio] = useState<boolean>(true);
  const [originalAudioVolume, setOriginalAudioVolume] = useState<number>(30);
  const [outputFormat, setOutputFormat] = useState<OutputContainer>('mp4');
  const [audioCodec, setAudioCodec] = useState<AudioCodecChoice>('aac');

  // Job & Execution status
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedJob, setCompletedJob] = useState<ProcessingJob | null>(null);

  // Poll processing status
  useEffect(() => {
    if (!currentJob || !isProcessing) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${currentJob.jobId}`);
        if (res.ok) {
          const jobData: ProcessingJob = await res.json();
          setCurrentJob(jobData);

          if (jobData.status === 'completed') {
            setIsProcessing(false);
            setCompletedJob(jobData);
            clearInterval(interval);
          } else if (jobData.status === 'failed') {
            setIsProcessing(false);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentJob, isProcessing]);

  const handleStartProcess = async () => {
    if (!videoMeta || !audioMeta) return;

    setIsProcessing(true);
    setCompletedJob(null);

    const options: CombineOptions = {
      videoFilename: videoMeta.filename,
      audioFilename: audioMeta.filename,
      durationMode,
      customDuration,
      audioStartOffset,
      audioDelay,
      fadeInDuration,
      fadeOutDuration,
      audioVolume,
      replaceOriginalAudio,
      originalAudioVolume,
      outputFormat,
      audioCodec,
    };

    try {
      const res = await fetch('/api/combine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      const data = await res.json();
      if (data.success && data.jobId) {
        setCurrentJob({
          jobId: data.jobId,
          status: 'processing',
          progressPercentage: 10,
          logs: ['[Client] Job submitted to server engine.'],
        });
      } else {
        setIsProcessing(false);
        alert(`Failed to start job: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setIsProcessing(false);
      alert(`Network error: ${err.message}`);
    }
  };

  const handleReset = () => {
    setVideoMeta(null);
    setAudioMeta(null);
    setCurrentJob(null);
    setCompletedJob(null);
    setIsProcessing(false);
  };

  const canProcess = Boolean(videoMeta && audioMeta);

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#E5E5E5] flex flex-col font-sans antialiased">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        {completedJob && completedJob.outputFilename ? (
          <ResultPlayer
            outputFilename={completedJob.outputFilename}
            mediaUrl={completedJob.outputUrl || `/media/outputs/${completedJob.outputFilename}`}
            outputMeta={completedJob.outputMetadata || null}
            videoMeta={videoMeta}
            processingTimeMs={completedJob.processingTimeMs}
            onReset={handleReset}
          />
        ) : (
          <>
            {/* Step 1: Upload Dropzones */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FileDropzone
                type="video"
                metadata={videoMeta}
                onMetadataLoaded={setVideoMeta}
                onClear={() => setVideoMeta(null)}
              />
              <FileDropzone
                type="audio"
                metadata={audioMeta}
                onMetadataLoaded={setAudioMeta}
                onClear={() => setAudioMeta(null)}
              />
            </section>

            {/* Step 2: Customization Controls */}
            <section className="space-y-6">
              <DurationSelector
                durationMode={durationMode}
                customDuration={customDuration}
                videoMeta={videoMeta}
                audioMeta={audioMeta}
                audioStartOffset={audioStartOffset}
                onDurationModeChange={setDurationMode}
                onCustomDurationChange={setCustomDuration}
              />

              <AudioTrimmer
                audioMeta={audioMeta}
                audioStartOffset={audioStartOffset}
                audioDelay={audioDelay}
                onOffsetChange={setAudioStartOffset}
                onDelayChange={setAudioDelay}
              />

              <AudioFadeMixer
                fadeInDuration={fadeInDuration}
                fadeOutDuration={fadeOutDuration}
                audioVolume={audioVolume}
                replaceOriginalAudio={replaceOriginalAudio}
                originalAudioVolume={originalAudioVolume}
                onFadeInChange={setFadeInDuration}
                onFadeOutChange={setFadeOutDuration}
                onVolumeChange={setAudioVolume}
                onReplaceOriginalAudioChange={setReplaceOriginalAudio}
                onOriginalVolumeChange={setOriginalAudioVolume}
              />

              <LosslessSettings
                container={outputFormat}
                audioCodec={audioCodec}
                onContainerChange={setOutputFormat}
                onAudioCodecChange={setAudioCodec}
              />
            </section>

            {/* Step 3: Processing & Real-time Console */}
            <section>
              <ProcessingConsole
                job={currentJob}
                canProcess={canProcess}
                isProcessing={isProcessing}
                onStartProcessing={handleStartProcess}
              />
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/40 font-mono uppercase tracking-[0.2em]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#C69C6D]"></span>
            <span>Studio Engine • Stream Copy (-c:v copy) Protocol</span>
          </div>
          <p>© {new Date().getFullYear()} V\A Sync Studio Pro — Zero-Loss Media Multiplexer</p>
        </div>
      </footer>
    </div>
  );
}
