import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * Global loading indicator for TanStack Query fetching states.
 * Shows an overlay when the app is fetching data in the background
 * or during navigation transitions.
 */
export function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    if (isFetching > 0) {
      // Small delay to avoid flickering for super fast requests
      timeout = setTimeout(() => setShow(true), 200);
    } else {
      setShow(false);
    }

    return () => clearTimeout(timeout);
  }, [isFetching]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative">
        {/* Loading Spinner */}
        <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        
        {/* Pulsing Core */}
        <div className="absolute inset-0 m-auto h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
      </div>
      
      <div className="mt-6 flex flex-col items-center gap-2">
        <span className="text-xl font-black tracking-tighter title-cinematic animate-pulse italic">
          MARÉ TV
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground animate-bounce">
          Carregando conteúdo...
        </span>
      </div>
      
      {/* Wave animation at the bottom for branding */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
    </div>
  );
}
