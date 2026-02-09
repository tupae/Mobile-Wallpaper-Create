
export interface WallpaperStyle {
  id: string;
  name: string;
  prompt: string;
  icon: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export enum AppState {
  SPLASH = 'SPLASH',
  GENERATOR = 'GENERATOR',
  HISTORY = 'HISTORY',
  PREVIEW = 'PREVIEW'
}
