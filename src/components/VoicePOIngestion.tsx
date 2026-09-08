import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface ExtractedPOSpec {
  buyerIntent: 'quote_request' | 'order_confirmation';
  category: string;
  fabric: string;
  gsm: number | null;
  colorways: string[];
  sizeRatios: {
    S: number;
    M: number;
    L: number;
    XL: number;
    XXL: number;
  };
  totalQuantity: number;
  targetUnitPrice: number | null;
  currency: 'BDT' | 'USD';
  deliveryDeadline: string | null;
  rawTranscript: string;
}

export type AudioDockStatus = 'IDLE' | 'RECORDING' | 'PROCESSING AUDIO' | 'READY' | 'ERROR';

export interface VoicePOIngestionProps {
  onSpecExtracted: (spec: ExtractedPOSpec) => void;
  onCancel?: () => void;
  className?: string;
  autoPopulateOnReady?: boolean;
}

export const VoicePOIngestion: React.FC<VoicePOIngestionProps> = ({
  onSpecExtracted,
  onCancel,
  className = '',
  autoPopulateOnReady = false
}) => {
  // ── 1. Status & MediaRecorder State ──
  const [status, setStatus] = useState<AudioDockStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  // Audio Blob & File State
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [audioFileName, setAudioFileName] = useState<string>('mic_recording.webm');
  const [audioFileSize, setAudioFileSize] = useState<string>('');

  // Extracted Spec & Review State
  const [extractedSpec, setExtractedSpec] = useState<ExtractedPOSpec | null>(null);
  const [extractionSource, setExtractionSource] = useState<'gemini' | 'fallback' | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Fallback Manual Text State
  const [showManualPaste, setShowManualPaste] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Native MediaRecorder References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Cleanup on Unmount ──
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // ── Format Seconds into MM:SS ──
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Format Byte Size ──
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // ── Start Recording using native MediaRecorder ──
  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    // Browser Web Audio API compatibility check
    if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStatus('ERROR');
      setErrorMessage('[ERR_UNSUPPORTED]: Native Web Audio MediaRecorder is not supported by this browser. Please use audio file upload or manual paste below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Determine best supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      setAudioMimeType(mimeType);

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const newUrl = URL.createObjectURL(fullBlob);

        setAudioBlob(fullBlob);
        setAudioUrl(newUrl);
        setAudioFileName(`voice_po_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`);
        setAudioFileSize(formatBytes(fullBlob.size));
        setStatus('READY');

        // Automatically trigger AI extraction once recorded
        processAudioBlob(fullBlob, mimeType);
      };

      recorder.start(250); // Slice every 250ms for low memory accumulation
      setStatus('RECORDING');
      setRecordingSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('[VoicePOIngestion] getUserMedia Error:', err);
      setStatus('ERROR');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('[ERR_MIC_DENIED]: Microphone permission was denied or blocked by browser settings. Please allow mic access in your address bar, or drag & drop a WhatsApp voice note / audio file below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('[ERR_NO_MIC]: No microphone device detected on this system. Please plug in a microphone or upload an audio file.');
      } else {
        setErrorMessage(`[ERR_MIC_INIT]: ${err.message || 'Could not initialize microphone recording'}`);
      }
    }
  };

  // ── Stop Recording ──
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── Toggle Record ──
  const toggleRecording = () => {
    if (status === 'RECORDING') {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ── Convert Blob to Base64 ──
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data:audio/*;base64, prefix for clean transport
        const base64Data = result.split(',')[1] || result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // ── Handle Uploaded / Dropped File ──
  const handleAudioFile = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    const isAudioType = file.type.startsWith('audio/') || hasValidExt;

    if (!isAudioType) {
      setStatus('ERROR');
      setErrorMessage(`[ERR_INVALID_FORMAT]: "${file.name}" is not a supported audio format. Supported: .mp3, .wav, .m4a, .ogg, .webm`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setStatus('ERROR');
      setErrorMessage(`[ERR_FILE_TOO_LARGE]: Audio file exceeds 25MB limit (${formatBytes(file.size)}). Please upload a shorter audio note.`);
      return;
    }

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const newUrl = URL.createObjectURL(file);

    setAudioBlob(file);
    setAudioUrl(newUrl);
    setAudioMimeType(file.type || 'audio/webm');
    setAudioFileName(file.name);
    setAudioFileSize(formatBytes(file.size));
    setStatus('READY');

    // Trigger Gemini extraction
    processAudioBlob(file, file.type || 'audio/webm');
  };

  // ── Process Audio Blob with Gemini Flash via Backend Proxy ──
  const processAudioBlob = async (blob: Blob, mimeType: string) => {
    setStatus('PROCESSING AUDIO');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const base64Data = await blobToBase64(blob);

      const response = await fetch('/api/ai/parse-voice-po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Data,
          mimeType: mimeType || 'audio/webm'
        })
      });

      const json = await response.json();
      if (!response.ok || !json.ok || !json.spec) {
        throw new Error(json.error || 'Failed to extract structured PO specifications from audio.');
      }

      const spec: ExtractedPOSpec = json.spec;
      setExtractedSpec(spec);
      setExtractionSource(json.source || 'gemini');
      setStatus('READY');

      if (autoPopulateOnReady) {
        onSpecExtracted(spec);
      }
    } catch (err: any) {
      console.warn('[VoicePOIngestion] Audio AI parsing warning:', err);
      setStatus('ERROR');
      setErrorMessage(`[AI_PARSE_ERROR]: ${err.message || 'Failed to process voice audio with Gemini Flash'}. You can paste raw voice transcript text below to populate manually.`);
      setShowManualPaste(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Process Manual Raw Text ──
  const processManualText = async () => {
    if (!manualText.trim()) return;
    setStatus('PROCESSING AUDIO');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/ai/parse-voice-po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: manualText.trim()
        })
      });

      const json = await response.json();
      if (!response.ok || !json.ok || !json.spec) {
        throw new Error(json.error || 'Failed to parse procurement specifications from text.');
      }

      const spec: ExtractedPOSpec = json.spec;
      setExtractedSpec(spec);
      setExtractionSource(json.source || 'gemini');
      setStatus('READY');

      if (autoPopulateOnReady) {
        onSpecExtracted(spec);
      }
    } catch (err: any) {
      setStatus('ERROR');
      setErrorMessage(`[TEXT_PARSE_ERROR]: ${err.message || 'Failed to parse text'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Drag & Drop Handlers ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  };

  // ── Audio Playback Toggle ──
  const toggleAudioPlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Playback error:', err);
      });
    }
  };

  // ── Discard / Reset ──
  const handleReset = () => {
    stopRecording();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setExtractedSpec(null);
    setExtractionSource(null);
    setErrorMessage(null);
    setStatus('IDLE');
    setRecordingSeconds(0);
    setIsPlaying(false);
    setManualText('');
  };

  return (
    <div className={`voice-po-ingestion bg-white/85 backdrop-blur-xl border border-white/90 rounded-2xl p-4 lg:p-5 font-mono text-[#1e293b] shadow-[4px_4px_20px_rgba(166,180,200,0.25),-4px_-4px_20px_#ffffff] space-y-4 ${className}`}>
      
      {/* ── Top Terminal Header & Live Status ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${status === 'RECORDING' ? 'bg-[#c81d11] animate-ping' : status === 'PROCESSING AUDIO' ? 'bg-amber-500 animate-pulse' : status === 'READY' ? 'bg-[#10b981]' : status === 'ERROR' ? 'bg-red-500' : 'bg-slate-400'}`} />
            <span className="text-xs font-bold text-[#1e293b] tracking-wider uppercase">
              VOICE PO INGESTION DOCK · RMG BUYER DESK
            </span>
          </div>
          <span className="text-[10px] bg-slate-100 border border-slate-200 text-[#475569] font-semibold px-2 py-0.5 rounded-md">
            GEMINI FLASH 3.8
          </span>
        </div>

        {/* Live Visual Status Indicator Badge */}
        <div className="flex items-center gap-2">
          <div className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border tracking-wider uppercase flex items-center gap-1.5 ${
            status === 'RECORDING'
              ? 'bg-red-50 border-red-300 text-red-700 animate-pulse'
              : status === 'PROCESSING AUDIO'
              ? 'bg-amber-50 border-amber-300 text-amber-800 animate-pulse'
              : status === 'READY'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : status === 'ERROR'
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-slate-100 border-slate-200 text-[#64748b]'
          }`}>
            <span>●</span>
            <span>STATUS: {status}</span>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[#64748b] hover:text-[#1e293b] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg text-xs transition-all"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Terminal Error Banner (if error) ── */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs space-y-1">
          <div className="font-bold flex items-center gap-2">
            <span>⚠️ TERMINAL NOTICE</span>
          </div>
          <p className="text-[11px] leading-relaxed text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* ── DOCK CONTROLS: Record Button + Drop Zone ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Left: Native Record Button & Mic Control (5 Cols) */}
        <div className="md:col-span-5 bg-white/90 border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs">
          <div>
            <span className="text-[11px] font-bold text-[#b45309] uppercase tracking-wider block mb-1">
              Microphone Voice Capture
            </span>
            <p className="text-[11px] text-[#64748b] leading-normal">
              Directly capture spoken instructions, WhatsApp buyer voicemails, or factory floor memos.
            </p>
          </div>

          {/* Recording Visualization Area */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3 text-center space-y-2">
            {status === 'RECORDING' ? (
              <div className="space-y-2">
                <div className="text-xl font-bold text-[#c81d11] font-mono tracking-widest animate-pulse">
                  REC ● {formatTime(recordingSeconds)}
                </div>
                {/* Visual Audio Waveform Simulation (CSS Bars) */}
                <div className="flex items-center justify-center gap-1 h-8">
                  {[40, 75, 100, 60, 90, 45, 80, 100, 65, 85, 50, 95, 70, 40].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-[#c81d11] rounded-full transition-all duration-150 animate-pulse"
                      style={{
                        height: `${Math.max(15, (h * (Math.sin(recordingSeconds * 3 + i) + 1.2)) / 2.2)}%`,
                        animationDelay: `${i * 70}ms`
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-[#64748b] block">
                  Capturing 48kHz native audio stream…
                </span>
              </div>
            ) : (
              <div className="space-y-1 py-1">
                <div className="text-xs text-[#64748b] font-medium">
                  Ready to record voice instructions
                </div>
                <span className="text-[10px] text-[#94a3b8] font-mono">
                  Standard Opus / WebM High-Fidelity
                </span>
              </div>
            )}
          </div>

          {/* Action Button: Hold or Toggle Record */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleRecording}
              disabled={status === 'PROCESSING AUDIO'}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                status === 'RECORDING'
                  ? 'bg-[#c81d11] hover:bg-red-700 text-white animate-pulse shadow-md'
                  : 'bg-[#1e293b] hover:bg-black text-white shadow-sm'
              }`}
            >
              <span>{status === 'RECORDING' ? '⏹️' : '🎙️'}</span>
              <span>{status === 'RECORDING' ? 'STOP RECORDING' : 'CLICK TO RECORD'}</span>
            </button>

            {status === 'RECORDING' && (
              <button
                type="button"
                onClick={handleReset}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#64748b] hover:text-[#1e293b] px-3 py-2 rounded-xl text-xs"
                title="Cancel Recording"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Drag-and-Drop Dropzone for Audio Files (7 Cols) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`md:col-span-7 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-[#d4af37] bg-amber-50/50'
              : 'border-slate-300/80 bg-white/70 hover:bg-white hover:border-[#d4af37] shadow-xs'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.ogg,.webm,.aac,audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleAudioFile(e.target.files[0]);
              }
            }}
          />

          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg mb-2 text-[#475569]">
            📁
          </div>

          <div className="text-xs font-bold text-[#1e293b] uppercase tracking-wider mb-1">
            DROP WHATSAPP AUDIO / VOICE NOTE HERE
          </div>
          <p className="text-[11px] text-[#64748b] max-w-sm mb-2">
            Drag &amp; drop or click to upload audio file from buyer or merchant.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 text-[10px] text-[#64748b] font-mono">
            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">.MP3</span>
            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">.WAV</span>
            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">.M4A</span>
            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">.OGG</span>
            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">.WEBM</span>
          </div>
        </div>

      </div>

      {/* ── Monospace Playback Preview Widget (When Audio is Buffered) ── */}
      {audioUrl && (
        <div className="bg-white/90 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <audio
            ref={audioPlayerRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAudioPlayback}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#1e293b] flex items-center justify-center text-xs transition-all cursor-pointer shadow-xs"
              title={isPlaying ? 'Pause Audio' : 'Play Audio Preview'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div>
              <div className="text-xs font-bold text-[#1e293b] flex items-center gap-2">
                <span>🎵 {audioFileName}</span>
                <span className="text-[10px] text-[#64748b] font-mono">({audioFileSize})</span>
              </div>
              <div className="text-[10px] text-[#64748b] font-mono">
                MIME: {audioMimeType} · Buffer Stream Loaded
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => audioBlob && processAudioBlob(audioBlob, audioMimeType)}
              disabled={isProcessing}
              className="bg-white hover:bg-slate-50 border border-slate-300 text-[#1e293b] text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-xs font-semibold"
            >
              <span>{isProcessing ? '⏳' : '⚡'}</span>
              <span>{isProcessing ? 'EXTRACTING…' : 'RE-ANALYZE VIA GEMINI'}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-red-600 text-xs px-2.5 py-1.5 rounded-lg font-medium"
              title="Discard audio buffer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ── Fallback Text Paste Accordion ── */}
      <div className="border-t border-slate-200/80 pt-2">
        <button
          type="button"
          onClick={() => setShowManualPaste(!showManualPaste)}
          className="text-[11px] text-[#64748b] hover:text-[#b45309] flex items-center gap-1.5 py-1 transition-colors font-medium cursor-pointer"
        >
          <span>{showManualPaste ? '▼' : '▶'}</span>
          <span>Manual Fallback: Paste WhatsApp Raw Voice Transcript / Text Message</span>
        </button>

        {showManualPaste && (
          <div className="mt-2 space-y-2 bg-slate-50/90 border border-slate-200 p-3 rounded-xl">
            <textarea
              rows={3}
              placeholder="Paste raw WhatsApp voice note transcript, email snippet, or RFQ memo here… (e.g. 'Confirming 200 pcs loopback hoodies 450 GSM, size breakdown 20S 50M 75L 35XL 20XXL, FOB 2400 BDT, onyx black and bone white')"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-[#1e293b] placeholder-slate-400 focus:outline-none focus:border-[#d4af37] font-mono shadow-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setManualText('Need 150 pieces of heavy loopback hoodies 450 GSM in onyx black and bone white. Sizing ratio: 20 S, 40 M, 50 L, 25 XL, 15 XXL. Target FOB price 2400 BDT. Delivery required in 25 days.')}
                className="text-[11px] text-[#64748b] hover:text-[#1e293b] bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs cursor-pointer"
              >
                Sample RFQ Text
              </button>
              <button
                type="button"
                onClick={processManualText}
                disabled={!manualText.trim() || isProcessing}
                className="bg-[#d4af37] hover:bg-[#b45309] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>⚡</span>
                <span>PARSE SPEC VIA GEMINI</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── HIGH-DENSITY TERMINAL-STYLED REVIEW DRAWER / PANEL ── */}
      {extractedSpec && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 text-sm">✓</span>
              <span className="text-xs font-bold text-[#1e293b] uppercase tracking-wider">
                STRUCTURED PO SPECIFICATION EXTRACTED
              </span>
              {extractionSource && (
                <span className="text-[10px] bg-slate-100 border border-slate-200 text-[#b45309] font-bold px-2 py-0.5 rounded-md font-mono">
                  SOURCE: {extractionSource.toUpperCase()}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
              extractedSpec.buyerIntent === 'order_confirmation'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              INTENT: {extractedSpec.buyerIntent.replace('_', ' ')}
            </span>
          </div>

          {/* 1. Full Audio Transcript Console */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
              Verbatim Audio Transcript:
            </span>
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs text-[#1e293b] leading-relaxed font-mono select-text">
              "{extractedSpec.rawTranscript}"
            </div>
          </div>

          {/* 2. Extracted Data Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-[#64748b] uppercase block">Category</span>
              <span className="font-bold text-[#b45309] block">{extractedSpec.category}</span>
              <span className="text-[10px] text-[#64748b] block truncate">{extractedSpec.fabric}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-[#64748b] uppercase block">Fabric GSM / Spec</span>
              <span className="font-bold text-[#1e293b] block font-mono">
                {extractedSpec.gsm ? `${extractedSpec.gsm} GSM` : 'Grade Spec'}
              </span>
              <span className="text-[10px] text-[#64748b] block truncate">
                {extractedSpec.colorways.join(', ') || 'Standard'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-[#64748b] uppercase block">Total Order Units</span>
              <span className="font-bold text-emerald-600 block font-mono text-sm">
                {extractedSpec.totalQuantity.toLocaleString()} PCS
              </span>
              <span className="text-[10px] text-[#64748b] block">
                {extractedSpec.deliveryDeadline ? `Lead: ${extractedSpec.deliveryDeadline}` : 'Standard SLA'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1">
              <span className="text-[10px] text-[#64748b] uppercase block">Target FOB Unit Price</span>
              <span className="font-bold text-[#1e293b] block font-mono text-sm">
                {extractedSpec.targetUnitPrice ? `${extractedSpec.currency === 'USD' ? '$' : '৳'}${extractedSpec.targetUnitPrice.toLocaleString()}` : 'Negotiable'}
              </span>
              <span className="text-[10px] text-[#64748b] block">
                Currency: {extractedSpec.currency}
              </span>
            </div>

          </div>

          {/* Sizing Breakdown Matrix */}
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#64748b] uppercase">
              <span>Extracted Sizing Ratio Matrix:</span>
              <span className="font-mono text-[#1e293b] font-semibold">Sum = {extractedSpec.totalQuantity} Units</span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {(['S', 'M', 'L', 'XL', 'XXL'] as const).map(sz => {
                const count = extractedSpec.sizeRatios[sz] || 0;
                const pct = extractedSpec.totalQuantity > 0 ? ((count / extractedSpec.totalQuantity) * 100).toFixed(0) : '0';
                return (
                  <div key={sz} className="bg-white border border-slate-200 py-1.5 px-1 rounded-md shadow-xs">
                    <span className="text-[10px] font-bold text-[#b45309] block">{sz}</span>
                    <span className="font-bold text-[#1e293b] font-mono block">{count}</span>
                    <span className="text-[9px] text-[#64748b] block">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#475569] hover:text-[#1e293b] px-3 py-2 rounded-xl text-xs uppercase tracking-wider transition-all font-semibold"
            >
              Discard / Retry
            </button>
            <button
              type="button"
              onClick={() => onSpecExtracted(extractedSpec)}
              className="bg-[#c81d11] hover:bg-[#a3160c] text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <span>⚡</span>
              <span>POPULATE PO ENGINE</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default VoicePOIngestion;
