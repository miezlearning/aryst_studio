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
    <div className="bg-[#FFF7ED] border-b border-[#FF5A1F]/25 px-4 py-2 text-xs font-semibold text-[#C2410C] flex items-center justify-center gap-2 backdrop-blur-md sticky top-0 z-50 animate-fade-in">
      <WifiOff className="w-4 h-4 text-[#FF5A1F]" />
      <span>
        Koneksi internet terputus. Pilihan foto dan catatan Anda tetap aman tersimpan di perangkat ini.
      </span>
    </div>
  );
};
