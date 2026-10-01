import React, { useEffect, useState } from "react";
import {
  useProofingStore,
  ACCESS_IDLE_TIMEOUT_MS,
  ACCESS_MAX_AGE_MS,
} from "@/lib/storage";
import { Lock, KeyRound, AlertCircle, ArrowRight, Eye, EyeOff, Timer, TriangleAlert } from "lucide-react";

export const PasswordGate: React.FC = () => {
  const { config, session, verifyPassword, passwordLockUntil } = useProofingStore();
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Ticks only to drive the brute-force lockout countdown
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const lockRemaining = Math.max(0, passwordLockUntil - now);
  const isLockedOut = lockRemaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;
    if (!passwordInput.trim()) {
      setError("Silakan masukkan kata sandi galeri.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    const isMatch = await verifyPassword(passwordInput);
    setIsVerifying(false);

    if (!isMatch) {
      setError("Kata sandi salah. Silakan periksa kembali atau hubungi fotografer Anda.");
    }
  };

  const idleHours = ACCESS_IDLE_TIMEOUT_MS / 3_600_000;
  const maxHours = ACCESS_MAX_AGE_MS / 3_600_000;

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mtioon-card p-8 sm:p-10 relative overflow-hidden animate-fade-in">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5A1F]/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

        {/* Lock Icon Badge */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0EB] border border-[#FF5A1F]/20 flex items-center justify-center text-[#FF5A1F] shadow-[0_8px_20px_rgba(255,90,31,0.15)]">
            <Lock className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* Header Text */}
        <div className="text-center mb-7">
          <div className="inline-block px-3 py-1 rounded-full bg-[#F5F2EB] text-[#121212]/70 text-[11px] font-bold tracking-wide uppercase mb-2">
            {session.projectId || config.projectId || "Koleksi Terproteksi"}
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-[#121212]">
            {session.clientName || config.clientName || "Galeri Foto Klien"}
          </h2>
          <p className="text-xs sm:text-sm text-[#121212]/60 mt-2 max-w-xs mx-auto leading-relaxed">
            Galeri ini dilindungi kata sandi pribadi untuk menjaga privasi seluruh momen foto Anda.
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#121212]/80 mb-2 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Masukkan Kata Sandi Galeri</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                autoFocus
                placeholder="Kata sandi dari fotografer..."
                className="w-full pl-5 pr-12 py-3.5 bg-[#F5F2EB] border border-black/10 rounded-full text-sm font-medium text-[#121212] placeholder-black/35 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-[#121212] transition-colors p-1"
                title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {capsLockOn && (
              <p
                role="status"
                className="flex items-center gap-1.5 text-[11px] font-bold text-[#C2410C] mt-2 px-1"
              >
                <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Caps Lock menyala. Periksa huruf besar/kecil sebelum membuka galeri.</span>
              </p>
            )}
          </div>

          {isLockedOut && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <Timer className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Terlalu banyak percobaan gagal. Akses dijeda{" "}
                <strong className="tabular-nums font-bold">{lockRemaining} detik</strong> lagi.
              </span>
            </div>
          )}

          {error && !isLockedOut && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying || isLockedOut}
            className="w-full btn-mtioon-primary py-3.5 px-6 rounded-full font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            <span>
              {isLockedOut
                ? `Tunggu ${lockRemaining} detik`
                : isVerifying
                  ? "Memverifikasi..."
                  : "Buka Galeri Foto"}
            </span>
            {!isLockedOut && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Footer Guidance */}
        <div className="mt-8 pt-5 border-t border-black/[0.06] text-center space-y-1.5">
          <p className="text-[11px] text-[#121212]/50 leading-relaxed font-medium">
            Sesi aman: berlaku {idleHours} jam tanpa aktivitas atau maksimal {maxHours} jam.
          </p>
          <p className="text-[11px] text-[#121212]/50 font-medium">
            Belum menerima kata sandi? Hubungi fotografer Anda via WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
};
