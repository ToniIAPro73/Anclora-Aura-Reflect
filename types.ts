export enum AppState {
  INITIAL,
  GENERATING,
  RESULTS,
  REFINING,
  GALLERY,
}

export enum EngineMode {
  AUTO = 'AUTO',
  LOCAL = 'LOCAL',
  CLOUD = 'CLOUD',
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
