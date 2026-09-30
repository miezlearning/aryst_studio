import React from "react";
import { Camera, ImageOff, CheckCircle2 } from "lucide-react";

interface EmptyStateProps {
  type: "search" | "selected" | "general";
  onReset?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onReset }) => {
  if (type === "search") {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center text-zinc-400">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
          <ImageOff className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-medium text-zinc-200 mb-1">Foto Tidak Ditemukan</h3>
        <p className="text-sm text-zinc-400 max-w-sm mb-4">
          Tidak ada foto yang cocok dengan kata kunci pencarian Anda.
        </p>
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Hapus Pencarian
          </button>
        )}
      </div>
    );
  }

  if (type === "selected") {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center text-zinc-400">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-amber-500/80">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-medium text-zinc-200 mb-1">Belum Ada Foto Terpilih</h3>
        <p className="text-sm text-zinc-400 max-w-sm mb-4">
          Tandai foto favorit yang Anda sukai di galeri untuk menyimpannya ke daftar pilihan.
        </p>
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold transition-colors"
          >
            Lihat Semua Foto
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-20 text-center flex flex-col items-center justify-center text-zinc-400">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
        <Camera className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-zinc-200 mb-1">Belum Ada Foto</h3>
      <p className="text-sm text-zinc-400 max-w-sm">
        Belum ada foto yang tersedia untuk sesi ini. Silakan hubungi fotografer Anda.
      </p>
    </div>
  );
};
