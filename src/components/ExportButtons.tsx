'use client';

interface ExportButtonsProps {
  onHalftone: () => void;
  onKnockout: () => void;
  onComposite: () => void;
  onSvg?: () => void;
  showSvg: boolean;
}

export function ExportButtons({ onHalftone, onKnockout, onComposite, onSvg, showSvg }: ExportButtonsProps) {
  return (
    <div className="grid gap-2">
      <button className="rounded bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950" onClick={onHalftone}>
        Download Halftone PNG
      </button>
      <button className="rounded bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950" onClick={onKnockout}>
        Download White Knockout PNG
      </button>
      <button className="rounded bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950" onClick={onComposite}>
        Download Combined Preview PNG
      </button>
      {showSvg && (
        <button className="rounded bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950" onClick={onSvg}>
          Download Halftone SVG
        </button>
      )}
    </div>
  );
}
