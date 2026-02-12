'use client';

import { useRef, useState } from 'react';

interface UploadDropzoneProps {
  onFile: (file: File) => void;
}

export function UploadDropzone({ onFile }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFile(files[0]);
  };

  return (
    <div
      className={`rounded-xl border-2 border-dashed p-4 text-center transition ${
        isDragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-600 bg-slate-800/80'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <p className="text-sm text-slate-200">Drop PNG/JPG/WebP/SVG</p>
      <p className="mt-1 text-xs text-slate-400">PDF/AI are not supported in this browser-only build.</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 rounded bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950"
      >
        Choose File
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
