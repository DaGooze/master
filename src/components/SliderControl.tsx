'use client';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export function SliderControl({ label, value, min, max, step = 1, onChange }: SliderControlProps) {
  return (
    <label className="space-y-1 text-xs text-slate-300">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="rounded bg-slate-700 px-2 py-0.5 font-mono text-[11px] text-slate-100">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded bg-slate-700"
      />
    </label>
  );
}
