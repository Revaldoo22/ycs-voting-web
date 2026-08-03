/**
 * Tipe minimal untuk YouTube IFrame Player API, hanya bagian yang dipakai
 * hero-video.tsx, supaya tak perlu menambah dependency @types/youtube.
 * Dokumentasi: https://developers.google.com/youtube/iframe_api_reference
 */

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  /** 0..100 */
  setVolume(volume: number): void;
  getPlayerState(): number;
  destroy?(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
}

interface YTStateChangeEvent extends YTPlayerEvent {
  /** -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued. */
  data: number;
}

interface YTPlayerOptions {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTStateChangeEvent) => void;
    onError?: (event: YTStateChangeEvent) => void;
  };
}

interface Window {
  YT?: {
    Player: new (
      element: HTMLElement | string,
      options: YTPlayerOptions,
    ) => YTPlayer;
    PlayerState: {
      UNSTARTED: number;
      ENDED: number;
      PLAYING: number;
      PAUSED: number;
      BUFFERING: number;
      CUED: number;
    };
  };
  onYouTubeIframeAPIReady?: () => void;
}
