// Telegram Mini App (TWA) SDK wrapper

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export const getTelegram = (): TelegramWebApp | undefined => {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
};

export const initTelegramApp = () => {
  const tg = getTelegram();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      // Set background color matching dark theme
      if (tg.headerColor) {
        tg.headerColor = '#090a0f';
      }
      if (tg.backgroundColor) {
        tg.backgroundColor = '#090a0f';
      }
    } catch (e) {
      console.warn('Telegram WebApp init notice:', e);
    }
  }
};

export const triggerHaptic = (
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'
) => {
  const tg = getTelegram();
  if (!tg?.HapticFeedback) return;

  try {
    if (type === 'selection') {
      tg.HapticFeedback.selectionChanged();
    } else if (type === 'success' || type === 'warning' || type === 'error') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch (e) {
    // Ignore if not supported in standard browser
  }
};

export const setTelegramBackButton = (visible: boolean, onClickHandler?: () => void) => {
  const tg = getTelegram();
  if (!tg?.BackButton) return;

  try {
    if (visible && onClickHandler) {
      tg.BackButton.show();
      tg.BackButton.onClick(onClickHandler);
    } else {
      tg.BackButton.hide();
    }
  } catch (e) {
    console.warn('Telegram BackButton error:', e);
  }
};
