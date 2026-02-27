import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(() => {
    // Basic mobile detection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? 'environment' : 'user';
  });
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const hasScannedRef = useRef(false);

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

  const handleScanSuccess = useCallback((decodedText: string) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;

    onScan(decodedText);

    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
    onClose();
  }, [onScan, onClose]);

  useEffect(() => {
    const scannerId = 'barcode-scanner';
    let scanner: Html5Qrcode | null = null;
    hasScannedRef.current = false;

    const startScanner = async () => {
      setIsStarting(true);
      setError(null);

      try {
        scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode },
          {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.777,
            disableFlip: false,
          },
          handleScanSuccess,
          () => {
            // Ignore scan errors (no barcode found in frame)
          }
        );
        setIsStarting(false);
      } catch (err) {
        console.error('Camera error:', err);
        setError('Unable to access camera. Please ensure camera permissions are granted.');
        setIsStarting(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timeout);
      if (scanner?.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [facingMode, handleScanSuccess]);

  const handleSwitchCamera = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="relative mt-2 overflow-hidden rounded-lg border border-border bg-black shadow-lg">
      <div className="flex flex-col">
        {/* Scanner Area */}
        <div className="relative flex flex-col items-center justify-center bg-black min-h-[250px]">
          {isStarting && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground z-10 bg-black/60">
              <Camera className="h-10 w-10 animate-pulse text-primary" />
              <p className="text-white text-sm font-medium">Initializing camera...</p>
            </div>
          )}

          {error && (
            <div className="text-center p-6 z-10 bg-black/80 flex flex-col items-center">
              <p className="text-destructive text-sm mb-4 font-medium">{error}</p>
              <Button onClick={onClose} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                Close
              </Button>
            </div>
          )}

          <div
            id="barcode-scanner"
            className="w-full relative overflow-hidden"
            style={{ minHeight: '280px' }}
          >
            {!isStarting && !error && (
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-[80%] h-[160px] border-2 border-primary/40 rounded-lg relative overflow-hidden backdrop-blur-[1px]">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary animate-scan shadow-[0_0_15px_rgba(var(--primary),0.8)]" />
                  <div className="absolute inset-0 bg-primary/10" />
                </div>
              </div>
            )}
          </div>

          {/* Overlays */}
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
              onClick={onClose}
              className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white border-none backdrop-blur-sm transition-all"
              title="Close Scanner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!isStarting && !error && (
            <div className="absolute bottom-2 left-0 right-0 z-10 pointer-events-none">
              <p className="text-[10px] text-white/90 text-center bg-black/40 backdrop-blur-[2px] py-1.5 uppercase tracking-wider font-semibold">
                Align barcode within the scanning box
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
