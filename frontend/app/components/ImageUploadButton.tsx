"use client";

import { useRef } from "react";
import Image from "next/image";

export default function ImageUploadButton({
  onChange,
  previewUrl,
  label = "Choisir une image",
}: {
  onChange: (file: File) => void;
  previewUrl?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title={label}
        className="bg-white/5 border border-(--border-color) hover:bg-white/10 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
      >
        <Image
          src="/icons/upload.webp"
          alt="Importer"
          width={18}
          height={18}
          className="object-contain brightness-0 invert shrink-0"
          unoptimized
        />
        <span className="text-xs font-medium">{label}</span>
      </button>
      {previewUrl && (
        <img
          src={previewUrl}
          alt="aperçu"
          className="w-9 h-9 object-contain rounded-lg bg-white/5 border border-(--border-color)"
        />
      )}
    </div>
  );
}
