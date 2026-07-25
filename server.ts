import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import util from 'util';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import type { CombineOptions, MediaMetadata, ProcessingJob } from './src/types.js';

const execAsync = util.promisify(exec);

// Ensure directories exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const OUTPUTS_DIR = path.join(process.cwd(), 'outputs');
const CHUNKS_DIR = path.join(process.cwd(), 'chunks');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10 GB limit
});

// Job store
const jobs = new Map<string, ProcessingJob>();

async function inspectMediaFile(filePath: string, originalName: string, mimeType: string): Promise<MediaMetadata> {
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const filename = path.basename(filePath);

  const ffprobeCmd = `ffprobe -v error -show_entries format=duration,size,bit_rate,format_name : -show_entries stream=index,codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,duration,channels,sample_rate,bits_per_raw_sample,pix_fmt -of json "${filePath}"`;

  try {
    const { stdout } = await execAsync(ffprobeCmd);
    const parsed = JSON.parse(stdout);

    const format = parsed.format || {};
    const streams = parsed.streams || [];

    const duration = parseFloat(format.duration || '0');
    const formatName = format.format_name || 'unknown';

    const vStream = streams.find((s: any) => s.codec_type === 'video');
    const aStream = streams.find((s: any) => s.codec_type === 'audio');

    let videoStream;
    if (vStream) {
      const width = parseInt(vStream.width || '0', 10);
      const height = parseInt(vStream.height || '0', 10);

      // Frame rate calculation
      let fps = 0;
      const rFrameRate = vStream.r_frame_rate || vStream.avg_frame_rate || '0/1';
      if (rFrameRate.includes('/')) {
        const [num, den] = rFrameRate.split('/').map(Number);
        fps = den > 0 ? num / den : 0;
      } else {
        fps = parseFloat(rFrameRate);
      }

      // Label resolution
      let resolutionLabel = `${width}×${height}`;
      if (width >= 7000 || height >= 3800) {
        resolutionLabel = `8K Ultra HD (${width}×${height})`;
      } else if (width >= 3500 || height >= 2000) {
        resolutionLabel = `4K UHD (${width}×${height})`;
      } else if (width >= 2400 || height >= 1400) {
        resolutionLabel = `2.5K QHD (${width}×${height})`;
      } else if (width >= 1800 || height >= 1000) {
        resolutionLabel = `1080p Full HD (${width}×${height})`;
      } else if (width >= 1200 || height >= 700) {
        resolutionLabel = `720p HD (${width}×${height})`;
      }

      videoStream = {
        width,
        height,
        resolutionLabel,
        frameRate: rFrameRate,
        fps: Math.round(fps * 100) / 100,
        codec: (vStream.codec_name || 'unknown').toUpperCase(),
        bitDepth: vStream.bits_per_raw_sample ? `${vStream.bits_per_raw_sample}-bit` : '8-bit',
        colorSpace: vStream.pix_fmt || undefined,
        duration: parseFloat(vStream.duration || format.duration || '0'),
        bitrate: parseInt(format.bit_rate || '0', 10),
      };
    }

    let audioStream;
    if (aStream) {
      audioStream = {
        codec: (aStream.codec_name || 'unknown').toUpperCase(),
        sampleRate: parseInt(aStream.sample_rate || '44100', 10),
        channels: parseInt(aStream.channels || '2', 10),
        duration: parseFloat(aStream.duration || format.duration || '0'),
        bitrate: parseInt(format.bit_rate || '0', 10),
      };
    }

    return {
      filename,
      originalName,
      fileSize,
      mimeType,
      formatName,
      duration,
      videoStream,
      audioStream,
    };
  } catch (err) {
    console.error('ffprobe error:', err);
    // Fallback if ffprobe fails or partial
    return {
      filename,
      originalName,
      fileSize,
      mimeType,
      formatName: 'unknown',
      duration: 0,
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve uploaded and output files
  app.use('/media/uploads', express.static(UPLOADS_DIR, { acceptRanges: true }));
  app.use('/media/outputs', express.static(OUTPUTS_DIR, { acceptRanges: true }));

  // API 1: Upload single file and return metadata
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    req.setTimeout(0);
    res.setTimeout(0);
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const metadata = await inspectMediaFile(req.file.path, req.file.originalname, req.file.mimetype);
      res.json({ success: true, metadata });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  });

  // API 1B: Chunked upload for ultra-large 8K/4K high-bitrate files
  app.post('/api/upload-chunk', upload.single('chunk'), async (req, res) => {
    req.setTimeout(0);
    res.setTimeout(0);
    try {
      const { uploadId, chunkIndex } = req.body;
      if (!req.file || !uploadId || chunkIndex === undefined) {
        res.status(400).json({ error: 'Missing chunk file, uploadId or chunkIndex' });
        return;
      }

      const uploadChunkDir = path.join(CHUNKS_DIR, uploadId);
      if (!fs.existsSync(uploadChunkDir)) fs.mkdirSync(uploadChunkDir, { recursive: true });

      const chunkPath = path.join(uploadChunkDir, `chunk_${chunkIndex}`);
      fs.renameSync(req.file.path, chunkPath);

      res.json({ success: true, chunkIndex });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Chunk upload failed' });
    }
  });

  // API 1C: Finish chunked upload and assemble file
  app.post('/api/upload-chunk-finish', async (req, res) => {
    req.setTimeout(0);
    res.setTimeout(0);
    try {
      const { uploadId, totalChunks, originalName, mimeType } = req.body;
      if (!uploadId || !totalChunks || !originalName) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const uploadChunkDir = path.join(CHUNKS_DIR, uploadId);
      if (!fs.existsSync(uploadChunkDir)) {
        res.status(404).json({ error: 'Upload directory not found' });
        return;
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(originalName);
      const safeName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const finalFilename = `${safeName}-${uniqueSuffix}${ext}`;
      const finalPath = path.join(UPLOADS_DIR, finalFilename);

      const writeStream = fs.createWriteStream(finalPath);

      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(uploadChunkDir, `chunk_${i}`);
        if (!fs.existsSync(chunkPath)) {
          writeStream.close();
          res.status(400).json({ error: `Missing chunk ${i}` });
          return;
        }
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
      }
      writeStream.end();

      // Clean up chunk directory
      fs.rmSync(uploadChunkDir, { recursive: true, force: true });

      const metadata = await inspectMediaFile(finalPath, originalName, mimeType || 'video/mp4');
      res.json({ success: true, metadata });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Assemble chunks failed' });
    }
  });

  // API 2: Inspect existing filename
  app.post('/api/inspect', async (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) {
        res.status(400).json({ error: 'Filename is required' });
        return;
      }
      const filePath = path.join(UPLOADS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      const metadata = await inspectMediaFile(filePath, filename, 'application/octet-stream');
      res.json({ success: true, metadata });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Inspect failed' });
    }
  });

  // API 3: Get job status
  app.get('/api/job/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(job);
  });

  // API 4: Download processed output
  app.get('/api/download/:filename', (req, res) => {
    const filePath = path.join(OUTPUTS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('File not found');
      return;
    }
    res.download(filePath, req.params.filename);
  });

  // API 5: Combine Audio & Video Losslessly
  app.post('/api/combine', async (req, res) => {
    try {
      const options: CombineOptions = req.body;
      const {
        videoFilename,
        audioFilename,
        durationMode,
        customDuration,
        audioStartOffset = 0,
        audioDelay = 0,
        fadeInDuration = 0,
        fadeOutDuration = 0,
        audioVolume = 100,
        replaceOriginalAudio = true,
        originalAudioVolume = 0,
        outputFormat = 'mp4',
        audioCodec = 'aac',
      } = options;

      if (!videoFilename || !audioFilename) {
        res.status(400).json({ error: 'Both video and audio files are required' });
        return;
      }

      const videoPath = path.join(UPLOADS_DIR, videoFilename);
      const audioPath = path.join(UPLOADS_DIR, audioFilename);

      if (!fs.existsSync(videoPath) || !fs.existsSync(audioPath)) {
        res.status(404).json({ error: 'Uploaded video or audio file not found' });
        return;
      }

      // Extract metadata for duration calculations
      const videoMeta = await inspectMediaFile(videoPath, videoFilename, '');
      const audioMeta = await inspectMediaFile(audioPath, audioFilename, '');

      const videoDur = videoMeta.duration || 10;
      const audioDur = audioMeta.duration || 10;

      // Determine final target duration
      let targetDuration = videoDur;
      let needLoopVideo = false;

      if (durationMode === 'video') {
        targetDuration = videoDur;
      } else if (durationMode === 'audio') {
        targetDuration = Math.max(0.1, audioDur - audioStartOffset);
        if (videoDur < targetDuration) {
          needLoopVideo = true;
        }
      } else if (durationMode === 'shortest') {
        targetDuration = Math.min(videoDur, Math.max(0.1, audioDur - audioStartOffset));
      } else if (durationMode === 'longest') {
        targetDuration = Math.max(videoDur, Math.max(0.1, audioDur - audioStartOffset));
        if (videoDur < targetDuration) {
          needLoopVideo = true;
        }
      } else if (durationMode === 'custom' && customDuration && customDuration > 0) {
        targetDuration = customDuration;
        if (videoDur < targetDuration) {
          needLoopVideo = true;
        }
      }

      const jobId = 'job-' + Date.now() + '-' + Math.round(Math.random() * 1e6);
      const outputFilename = `lossless_combined_${Date.now()}.${outputFormat}`;
      const outputPath = path.join(OUTPUTS_DIR, outputFilename);

      // Build FFmpeg command arguments
      const ffmpegArgs: string[] = ['-y'];

      // Video input (Stream loop if audio is longer than video)
      if (needLoopVideo) {
        ffmpegArgs.push('-stream_loop', '-1', '-i', videoPath);
      } else {
        ffmpegArgs.push('-i', videoPath);
      }

      // Audio input
      ffmpegArgs.push('-i', audioPath);

      // Stream copy video flag: ZERO RE-ENCODING FOR VIDEO!
      ffmpegArgs.push('-c:v', 'copy');

      // Build Audio Filters
      const audioFilters: string[] = [];

      // 1. Audio start offset (trim audio from offset)
      if (audioStartOffset > 0) {
        audioFilters.push(`atrim=start=${audioStartOffset}`);
        audioFilters.push('asetpts=PTS-STARTPTS');
      }

      // 2. Audio delay if specified
      if (audioDelay > 0) {
        const delayMs = Math.round(audioDelay * 1000);
        audioFilters.push(`adelay=${delayMs}|${delayMs}`);
      }

      // 3. Fade In
      if (fadeInDuration > 0) {
        audioFilters.push(`afade=t=in:ss=0:d=${fadeInDuration}`);
      }

      // 4. Fade Out
      if (fadeOutDuration > 0 && targetDuration > fadeOutDuration) {
        const fadeOutStart = Math.max(0, targetDuration - fadeOutDuration);
        audioFilters.push(`afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOutDuration}`);
      }

      // 5. Volume control
      if (audioVolume !== 100) {
        const volFactor = (audioVolume / 100).toFixed(2);
        audioFilters.push(`volume=${volFactor}`);
      }

      let audioFilterComplex = '';

      if (replaceOriginalAudio) {
        // Map track 1 (new audio)
        if (audioFilters.length > 0) {
          audioFilterComplex = `[1:a]${audioFilters.join(',')}[outa]`;
          ffmpegArgs.push('-filter_complex', audioFilterComplex);
          ffmpegArgs.push('-map', '0:v:0');
          ffmpegArgs.push('-map', '[outa]');
        } else {
          ffmpegArgs.push('-map', '0:v:0');
          ffmpegArgs.push('-map', '1:a:0');
        }
      } else {
        // Mix original video audio [0:a] with new audio [1:a]
        const origVol = (originalAudioVolume / 100).toFixed(2);
        let newAudioChain = audioFilters.length > 0 ? `[1:a]${audioFilters.join(',')}[newa];` : '';
        const newAudioLabel = audioFilters.length > 0 ? '[newa]' : '[1:a]';

        audioFilterComplex = `${newAudioChain}[0:a]volume=${origVol}[origa]; [origa]${newAudioLabel}amix=inputs=2:duration=first:dropout_transition=2[outa]`;

        ffmpegArgs.push('-filter_complex', audioFilterComplex);
        ffmpegArgs.push('-map', '0:v:0');
        ffmpegArgs.push('-map', '[outa]');
      }

      // Audio Codec Selection
      if (audioCodec === 'copy' && audioFilters.length === 0 && replaceOriginalAudio) {
        ffmpegArgs.push('-c:a', 'copy');
      } else if (audioCodec === 'flac') {
        ffmpegArgs.push('-c:a', 'flac');
      } else if (audioCodec === 'pcm_s24le') {
        ffmpegArgs.push('-c:a', 'pcm_s24le');
      } else if (audioCodec === 'libmp3lame') {
        ffmpegArgs.push('-c:a', 'libmp3lame', '-q:a', '0');
      } else {
        // Default high bitrate studio AAC
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '320k');
      }

      // Set target output duration limit
      ffmpegArgs.push('-t', targetDuration.toFixed(3));

      // Output path
      ffmpegArgs.push(outputPath);

      const commandStr = `ffmpeg ${ffmpegArgs.map((a) => (a.includes(' ') || a.includes(';') || a.includes('[') ? `"${a}"` : a)).join(' ')}`;

      // Initialize job record
      const jobRecord: ProcessingJob = {
        jobId,
        status: 'processing',
        progressPercentage: 10,
        logs: [`[Init] Starting FFmpeg process for video "${videoFilename}" and audio "${audioFilename}"...`, `[Lossless Engine] Command: ${commandStr}`],
        ffmpegCommand: commandStr,
      };
      jobs.set(jobId, jobRecord);

      // Send initial response with jobId
      res.json({ success: true, jobId });

      // Run FFmpeg process asynchronously
      const startTime = Date.now();
      const ffmpegProc = spawn('ffmpeg', ffmpegArgs);

      let stderrLog = '';

      ffmpegProc.stderr.on('data', (data) => {
        const line = data.toString();
        stderrLog += line;

        // Try parsing duration progress from FFmpeg stderr line: "time=00:01:23.45"
        const timeMatch = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch && targetDuration > 0) {
          const hours = parseInt(timeMatch[1], 10);
          const mins = parseInt(timeMatch[2], 10);
          const secs = parseFloat(timeMatch[3]);
          const currentSecs = hours * 3600 + mins * 60 + secs;
          const percent = Math.min(98, Math.max(15, Math.round((currentSecs / targetDuration) * 100)));

          const updatedJob = jobs.get(jobId);
          if (updatedJob) {
            updatedJob.progressPercentage = percent;
            if (updatedJob.logs.length > 50) updatedJob.logs.shift();
            updatedJob.logs.push(`[Processing] Encoded time: ${timeMatch[0]} (${percent}%)`);
          }
        }
      });

      ffmpegProc.on('close', async (code) => {
        const timeTakenMs = Date.now() - startTime;
        const job = jobs.get(jobId);
        if (!job) return;

        if (code === 0 && fs.existsSync(outputPath)) {
          // Inspect generated output file
          const outMeta = await inspectMediaFile(outputPath, outputFilename, 'video/mp4');

          job.status = 'completed';
          job.progressPercentage = 100;
          job.outputFilename = outputFilename;
          job.processingTimeMs = timeTakenMs;
          job.outputMetadata = outMeta;
          job.logs.push(`[Success] Processing completed in ${timeTakenMs}ms! Zero video frames dropped/re-encoded.`);
        } else {
          job.status = 'failed';
          job.errorMessage = `FFmpeg exited with error code ${code}. ${stderrLog.slice(-500)}`;
          job.logs.push(`[Error] FFmpeg process failed with code ${code}.`);
        }
      });
    } catch (err: any) {
      console.error('Combine error:', err);
      res.status(500).json({ error: err.message || 'Combine failed' });
    }
  });

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lossless Video Audio Combiner Server running on http://localhost:${PORT}`);
  });

  // Set infinite socket timeouts for large 8K/4K media files upload
  server.timeout = 0; // Disable automatic socket timeout
  server.keepAliveTimeout = 3600000; // 1 Hour keep-alive
  server.headersTimeout = 3605000; // 1 Hour + 5s headers timeout
}

startServer();
