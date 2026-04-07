import { Platform } from 'react-native';

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;

type GtagCommand = 'js' | 'config' | 'event' | 'set';
type Gtag = (command: GtagCommand, target: string | Date, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const measurementId = process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID;
const isWeb = Platform.OS === 'web';
let hasInitialized = false;

const isEnabled = () => isWeb && typeof window !== 'undefined' && !!measurementId;

const ensureDataLayer = () => {
  if (!window.dataLayer) {
    window.dataLayer = [];
  }
};

const createGtag = () => {
  window.gtag =
    window.gtag ??
    function gtag(command: GtagCommand, target: string | Date, params?: Record<string, unknown>) {
      ensureDataLayer();
      window.dataLayer?.push(arguments);
    };
};

const loadScript = () => {
  if (document.querySelector(`script[data-ga-measurement-id="${measurementId}"]`)) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.dataset.gaMeasurementId = measurementId ?? '';
  document.head.appendChild(script);
};

export const initializeAnalytics = () => {
  if (!isEnabled() || hasInitialized) return;

  ensureDataLayer();
  createGtag();
  loadScript();

  window.gtag?.('js', new Date());
  window.gtag?.('config', measurementId as string, {
    send_page_view: false,
  });

  hasInitialized = true;
};

export const trackPageView = (screenName: string, path?: string) => {
  if (!isEnabled()) return;

  window.gtag?.('event', 'page_view', {
    page_title: screenName,
    page_path: path ?? window.location.pathname,
    page_location: window.location.href,
  });
};

export const trackEvent = (name: string, params?: AnalyticsParams) => {
  if (!isEnabled()) return;

  window.gtag?.('event', name, params);
};
