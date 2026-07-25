import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, RefreshCw, HardDrive, Clock } from 'lucide-react';
import type { MediaMetadata } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface FileDropzoneProps {
  type: 'video' | 'audio';
  metadata: MediaMetadata | null;
  onMetadataLoaded: (meta: MediaMetadata) => void;
  onClear: () => void;
}

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB chunks
const MAX_RETRIES = 5;

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  type,
  metadata,
  onMetadataLoaded,
  onClear,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = type === 'video';
  const acceptedTypes = isVideo
    ? 'video/mp4,video/quicktime,video/x-matroska,video/webm,video/x-msvideo,.mp4,.mov,.mkv,.webm,.avi'
    : 'audio/mpeg,audio/wav,audio/aac,audio/flac,audio/m4a,audio/ogg,.mp3,.wav,.aac,.flac,.m4a,.ogg';

  // Single chunk upload helper with auto-retry
  const uploadSingleChunkWithRetry = (
    chunk: Blob,
    uploadId: string,
    chunkIndex: number,
    attempt = 1
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('chunk', chunk, 'chunk');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload-chunk', true);
      xhr.timeout = 180000; // 3 minute timeout per 10MB chunk

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.success) {
              resolve();
            } else {
              reject(new Error(res.error || 'Chunk upload rejected'));
            }
          } catch {
            reject(new Error('Invalid JSON response'));
          }
        } else if (attempt < MAX_RETRIES) {
          setStatusText(`${t('networkErrorRetry')} (${t('retryAttempt')} ${attempt + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            uploadSingleChunkWithRetry(chunk, uploadId, chunkIndex, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, 1500);
        } else {
          reject(new Error(`Chunk ${chunkIndex} failed after ${MAX_RETRIES} attempts (HTTP ${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        if (attempt < MAX_RETRIES) {
          setStatusText(`${t('networkErrorRetry')} (${t('retryAttempt')} ${attempt + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            uploadSingleChunkWithRetry(chunk, uploadId, chunkIndex, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, 1500);
        } else {
          reject(new Error(`Network error uploading chunk ${chunkIndex}`));
        }
      };

      xhr.ontimeout = () => {
        if (attempt < MAX_RETRIES) {
          setStatusText(`${t('networkErrorRetry')} (${t('retryAttempt')} ${attempt + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            uploadSingleChunkWithRetry(chunk, uploadId, chunkIndex, attempt + 1)
              .then(resolve)
              .catch(reject);
          }, 1500);
        } else {
          reject(new Error(`Chunk ${chunkIndex} timed out`));
        }
      };

      xhr.send(formData);
    });
  };

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    setStatusText(t('analyzingHeader'));

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // If file is large (> 10 MB), use chunked upload for ultra-reliability
    if (file.size > CHUNK_SIZE) {
      const uploadId = 'up-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

      try {
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(file.size, start + CHUNK_SIZE);
          const chunk = file.slice(start, end);

          setStatusText(`${t('chunkUploading')} ${i + 1}/${totalChunks}...`);

          await uploadSingleChunkWithRetry(chunk, uploadId, i);

          const progress = Math.round(((i + 1) / totalChunks) * 95);
          setUploadProgress(progress);
        }

        setStatusText(t('analyzingHeader'));

        // Complete upload and stitch file
        const finishRes = await fetch('/api/upload-chunk-finish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId,
            totalChunks,
            originalName: file.name,
            mimeType: file.type,
          }),
        });

        const finishData = await finishRes.json();
        setUploading(false);

        if (finishData.success && finishData.metadata) {
          onMetadataLoaded(finishData.metadata);
        } else {
          setError(finishData.error || 'File assembly failed');
        }
      } catch (err: any) {
        setUploading(false);
        setError(err.message || 'Network error during file upload');
      }
    } else {
      // Standard single POST for small files
      const formData = new FormData();
      formData.append('file', file);

      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);
        xhr.timeout = 600000; // 10 min timeout

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          setUploading(false);
          if (xhr.status >= 200 && xhr.status < 300) {
            const res = JSON.parse(xhr.responseText);
            if (res.success && res.metadata) {
              onMetadataLoaded(res.metadata);
            } else {
              setError(res.error || 'Failed to inspect file');
            }
          } else {
            setError(`Upload server error (${xhr.status})`);
          }
        };

        xhr.onerror = () => {
          setUploading(false);
          setError('Network error uploading file');
        };

        xhr.ontimeout = () => {
          setUploading(false);
          setError('Upload timed out. Please try again.');
        };

        xhr.send(formData);
      } catch (err: any) {
        setUploading(false);
        setError(err.message || 'File upload error');
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainderSecs = (sec % 60).toFixed(2);
    return `${mins > 0 ? `${mins}m ` : ''}${remainderSecs}s`;
  };

  return (
    <div className="bg-[#121212] border border-white/10 p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-mono">
            {isVideo ? t('sourceInput01') : t('sourceInput02')}
          </label>
          {metadata && (
            <button
              onClick={onClear}
              className="text-[10px] uppercase tracking-widest text-[#C69C6D] hover:text-white flex items-center transition-colors"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {t('replaceSource')}
            </button>
          )}
        </div>

        <h2 className="text-4xl font-serif-italic font-light mb-1 leading-none text-white">
          {isVideo ? t('videoStream') : t('audioTrack')}
        </h2>
        <p className="text-[11px] tracking-widest uppercase text-white/40 mb-5">
          {isVideo ? t('videoFormats') : t('audioFormats')}
        </p>

        <input
          type="file"
          ref={fileInputRef}
          accept={acceptedTypes}
          onChange={onInputChange}
          className="hidden"
        />

        {!metadata && !uploading && (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`h-44 border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center bg-white/[0.02] hover:bg-white/[0.05] p-6 text-center ${
              isDragging ? 'border-[#C69C6D] bg-[#C69C6D]/10' : 'border-white/20'
            }`}
          >
            <Upload className="w-6 h-6 text-white/40 mb-2" />
            <span className="text-[11px] uppercase tracking-[0.15em] text-white/80 font-medium">
              {isVideo ? t('dropVideoFile') : t('dropAudioFile')}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/40 mt-1">
              {t('orClickToSelect')}
            </span>
            {isVideo && (
              <span className="mt-3 text-[10px] uppercase tracking-widest text-[#C69C6D] font-mono">
                {t('passthroughActive')}
              </span>
            )}
          </div>
        )}

        {uploading && (
          <div className="h-44 border border-white/20 bg-white/[0.02] p-6 flex flex-col items-center justify-center text-center">
            <div className="w-6 h-6 border-2 border-[#C69C6D] border-t-transparent rounded-full animate-spin mb-3"></div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#C69C6D] font-mono">
              {statusText || t('analyzingHeader')} ({uploadProgress}%)
            </span>
            <div className="w-full bg-white/10 h-1 mt-3 overflow-hidden">
              <div
                className="bg-[#C69C6D] h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 border border-red-500/30 bg-red-500/10 text-[11px] text-red-400 font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {metadata && !uploading && (
          <div className="border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-white/10">
              <CheckCircle2 className="w-4 h-4 text-[#C69C6D] flex-shrink-0" />
              <div className="truncate">
                <p className="text-xs font-mono text-white truncate uppercase tracking-wide">
                  {metadata.originalName}
                </p>
                <div className="flex items-center space-x-3 text-[10px] font-mono text-white/50 mt-1">
                  <span className="flex items-center">
                    <HardDrive className="w-3 h-3 mr-1 text-white/40" />
                    {formatBytes(metadata.fileSize)}
                  </span>
                  <span>|</span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-white/40" />
                    {formatSeconds(metadata.duration)}
                  </span>
                </div>
              </div>
            </div>

            {isVideo && metadata.videoStream && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="border border-white/10 p-2 bg-[#0F0F0F]">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-mono">{t('resolution')}</p>
                  <p className="text-[11px] font-mono font-bold text-[#C69C6D] mt-0.5 truncate">
                    {metadata.videoStream.resolutionLabel}
                  </p>
                </div>

                <div className="border border-white/10 p-2 bg-[#0F0F0F]">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-mono">{t('frameRate')}</p>
                  <p className="text-[11px] font-mono font-bold text-white mt-0.5">
                    {metadata.videoStream.fps} FPS
                  </p>
                </div>

                <div className="border border-white/10 p-2 bg-[#0F0F0F]">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-mono">{t('codec')}</p>
                  <p className="text-[11px] font-mono font-bold text-white/80 mt-0.5 truncate">
                    {metadata.videoStream.codec}
                  </p>
                </div>
              </div>
            )}

            {!isVideo && metadata.audioStream && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="border border-white/10 p-2 bg-[#0F0F0F]">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-mono">{t('codec')}</p>
                  <p className="text-[11px] font-mono font-bold text-[#C69C6D] mt-0.5 truncate">
                    {metadata.audioStream.codec}
                  </p>
                </div>

                <div className="border border-white/10 p-2 bg-[#0F0F0F]">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-mono">{t('sampling')}</p>
                  <p className="text-[11px] font-mono font-bold text-white mt-0.5">
                    {(metadata.audioStream.sampleRate / 1000).toFixed(1)} kHz
                  </p>
                </div>

                <div className="border border-white/10 p-2 bg-[#0F0F0F]">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-mono">{t('channels')}</p>
                  <p className="text-[11px] font-mono font-bold text-white/80 mt-0.5">
                    {metadata.audioStream.channels === 2 ? 'Stereo' : metadata.audioStream.channels === 1 ? 'Mono' : `${metadata.audioStream.channels}Ch`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
