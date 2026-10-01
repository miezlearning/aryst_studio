import React from "react";
import { Camera, ImageOff, CheckCircle2 } from "lucide-react";

interface EmptyStateProps {
  type: "search" | "selected" | "general";
  onReset?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onReset }) => {
  if (type === "search") {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center text-[#71717A]">
        <div className="w-14 h-14 rounded-full bg-black/[0.04] border border-black/[0.06] flex items-center justify-center mb-4 text-[#71717A]">
          <ImageOff className="w-6 h-6" />
        </div>
        <h3 className="font-display font-bold text-lg text-[#121212] mb-1">Foto Tidak Ditemukan</h3>
        <p className="text-sm text-[#71717A] max-w-sm mb-5 font-normal">
          Tidak ada foto yang cocok dengan kata kunci pencarian Anda.
        </p>
        {onReset && (
          <button
            onClick={onReset}
            className="btn-mtioon-secondary px-5 py-2 text-xs font-bold"
          >
            Hapus Pencarian
          </button>
        )}
      </div>
    );
  }

  if (type === "selected") {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center text-[#71717A]">
        <div className="w-14 h-14 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center mb-4 text-[#FF5A1F]">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-display font-bold text-lg text-[#121212] mb-1">Belum Ada Foto Terpilih</h3>
        <p className="text-sm text-[#71717A] max-w-sm mb-5 font-normal">
          Tandai foto favorit yang Anda sukai di galeri untuk menyimpannya ke daftar pilihan.
        </p>
        {onReset && (
          <button
            onClick={onReset}
            className="btn-mtioon-primary px-6 py-2 text-xs font-bold"
          >
            Lihat Semua Foto
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-20 text-center flex flex-col items-center justify-center text-[#71717A]">
      <div className="w-14 h-14 rounded-full bg-black/[0.04] border border-black/[0.06] flex items-center justify-center mb-4 text-[#71717A]">
        <Camera className="w-6 h-6" />
      </div>
      <h3 className="font-display font-bold text-lg text-[#121212] mb-1">Belum Ada Foto</h3>
      <p className="text-sm text-[#71717A] max-w-sm font-normal">
        Belum ada foto yang tersedia untuk sesi ini. Silakan hubungi fotografer Anda.
      </p>
    </div>
  );
};
