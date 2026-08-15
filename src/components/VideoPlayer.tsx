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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);

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
        xhrSetup: (xhr, url) => {
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
      video.muted = true; // Auto-play frequently requires mute
      
      // Tentar play imediato
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.warn("Autoplay blocked");
        });
      }
    }

    return () => {
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
        autoPlay
        playsInline
        controls
        className="w-full h-full"
        poster={poster}
        playsInline
        crossOrigin="anonymous"
        onLoadedData={(e) => {
          const v = e.currentTarget;
          v.play().catch(err => {
            console.log("Play failed, requesting user interaction:", err);
          });
        }}
        onCanPlay={(e) => {
          e.currentTarget.play().catch(() => {});
        }}
      >
        Seu navegador não suporta o player de vídeo.
      </video>

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
