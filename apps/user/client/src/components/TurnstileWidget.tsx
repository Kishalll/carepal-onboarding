import { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  siteKey?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (error: string) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  siteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '0x4AAAAAAGFV_enRI4d2H85g',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // Keep callback references stable to prevent unnecessary re-initialization
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let attempts = 0;
    let isCancelled = false;

    const renderWidget = () => {
      if (isCancelled || !containerRef.current) return;
      if (widgetIdRef.current) return; // Prevent double initialization

      if (window.turnstile) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'light',
            callback: (token: string) => {
              onVerifyRef.current?.(token);
            },
            'error-callback': (err: string) => {
              if (onErrorRef.current) onErrorRef.current(err);
            },
            'expired-callback': () => {
              if (onExpireRef.current) onExpireRef.current();
            },
          });
        } catch (e) {
          console.warn('Failed to render Turnstile widget', e);
          setLoadFailed(true);
        }
      } else {
        attempts += 1;
        if (attempts < 30) {
          timer = setTimeout(renderWidget, 150);
        } else {
          setLoadFailed(true);
        }
      }
    };

    renderWidget();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [siteKey]);

  if (loadFailed) {
    return (
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2">
        <span>Security challenge could not load. Click to bypass for local test.</span>
        <button
          type="button"
          onClick={() => onVerifyRef.current?.('XXXX.DUMMY.TOKEN.XXXX')}
          className="px-3 py-1 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
        >
          Dev Bypass
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[65px] flex items-center justify-start py-1">
      <div ref={containerRef} />
    </div>
  );
}
