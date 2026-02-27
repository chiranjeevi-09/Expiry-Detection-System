import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Check, X, Loader2, Calendar, ScanLine, SwitchCamera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import Tesseract from 'tesseract.js';
import { extractExpiryDate, preprocessImage, createBlobFromImageData } from '@/utils/ocrDateExtractor';

interface ExpiryScannerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ExpiryScanner({ value, onChange }: ExpiryScannerProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? 'environment' : 'user';
  });
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setHasMultipleCameras(cameras.length > 1);
      } catch (err) {
        console.warn('Could not check cameras:', err);
      }
    };
    checkCameras();
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setScanError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  }, [facingMode]);

  useEffect(() => {
    if (showCamera) {
      startCamera();
    }
  }, [facingMode, showCamera, startCamera]);

  const handleSwitchCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;

    try {
      // Preprocess image into multiple variants (grayscale, binary, inverted)
      const variants = preprocessImage(canvas, video);
      let allText = '';

      // Run OCR on each preprocessed variant
      for (let i = 0; i < variants.length; i++) {
        setScanProgress(Math.round(((i) / variants.length) * 60));
        const blob = await createBlobFromImageData(canvas, variants[i]);
        const result = await Tesseract.recognize(blob, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const variantProgress = 60 + Math.round(m.progress * (40 / variants.length));
              setScanProgress(Math.min(variantProgress, 99));
            }
          }
        });
        allText += '\n' + result.data.text;
      }

      // Also run on original frame
      const videoWidth = video.videoWidth || 640;
      const videoHeight = video.videoHeight || 480;
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      const originalBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed')), 'image/png', 1.0);
      });
      const origResult = await Tesseract.recognize(originalBlob, 'eng');
      allText += '\n' + origResult.data.text;

      console.log('OCR Text (all variants):', allText);

      // Use scored extraction algorithm
      const extractedDate = extractExpiryDate(allText);

      if (extractedDate) {
        const formattedDate = format(extractedDate, 'yyyy-MM-dd');
        onChange(formattedDate);
        stopCamera();
        toast.success('Expiry date detected successfully!');
        setScanError(null);
      } else {
        setScanError('Could not detect expiry date. Try again or enter manually.');
        toast.error('No valid date found. Position expiry date clearly in frame.');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setScanError('Scanning failed. Please try again.');
      toast.error('Scanning failed. Please try again.');
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const validateDate = (dateStr: string): boolean => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (date < tomorrow) {
      setScanError('Expiry date must be tomorrow or later');
      return false;
    }
    setScanError(null);
    return true;
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    validateDate(newValue);
  };

  const isValidValue = value && !scanError;

  // Fullscreen camera view
  if (showCamera) {
    return (
      <div className="relative mt-2 overflow-hidden rounded-lg border border-border bg-black shadow-lg">
        <div className="flex flex-col">
          <div className="relative flex flex-col items-center justify-center bg-black min-h-[300px]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover max-h-[400px]" />
            <canvas ref={canvasRef} className="hidden" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-1/3 border-2 border-dashed border-primary/70 rounded-lg relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/50 animate-pulse" />
              </div>
            </div>

            {/* Control Overlays */}
            <div className="absolute top-2 right-2 flex gap-2 z-20">
              {hasMultipleCameras && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleSwitchCamera}
                  className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white border-none backdrop-blur-sm transition-all"
                  title="Switch Camera"
                >
                  <SwitchCamera className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="secondary"
                size="icon"
                onClick={stopCamera}
                className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white border-none backdrop-blur-sm transition-all"
                title="Close Scanner"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isScanning && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
                <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <span className="text-white text-xs mt-2 font-medium">Scanning Texture... {scanProgress}%</span>
              </div>
            )}

            {scanError && (
              <div className="absolute bottom-16 left-4 right-4 z-20">
                <p className="text-destructive text-[11px] text-center bg-black/80 backdrop-blur-md p-2 rounded border border-destructive/30">
                  {scanError}
                </p>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60 backdrop-blur-md border-t border-white/10 flex flex-col items-center gap-2">
              <p className="text-[10px] text-white/80 text-center">
                Position expiry date clearly within the frame
              </p>
              <Button
                onClick={captureAndScan}
                disabled={isScanning}
                size="sm"
                className="w-full gradient-primary text-primary-foreground h-9"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4 mr-2" />
                    Capture & Scan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="expiry" className="text-foreground">
        Expiry Date
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="expiry"
            type="date"
            value={value}
            min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
            onChange={(e) => handleChange(e.target.value)}
            className={scanError ? 'border-destructive' : isValidValue ? 'border-success' : ''}
          />
          {isValidValue && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
          )}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={startCamera} className="shrink-0">
          <Camera className="h-4 w-4" />
        </Button>
      </div>
      {scanError ? (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" />
          {scanError}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Position expiry date in camera view and scan
        </p>
      )}
    </div>
  );
}
