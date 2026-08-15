import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onFullScreen?: () => void;
  branding?: string;
}

export function VideoPlayer({ src, poster, branding }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setIsPlaying(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const proxiedSrc = `/api/public/stream?url=${encodeURIComponent(src)}`;
    const isHls = src.includes(".m3u8") || src.includes("output=m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });

      hls.loadSource(proxiedSrc);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("Erro de rede. O servidor pode estar offline.");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("Erro de mídia. O formato pode ser incompatível.");
              hls.recoverMediaError();
              break;
            default:
              setError("Erro no reprodutor de vídeo.");
              hls.destroy();
              break;
          }
        }
      });
    } else {
      video.src = proxiedSrc;
      video.load();
    }

    const playHandler = () => setIsPlaying(true);
    const pauseHandler = () => setIsPlaying(false);

    video.addEventListener('play', playHandler);
    video.addEventListener('pause', pauseHandler);

    return () => {
      video.removeEventListener('play', playHandler);
      video.removeEventListener('pause', pauseHandler);
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (video) {
        video.pause();
        video.src = "";
        video.load();
      }
    };
  }, [src]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-border shadow-2xl group">
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-destructive mb-4"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-white font-bold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay={false}
        playsInline
        controls
        className="w-full h-full cursor-pointer"
        poster={poster}
        crossOrigin="anonymous"
        onClick={togglePlay}
        onLoadedMetadata={(e) => {
          // Attempting a small jump can sometimes kickstart stalled streams
          const v = e.currentTarget;
          if (v.currentTime === 0) {
            v.play().catch(() => {
              // If initial play fails (likely auto-play block), stay on poster/overlay
            });
          }
        }}
        onError={(e) => {
          const v = e.currentTarget;
          if (v.error) {
            console.error("Video error:", v.error.code, v.error.message);
            // Don't show error immediately, try to recover
            if (v.error.code === 4) {
              setError("O formato do vídeo não é suportado pelo seu navegador.");
            }
          }
        }}
      >
        Seu navegador não suporta o player de vídeo.
      </video>

      {!isPlaying && !error && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
          onClick={togglePlay}
        >
          <button 
            className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-2xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
        </div>
      )}

      {branding && (
        <div className="absolute top-4 right-4 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
          <span className="text-primary font-black title-cinematic text-xl italic tracking-tighter">
            {branding}
          </span>
        </div>
      )}
    </div>
  );
}