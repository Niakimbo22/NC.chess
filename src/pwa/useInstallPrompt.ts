import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface UseInstallPromptResult {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
  isIOS: boolean;
  isStandalone: boolean;
}

function isRunningStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIOSDevice(): boolean {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** Gère l'affichage du bouton d'installation PWA (Chrome/Edge/Android) et détecte iOS/déjà-installé. */
export function useInstallPrompt(): UseInstallPromptResult {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(isRunningStandalone);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onAppInstalled = () => {
      deferredRef.current = null;
      setCanInstall(false);
      setIsStandalone(true);
    };
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setIsStandalone(isRunningStandalone());

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    standaloneQuery.addEventListener('change', onChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      standaloneQuery.removeEventListener('change', onChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const deferred = deferredRef.current;
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferredRef.current = null;
    setCanInstall(false);
  }, []);

  return { canInstall: canInstall && !isStandalone, promptInstall, isIOS: isIOSDevice(), isStandalone };
}
