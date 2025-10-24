
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
