import { PrintSettings, SourceMeta } from './types';

export const isSvgFile = (file: File): boolean =>
  file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

export const isRasterFile = (file: File): boolean =>
  ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);

export const loadImageBitmap = async (file: File): Promise<ImageBitmap> =>
  createImageBitmap(file, { colorSpaceConversion: 'default', premultiplyAlpha: 'default' });

export const parseSvgDimensions = (svgText: string): { width: number; height: number } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;

  const width = parseFloat(root.getAttribute('width') || '0');
  const height = parseFloat(root.getAttribute('height') || '0');

  if (width > 0 && height > 0) {
    return { width, height };
  }

  const viewBox = root.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/[ ,]+/).map(Number);
    if (parts.length === 4) {
      return { width: Math.abs(parts[2]), height: Math.abs(parts[3]) };
    }
  }

  return { width: 1200, height: 1200 };
};

export const getOutputPixels = (source: SourceMeta, print: PrintSettings): { width: number; height: number } => {
  const width = Math.round(print.printWidthIn * print.dpi);
  const aspect = source.height / source.width;
  return { width, height: Math.max(1, Math.round(width * aspect)) };
};

export const rasterizeSvg = async (svgText: string, outWidth: number, outHeight: number): Promise<ImageData> => {
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const bmp = await createImageBitmap(await fetch(url).then((r) => r.blob()));
    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.clearRect(0, 0, outWidth, outHeight);
    ctx.drawImage(bmp, 0, 0, outWidth, outHeight);
    return ctx.getImageData(0, 0, outWidth, outHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const imageBitmapToImageData = (bmp: ImageBitmap, outWidth: number, outHeight: number): ImageData => {
  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.clearRect(0, 0, outWidth, outHeight);
  ctx.drawImage(bmp, 0, 0, outWidth, outHeight);
  return ctx.getImageData(0, 0, outWidth, outHeight);
};

export const imageDataToCanvas = (imageData: ImageData): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

export const downloadCanvasPng = (canvas: HTMLCanvasElement, filename: string): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
