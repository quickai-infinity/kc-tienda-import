import { useState, useRef, useEffect } from "react";
import { X, Camera, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WebcamCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const WebcamCaptureModal = ({ open, onClose, onCapture }: WebcamCaptureModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  // Get list of available cameras
  const getCameras = async () => {
    try {
      // First request permission to access cameras
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error("Error getting cameras:", err);
      return [];
    }
  };

  useEffect(() => {
    if (open) {
      initCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  // Effect for switching cameras
  useEffect(() => {
    if (open && cameras.length > 0) {
      startCameraWithDevice(cameras[currentCameraIndex]?.deviceId);
    }
  }, [currentCameraIndex, cameras]);

  const initCamera = async () => {
    setIsLoading(true);
    setError(null);
    
    const availableCameras = await getCameras();
    if (availableCameras.length === 0) {
      setError("No se encontraron cámaras disponibles.");
      setIsLoading(false);
      return;
    }
    
    // Start with first camera
    await startCameraWithDevice(availableCameras[0]?.deviceId);
  };

  const startCameraWithDevice = async (deviceId?: string) => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1920 }, height: { ideal: 1080 } }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsLoading(false);
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `webcam-capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          stopCamera();
          onCapture(file);
          onClose();
        }
      },
      "image/jpeg",
      0.85
    );
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const toggleCamera = () => {
    if (cameras.length <= 1) return;
    setCurrentCameraIndex(prev => (prev + 1) % cameras.length);
  };

  const hasMultipleCameras = cameras.length > 1;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-black">
        <DialogHeader className="p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Capturar foto</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative w-full aspect-[4/3] bg-black flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <p className="text-white text-center">{error}</p>
            </div>
          )}
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: isLoading || error ? 'none' : 'block' }}
          />
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 flex justify-center items-center gap-6">
          {hasMultipleCameras ? (
            <Button
              onClick={toggleCamera}
              disabled={isLoading || !!error}
              variant="ghost"
              size="icon"
              className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/30 text-white"
            >
              <SwitchCamera className="h-6 w-6" />
            </Button>
          ) : (
            <div className="w-12 h-12" /> /* Spacer when no switch available */
          )}
          <Button
            onClick={handleCapture}
            disabled={isLoading || !!error}
            className="rounded-full w-16 h-16 bg-white hover:bg-gray-200 text-black"
          >
            <Camera className="h-8 w-8" />
          </Button>
          <div className="w-12 h-12" /> {/* Spacer for symmetry */}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebcamCaptureModal;
