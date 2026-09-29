import React, { useState } from "react";
import { useProofingStore } from "@/lib/storage";
import { Lock, KeyRound, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";

export const PasswordGate: React.FC = () => {
  const { config, session, verifyPassword } = useProofingStore();
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setError("Silakan masukkan kata sandi galeri.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    const isMatch = await verifyPassword(passwordInput);
    setIsVerifying(false);

    if (!isMatch) {
      setError("Kata sandi salah. Silakan periksa kembali atau tanyakan ke fotografer Anda.");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl animate-fade-in">
        {/* Lock Icon Badge */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        {/* Header Text */}
        <div className="text-center mb-6">
          <p className="text-xs font-semibold text-zinc-500 mb-1">
            {session.projectId || config.projectId}
          </p>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {session.clientName || config.clientName || "Galeri Foto Klien"}
          </h2>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Galeri ini dilindungi kata sandi untuk privasi sesi foto Anda.
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Masukkan Kata Sandi</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                placeholder="Kata sandi dari fotografer..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <span>{isVerifying ? "Memverifikasi..." : "Buka Galeri Foto"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Guidance */}
        <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-500">
            Belum menerima kata sandi? Hubungi fotografer Anda via WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
};
