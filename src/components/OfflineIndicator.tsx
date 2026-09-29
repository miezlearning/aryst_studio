import React, { useEffect } from "react";
import { useProofingStore } from "@/lib/storage";
import { WifiOff } from "lucide-react";

export const OfflineIndicator: React.FC = () => {
  const { isOnline, setIsOnline } = useProofingStore();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline]);

  if (isOnline) return null;

  return (
    <div className="bg-amber-950/80 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 flex items-center justify-center gap-2 backdrop-blur-md sticky top-0 z-50 animate-fade-in">
      <WifiOff className="w-4 h-4 text-amber-400" />
      <span>
        Koneksi internet terputus. Pilihan foto dan catatan Anda tetap aman tersimpan di perangkat ini.
      </span>
    </div>
  );
};
