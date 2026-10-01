import React, { useState } from "react";
import { useProofingStore } from "@/lib/storage";
import { Lock, KeyRound, AlertCircle, ArrowRight, Eye, EyeOff, Home, TriangleAlert } from "lucide-react";

export const AdminAuthGate: React.FC = () => {
  const { loginAdmin, setViewMode, adminLockUntil } = useProofingStore();
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < adminLockUntil) {
      const waitSec = Math.ceil((adminLockUntil - Date.now()) / 1000);
      setError(`Terlalu banyak percobaan PIN gagal. Coba lagi dalam ${waitSec} detik.`);
      return;
    }
    if (!pinInput.trim()) {
      setError("Silakan masukkan PIN Master Admin.");
      return;
    }

    const success = await loginAdmin(pinInput);
    if (!success) {
      const remaining = useProofingStore.getState().adminLockUntil;
      if (Date.now() < remaining) {
        const waitSec = Math.ceil((remaining - Date.now()) / 1000);
        setError(`Terlalu banyak percobaan PIN gagal. Coba lagi dalam ${waitSec} detik.`);
      } else {
        setError("PIN Master Admin salah.");
      }
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-md mtioon-card p-8 sm:p-10 relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5A1F]/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

        {/* Lock Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0EB] border border-[#FF5A1F]/20 flex items-center justify-center text-[#FF5A1F] shadow-[0_8px_20px_rgba(255,90,31,0.15)]">
            <Lock className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-block px-3 py-1 rounded-full bg-[#F5F2EB] text-[#121212]/70 text-[11px] font-bold tracking-wide uppercase mb-2">
            Akses Panel Kontrol
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-[#121212]">
            Masuk Fotografer
          </h2>
          <p className="text-xs sm:text-sm text-[#121212]/60 mt-2 max-w-xs mx-auto leading-relaxed font-medium">
            Masukkan PIN Master Admin untuk mengelola sesi klien, kuota, Google Drive, dan Cloudflare R2.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#121212]/80 mb-2 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>PIN Master Admin</span>
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                autoFocus
                placeholder="PIN Master (Default: studio2026)"
                className="w-full pl-5 pr-12 py-3.5 bg-[#F5F2EB] border border-black/10 rounded-full text-sm font-medium text-[#121212] placeholder-black/35 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-[#121212] transition-colors p-1"
                title={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {capsLockOn && (
              <p
                role="status"
                className="flex items-center gap-1.5 text-[11px] font-bold text-[#C2410C] mt-2 px-1"
              >
                <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Caps Lock menyala. Periksa huruf besar/kecil sebelum mengirim PIN.</span>
              </p>
            )}
            <p className="text-[11px] text-[#121212]/50 mt-2 px-1 font-medium">
              Petunjuk: PIN bawaan adalah <span className="text-[#FF5A1F] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF0EB] border border-[#FF5A1F]/20">studio2026</span>
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full btn-mtioon-primary py-3.5 px-6 rounded-full font-bold text-sm flex items-center justify-center gap-2 mt-2"
          >
            <span>Buka Dashboard Admin</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 pt-5 border-t border-black/[0.06] text-center">
          <button
            onClick={() => setViewMode("landing")}
            className="text-xs text-[#121212]/60 hover:text-[#121212] font-semibold transition-colors inline-flex items-center gap-1.5 py-1"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </div>
      </div>
    </div>
  );
};
