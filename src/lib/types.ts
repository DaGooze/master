export type QualityMode = 'draft' | 'high';
export type ActiveTab = 'halftone' | 'knockout';

export interface PrintSettings {
  printWidthIn: number;
  dpi: 150 | 300 | 600;
  quality: QualityMode;
}

export interface BackgroundRemovalSettings {
  enabled: boolean;
  threshold: number;
  softness: number;
}

export interface HalftoneSettings {
  dotSize: number;
  dotSpacing: number;
  angle: number;
  threshold: number;
  gamma: number;
  contrast: number;
  invert: boolean;
  despeckle: number;
  edgePreserve: number;
  preserveHighlights: boolean;
}

export interface KnockoutSettings {
  mode: 'knockout' | 'underbase';
  underbaseStrength: number;
  chokeSpread: number;
  softness: number;
  threshold: number;
  detailPreservation: number;
  minimumDot: number;
}

export interface MockupSettings {
  shirtColor: string;
  heatherTexture: boolean;
  simulateWhiteInk: boolean;
  scale: number;
  x: number;
  y: number;
  rotate: number;
}

export interface SourceMeta {
  name: string;
  mime: string;
  kind: 'raster' | 'svg';
  width: number;
  height: number;
}

export interface ProcessRequest {
  sourcePixels: Uint8ClampedArray;
  width: number;
  height: number;
  backgroundRemoval: BackgroundRemovalSettings;
  halftone: HalftoneSettings;
  knockout: KnockoutSettings;
  previewScale: number;
}

export interface ProcessResponse {
  halftonePixels: Uint8ClampedArray;
  knockoutPixels: Uint8ClampedArray;
  width: number;
  height: number;
}
