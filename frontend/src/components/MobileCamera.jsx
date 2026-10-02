import { useState, useRef, useEffect } from 'react';
import MobileBottomSheet from './MobileBottomSheet';

const MobileCamera = ({ isOpen, onClose, onCapture, onScan, mode = 'photo' }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [flashOn, setFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      setStream(null);
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      setCapturedImage(imageData);
      onCapture(imageData);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    stopCamera();
    setTimeout(startCamera, 100);
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
    // Flash functionality would be implemented here
  };

  const startScanning = () => {
    setIsScanning(true);
    // Barcode/QR code scanning would be implemented here
    // For demo purposes, we'll simulate a scan result
    setTimeout(() => {
      setScanResult('Product: iPhone 15 Pro - Price: ₦800,000');
      setIsScanning(false);
    }, 2000);
  };

  const renderCameraView = () => (
    <div className="relative h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* Camera Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <button
          onClick={onClose}
          className="p-2 bg-black bg-opacity-50 text-white rounded-full"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex space-x-2">
          <button
            onClick={toggleFlash}
            className={`p-2 rounded-full ${
              flashOn ? 'bg-yellow-500 text-black' : 'bg-black bg-opacity-50 text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
          
          <button
            onClick={switchCamera}
            className="p-2 bg-black bg-opacity-50 text-white rounded-full"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scan Mode Overlay */}
      {mode === 'scan' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
            <div className="text-white text-center">
              <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-sm">Position barcode/QR code in frame</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        {mode === 'photo' ? (
          <button
            onClick={capturePhoto}
            className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center"
          >
            <div className="w-12 h-12 bg-white rounded-full"></div>
          </button>
        ) : (
          <button
            onClick={startScanning}
            disabled={isScanning}
            className="px-6 py-3 bg-emerald-600 text-white rounded-full disabled:opacity-50"
          >
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </button>
        )}
      </div>
    </div>
  );

  const renderCapturedImage = () => (
    <div className="h-full bg-black flex flex-col">
      <img
        src={capturedImage}
        alt="Captured"
        className="flex-1 w-full object-contain"
      />
      
      <div className="p-4 bg-white">
        <div className="flex space-x-3">
          <button
            onClick={retakePhoto}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
          >
            Retake
          </button>
          <button
            onClick={() => {
              onCapture(capturedImage);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg"
          >
            Use Photo
          </button>
        </div>
      </div>
    </div>
  );

  const renderScanResult = () => (
    <div className="h-full bg-white p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Scan Result</h3>
        <p className="text-gray-600 mb-4">{scanResult}</p>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setScanResult(null);
              setIsScanning(false);
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
          >
            Scan Again
          </button>
          <button
            onClick={() => {
              onScan(scanResult);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg"
          >
            Use Result
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'scan' ? 'Scan Code' : 'Camera'}
      snapPoints={[0.9, 1]}
    >
      <div className="h-full">
        {capturedImage ? renderCapturedImage() : 
         scanResult ? renderScanResult() : 
         renderCameraView()}
      </div>
      
      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </MobileBottomSheet>
  );
};

export default MobileCamera;
