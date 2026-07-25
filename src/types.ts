export interface VideoStreamInfo {
  width: number;
  height: number;
  resolutionLabel: string;
  frameRate: string;
  fps: number;
  codec: string;
  bitDepth?: string;
  colorSpace?: string;
  duration: number;
  bitrate?: number;
}

export interface AudioStreamInfo {
  codec: string;
  sampleRate: number;
  channels: number;
  channelLayout?: string;
  duration: number;
  bitrate?: number;
}

export interface MediaMetadata {
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  formatName: string;
  duration: number;
  videoStream?: VideoStreamInfo;
  audioStream?: AudioStreamInfo;
}

export type DurationMode = 'video' | 'audio' | 'shortest' | 'longest' | 'custom';

export type OutputContainer = 'mp4' | 'mkv' | 'mov' | 'webm';

export type AudioCodecChoice = 'aac' | 'flac' | 'pcm_s24le' | 'libmp3lame' | 'copy';

export interface CombineOptions {
  videoFilename: string;
  audioFilename: string;
  durationMode: DurationMode;
  customDuration?: number;
  audioStartOffset: number; // seconds to start from in the audio track
  audioDelay?: number; // seconds to delay audio entry relative to video
  fadeInDuration: number; // fade in duration in seconds
  fadeOutDuration: number; // fade out duration in seconds
  audioVolume: number; // percentage 0 - 200 (100 = default)
  replaceOriginalAudio: boolean;
  originalAudioVolume: number; // percentage 0 - 200 when mixing
  outputFormat: OutputContainer;
  audioCodec: AudioCodecChoice;
}

export interface ProcessingJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progressPercentage: number;
  logs: string[];
  outputFilename?: string;
  errorMessage?: string;
  ffmpegCommand?: string;
  processingTimeMs?: number;
  outputMetadata?: MediaMetadata;
}
