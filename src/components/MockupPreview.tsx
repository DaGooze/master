'use client';

import { useEffect, useRef } from 'react';
import { MockupSettings } from '@/lib/types';

interface MockupPreviewProps {
  artCanvas: HTMLCanvasElement | null;
  underbaseCanvas: HTMLCanvasElement | null;
  settings: MockupSettings;
  tab: 'halftone' | 'knockout';
}

export function MockupPreview({ artCanvas, underbaseCanvas, settings, tab }: MockupPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 900;

    const render = (shirtAsset?: HTMLImageElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = settings.shirtColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (shirtAsset) {
        ctx.globalAlpha = 0.24;
        ctx.drawImage(shirtAsset, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }

      if (settings.heatherTexture) {
        for (let i = 0; i < 3000; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const alpha = Math.random() * 0.04;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }

      const placementW = canvas.width * settings.scale;
      const placementH = placementW;

      ctx.save();
      ctx.translate(canvas.width / 2 + settings.x, canvas.height / 2 + settings.y);
      ctx.rotate((settings.rotate * Math.PI) / 180);
      ctx.translate(-placementW / 2, -placementH / 2);

      if (settings.simulateWhiteInk && underbaseCanvas) {
        ctx.globalAlpha = 0.95;
        ctx.drawImage(underbaseCanvas, 0, 0, placementW, placementH);
        ctx.globalAlpha = 1;
      }

      if (tab === 'halftone' && artCanvas) {
        ctx.drawImage(artCanvas, 0, 0, placementW, placementH);
      }

      if (tab === 'knockout' && underbaseCanvas) {
        ctx.drawImage(underbaseCanvas, 0, 0, placementW, placementH);
      }
      ctx.restore();
    };

    const shirtAsset = new Image();
    shirtAsset.onload = () => render(shirtAsset);
    shirtAsset.onerror = () => render();
    shirtAsset.src = '/mockups/tshirt-base.svg';
  }, [artCanvas, settings, tab, underbaseCanvas]);

  return <canvas data-export="mockup" ref={canvasRef} className="w-full rounded-xl border border-slate-700 bg-slate-900" />;
}
