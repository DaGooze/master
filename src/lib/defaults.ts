import { BackgroundRemovalSettings, HalftoneSettings, KnockoutSettings, MockupSettings, PrintSettings } from './types';

export const defaultPrint: PrintSettings = {
  printWidthIn: 10,
  dpi: 300,
  quality: 'draft'
};

export const defaultBgRemoval: BackgroundRemovalSettings = {
  enabled: false,
  threshold: 240,
  softness: 30
};

export const defaultHalftone: HalftoneSettings = {
  dotSize: 8,
  dotSpacing: 12,
  angle: 25,
  threshold: 138,
  gamma: 1,
  contrast: 10,
  invert: false,
  despeckle: 10,
  edgePreserve: 50,
  preserveHighlights: true
};

export const defaultKnockout: KnockoutSettings = {
  mode: 'underbase',
  underbaseStrength: 80,
  chokeSpread: -1,
  softness: 2,
  threshold: 140,
  detailPreservation: 75,
  minimumDot: 2
};

export const defaultMockup: MockupSettings = {
  shirtColor: '#1f2937',
  heatherTexture: false,
  simulateWhiteInk: true,
  scale: 0.78,
  x: 0,
  y: 0,
  rotate: 0
};
