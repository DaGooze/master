'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ExportButtons } from '@/components/ExportButtons';
import { MockupPreview } from '@/components/MockupPreview';
import { SliderControl } from '@/components/SliderControl';
import { UploadDropzone } from '@/components/UploadDropzone';
import { defaultBgRemoval, defaultHalftone, defaultKnockout, defaultMockup, defaultPrint } from '@/lib/defaults';
import { downloadCanvasPng, getOutputPixels, imageBitmapToImageData, imageDataToCanvas, isRasterFile, isSvgFile, loadImageBitmap, parseSvgDimensions, rasterizeSvg } from '@/lib/image';
import { ActiveTab, ProcessResponse, SourceMeta } from '@/lib/types';

export default function Home() {
  const [sourceMeta, setSourceMeta] = useState<SourceMeta | null>(null);
  const [svgText, setSvgText] = useState<string>('');
  const [sourceData, setSourceData] = useState<ImageData | null>(null);
  const [halftoneData, setHalftoneData] = useState<ImageData | null>(null);
  const [knockoutData, setKnockoutData] = useState<ImageData | null>(null);
  const [print, setPrint] = useState(defaultPrint);
  const [bgRemoval, setBgRemoval] = useState(defaultBgRemoval);
  const [halftone, setHalftone] = useState(defaultHalftone);
  const [knockout, setKnockout] = useState(defaultKnockout);
  const [mockup, setMockup] = useState(defaultMockup);
  const [tab, setTab] = useState<ActiveTab>('halftone');
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [warning, setWarning] = useState<string>('');

  const workerRef = useRef<Worker | null>(null);

  const outputSize = useMemo(() => (sourceMeta ? getOutputPixels(sourceMeta, print) : { width: 0, height: 0 }), [sourceMeta, print]);

  const processNow = () => {
    if (!sourceData || !workerRef.current) return;
    workerRef.current.postMessage({
      sourcePixels: sourceData.data,
      width: sourceData.width,
      height: sourceData.height,
      backgroundRemoval: bgRemoval,
      halftone,
      knockout,
      previewScale: print.quality === 'draft' ? 0.5 : 1
    });
  };

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/processor.worker.ts', import.meta.url));
    workerRef.current.onmessage = (event: MessageEvent<ProcessResponse>) => {
      const { halftonePixels, knockoutPixels, width, height } = event.data;
      setHalftoneData(new ImageData(halftonePixels, width, height));
      setKnockoutData(new ImageData(knockoutPixels, width, height));
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    processNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceData, bgRemoval, halftone, knockout, print.quality]);

  const onUpload = async (file: File) => {
    setWarning('');

    if (!isRasterFile(file) && !isSvgFile(file)) {
      setWarning('Unsupported format. Please upload PNG/JPG/WebP/SVG.');
      return;
    }

    try {
      if (isSvgFile(file)) {
        const text = await file.text();
        const dims = parseSvgDimensions(text);
        setSourceMeta({ name: file.name, mime: file.type || 'image/svg+xml', kind: 'svg', width: dims.width, height: dims.height });
        setSvgText(text);
        const target = getOutputPixels({ name: file.name, mime: file.type, kind: 'svg', width: dims.width, height: dims.height }, print);
        const imageData = await rasterizeSvg(text, target.width, target.height);
        setSourceData(imageData);
      } else {
        const bmp = await loadImageBitmap(file);
        setSourceMeta({ name: file.name, mime: file.type, kind: 'raster', width: bmp.width, height: bmp.height });
        const target = getOutputPixels({ name: file.name, mime: file.type, kind: 'raster', width: bmp.width, height: bmp.height }, print);
        setSourceData(imageBitmapToImageData(bmp, target.width, target.height));
      }
    } catch {
      setWarning('Could not decode file.');
    }
  };

  useEffect(() => {
    if (!sourceMeta || sourceMeta.kind !== 'svg' || !svgText) return;
    rasterizeSvg(svgText, outputSize.width, outputSize.height).then(setSourceData).catch(() => setWarning('Failed to rerasterize SVG'));
  }, [outputSize.height, outputSize.width, print.dpi, print.printWidthIn, sourceMeta, svgText]);

  useEffect(() => {
    if (!sourceMeta || sourceMeta.kind !== 'raster' || !sourceData) return;
    const tooSmall = sourceMeta.width < outputSize.width || sourceMeta.height < outputSize.height;
    setWarning(tooSmall ? 'Warning: source resolution may be too small for selected print width/DPI.' : '');
  }, [outputSize.height, outputSize.width, sourceData, sourceMeta]);

  const activeCanvas = tab === 'halftone' ? (halftoneData ? imageDataToCanvas(halftoneData) : null) : knockoutData ? imageDataToCanvas(knockoutData) : null;
  const underbaseCanvas = knockoutData ? imageDataToCanvas(knockoutData) : null;

  const exportSvgHalftone = () => {
    if (!halftoneData || sourceMeta?.kind !== 'svg') return;
    const circles: string[] = [];
    const step = Math.max(2, halftone.dotSpacing);
    for (let y = 0; y < halftoneData.height; y += step) {
      for (let x = 0; x < halftoneData.width; x += step) {
        const i = (y * halftoneData.width + x) * 4;
        const a = halftoneData.data[i + 3] / 255;
        if (a < 0.1) continue;
        circles.push(`<circle cx="${x}" cy="${y}" r="${(a * halftone.dotSize) / 2}" fill="black"/>`);
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${halftoneData.width} ${halftoneData.height}">${circles.join('')}</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'halftone.svg';
    link.click();
  };

  const exportComposite = () => {
    const canvas = document.querySelector('canvas[data-export="mockup"]') as HTMLCanvasElement | null;
    if (!canvas) return;
    downloadCanvasPng(canvas, 'mockup-preview.png');
  };

  const onPrintWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPrint((prev) => ({ ...prev, printWidthIn: Number(event.target.value) }));
  };

  return (
    <main className="min-h-screen p-4">
      <h1 className="mb-4 text-2xl font-semibold">DTF Artwork Studio</h1>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr_360px]">
        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <UploadDropzone onFile={onUpload} />
          {sourceMeta && (
            <div className="space-y-1 text-xs text-slate-300">
              <p>Type: {sourceMeta.kind.toUpperCase()} ({sourceMeta.mime || 'unknown'})</p>
              <p>Dimensions: {sourceMeta.width} x {sourceMeta.height}px</p>
              <p>Color space note: Browser-decoded sRGB workflow with linear luminance conversion.</p>
            </div>
          )}
          <div className="space-y-2 text-xs">
            <h2 className="font-semibold text-slate-200">Print sizing</h2>
            <label className="block text-slate-300">Print width (in)
              <input type="number" min={2} max={20} step={0.1} value={print.printWidthIn} onChange={onPrintWidthChange} className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1" />
            </label>
            <label className="block text-slate-300">DPI
              <select value={print.dpi} onChange={(e) => setPrint((p) => ({ ...p, dpi: Number(e.target.value) as 150 | 300 | 600 }))} className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1">
                <option value={150}>150</option>
                <option value={300}>300</option>
                <option value={600}>600</option>
              </select>
            </label>
            <label className="block text-slate-300">Quality
              <select value={print.quality} onChange={(e) => setPrint((p) => ({ ...p, quality: e.target.value as 'draft' | 'high' }))} className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1">
                <option value="draft">Draft</option>
                <option value="high">High</option>
              </select>
            </label>
            <p className="text-slate-400">Output pixels: {outputSize.width} x {outputSize.height}</p>
          </div>
          <div className="space-y-2 rounded border border-slate-700 p-2">
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={bgRemoval.enabled} onChange={(e) => setBgRemoval((v) => ({ ...v, enabled: e.target.checked }))} />Treat white as transparent</label>
            <SliderControl label="BG threshold" min={180} max={255} value={bgRemoval.threshold} onChange={(value) => setBgRemoval((v) => ({ ...v, threshold: value }))} />
            <SliderControl label="BG softness" min={1} max={100} value={bgRemoval.softness} onChange={(value) => setBgRemoval((v) => ({ ...v, softness: value }))} />
          </div>
          {warning && <p className="rounded bg-amber-500/20 p-2 text-xs text-amber-200">{warning}</p>}
        </section>

        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex gap-2 text-xs">
            <button className={`rounded px-3 py-1 ${tab === 'halftone' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-700'}`} onClick={() => setTab('halftone')}>Dark Shirt Halftone</button>
            <button className={`rounded px-3 py-1 ${tab === 'knockout' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-700'}`} onClick={() => setTab('knockout')}>White Knockout</button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-2">
            <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'center center' }} className="transition">
              {activeCanvas ? <img src={activeCanvas.toDataURL()} alt="Processed preview" className="mx-auto max-h-[520px] object-contain" /> : <div className="grid h-[520px] place-content-center text-sm text-slate-500">Upload artwork to preview</div>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <SliderControl label="Zoom" min={0.2} max={3} step={0.1} value={zoom} onChange={setZoom} />
            <SliderControl label="Pan X" min={-300} max={300} value={panX} onChange={setPanX} />
            <SliderControl label="Pan Y" min={-300} max={300} value={panY} onChange={setPanY} />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="space-y-2">
            {tab === 'halftone' ? (
              <>
                <SliderControl label="Dot size" min={2} max={30} value={halftone.dotSize} onChange={(value) => setHalftone((v) => ({ ...v, dotSize: value }))} />
                <SliderControl label="Dot spacing" min={2} max={40} value={halftone.dotSpacing} onChange={(value) => setHalftone((v) => ({ ...v, dotSpacing: value }))} />
                <SliderControl label="Angle" min={0} max={90} value={halftone.angle} onChange={(value) => setHalftone((v) => ({ ...v, angle: value }))} />
                <SliderControl label="Threshold" min={0} max={255} value={halftone.threshold} onChange={(value) => setHalftone((v) => ({ ...v, threshold: value }))} />
                <SliderControl label="Gamma" min={0.2} max={3} step={0.1} value={halftone.gamma} onChange={(value) => setHalftone((v) => ({ ...v, gamma: value }))} />
                <SliderControl label="Contrast" min={-100} max={100} value={halftone.contrast} onChange={(value) => setHalftone((v) => ({ ...v, contrast: value }))} />
                <SliderControl label="Despeckle" min={0} max={100} value={halftone.despeckle} onChange={(value) => setHalftone((v) => ({ ...v, despeckle: value }))} />
                <SliderControl label="Edge preserve" min={0} max={100} value={halftone.edgePreserve} onChange={(value) => setHalftone((v) => ({ ...v, edgePreserve: value }))} />
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={halftone.invert} onChange={(e) => setHalftone((v) => ({ ...v, invert: e.target.checked }))} />Invert</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={halftone.preserveHighlights} onChange={(e) => setHalftone((v) => ({ ...v, preserveHighlights: e.target.checked }))} />Preserve highlights</label>
              </>
            ) : (
              <>
                <label className="block text-xs">Mode
                  <select value={knockout.mode} onChange={(e) => setKnockout((v) => ({ ...v, mode: e.target.value as 'knockout' | 'underbase' }))} className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs">
                    <option value="knockout">Knockout (remove white from art)</option>
                    <option value="underbase">Underbase mask</option>
                  </select>
                </label>
                <SliderControl label="Underbase strength" min={0} max={100} value={knockout.underbaseStrength} onChange={(value) => setKnockout((v) => ({ ...v, underbaseStrength: value }))} />
                <SliderControl label="Choke/Spread" min={-8} max={8} value={knockout.chokeSpread} onChange={(value) => setKnockout((v) => ({ ...v, chokeSpread: value }))} />
                <SliderControl label="Softness" min={0} max={10} value={knockout.softness} onChange={(value) => setKnockout((v) => ({ ...v, softness: value }))} />
                <SliderControl label="Threshold" min={0} max={255} value={knockout.threshold} onChange={(value) => setKnockout((v) => ({ ...v, threshold: value }))} />
                <SliderControl label="Detail preservation" min={0} max={100} value={knockout.detailPreservation} onChange={(value) => setKnockout((v) => ({ ...v, detailPreservation: value }))} />
                <SliderControl label="Minimum dot" min={0} max={20} value={knockout.minimumDot} onChange={(value) => setKnockout((v) => ({ ...v, minimumDot: value }))} />
              </>
            )}
          </div>

          <div className="rounded-lg border border-slate-700 p-2">
            <p className="mb-2 text-xs font-semibold">Shirt mockup</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="col-span-2">Shirt color
                <input type="color" value={mockup.shirtColor} onChange={(e) => setMockup((v) => ({ ...v, shirtColor: e.target.value }))} className="mt-1 h-8 w-full rounded border border-slate-700 bg-transparent" />
              </label>
              <label className="col-span-2">Hex input
                <input value={mockup.shirtColor} onChange={(e) => setMockup((v) => ({ ...v, shirtColor: e.target.value }))} className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1" />
              </label>
              <SliderControl label="Scale" min={0.2} max={1.2} step={0.01} value={mockup.scale} onChange={(value) => setMockup((v) => ({ ...v, scale: value }))} />
              <SliderControl label="Rotate" min={-30} max={30} value={mockup.rotate} onChange={(value) => setMockup((v) => ({ ...v, rotate: value }))} />
              <SliderControl label="X" min={-200} max={200} value={mockup.x} onChange={(value) => setMockup((v) => ({ ...v, x: value }))} />
              <SliderControl label="Y" min={-200} max={200} value={mockup.y} onChange={(value) => setMockup((v) => ({ ...v, y: value }))} />
              <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={mockup.heatherTexture} onChange={(e) => setMockup((v) => ({ ...v, heatherTexture: e.target.checked }))} />Heather texture</label>
              <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={mockup.simulateWhiteInk} onChange={(e) => setMockup((v) => ({ ...v, simulateWhiteInk: e.target.checked }))} />Simulate white ink</label>
            </div>
            <div className="mt-3">
              <div data-export="mockup-wrapper">
                <MockupPreview artCanvas={halftoneData ? imageDataToCanvas(halftoneData) : null} underbaseCanvas={underbaseCanvas} settings={mockup} tab={tab} />
              </div>
            </div>
          </div>

          <ExportButtons
            onHalftone={() => halftoneData && downloadCanvasPng(imageDataToCanvas(halftoneData), 'halftone.png')}
            onKnockout={() => knockoutData && downloadCanvasPng(imageDataToCanvas(knockoutData), 'white-knockout.png')}
            onComposite={exportComposite}
            onSvg={exportSvgHalftone}
            showSvg={sourceMeta?.kind === 'svg'}
          />
        </section>
      </div>
    </main>
  );
}
