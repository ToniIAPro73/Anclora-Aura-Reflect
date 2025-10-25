export enum AppState {
  INITIAL,
  GENERATING,
  RESULTS,
  REFINING,
  GALLERY,
}

export type GeneratedImage = {
  id: string;
  src: string;
};

export interface LocalEngineConfig {
  modelPath?: string;
  steps?: number;
  guidanceScale?: number;
}
