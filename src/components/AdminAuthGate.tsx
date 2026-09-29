import React, { useState } from "react";
import { useProofingStore } from "@/lib/storage";
import { Lock, KeyRound, AlertCircle, ArrowRight, Eye, EyeOff, Home } from "lucide-react";

export const AdminAuthGate: React.FC = () => {
  const { loginAdmin, setViewMode } = useProofingStore();
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setError("Silakan masukkan PIN Master Admin.");
      return;
    }

    const success = loginAdmin(pinInput);
    if (!success) {
      setError("PIN Master Admin salah. PIN default adalah studio2026.");
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
        {/* Lock Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Akses Admin
          </h2>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Masukkan PIN Master Admin untuk mengelola sesi klien, kuota, dan tautan kurasi.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
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
                autoFocus
                placeholder="PIN Master (Default: studio2026)"
                className="w-full pl-3.5 pr-10 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                title={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Petunjuk: PIN bawaan adalah <span className="text-amber-400 font-semibold px-1 py-0.5 rounded bg-zinc-950 border border-zinc-800">studio2026</span>
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors"
          >
            <span>Buka Dashboard Admin</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
          <button
            onClick={() => setViewMode("landing")}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </div>
      </div>
    </div>
  );
};
