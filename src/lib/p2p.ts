import Peer, { DataConnection } from "peerjs";
import { P2PSelectionPayload } from "@/types";

let peerInstance: Peer | null = null;
let activeConnections: DataConnection[] = [];
let broadcastChannel: BroadcastChannel | null = null;

// Broadcast channel setup (instant zero-network peer sync for same-browser testing)
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel("aryst_p2p_channel");
    } catch (e) {
      console.warn("BroadcastChannel not supported or blocked", e);
    }
  }
  return broadcastChannel;
}

export function cleanupP2P(): void {
  activeConnections.forEach((conn) => {
    try {
      conn.close();
    } catch {}
  });
  activeConnections = [];

  if (peerInstance) {
    try {
      peerInstance.destroy();
    } catch {}
    peerInstance = null;
  }
}

/**
 * Host Mode (Photographer / Admin Dashboard)
 * Listens for incoming connections from clients kurating the project.
 */
export function startP2PHost(
  projectId: string,
  onClientUpdate: (payload: P2PSelectionPayload) => void,
  onStatusChange?: (isConnected: boolean) => void
): void {
  cleanupP2P();

  // 1. Listen via BroadcastChannel
  const bc = getBroadcastChannel();
  if (bc) {
    bc.onmessage = (event) => {
      const data = event.data as P2PSelectionPayload;
      if (data && data.projectId === projectId) {
        onClientUpdate(data);
        onStatusChange?.(true);
      }
    };
  }

  // 2. Listen via WebRTC PeerJS
  try {
    const hostPeerId = `aryst-proof-${projectId.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const peer = new Peer(hostPeerId, {
      debug: 0,
    });

    peerInstance = peer;

    peer.on("open", () => {
      onStatusChange?.(false);
    });

    peer.on("connection", (conn) => {
      activeConnections.push(conn);
      onStatusChange?.(true);

      conn.on("data", (data) => {
        try {
          const payload = typeof data === "string" ? JSON.parse(data) : (data as P2PSelectionPayload);
          if (payload && payload.projectId === projectId) {
            onClientUpdate(payload);
          }
        } catch (err) {
          console.error("Error parsing P2P data from client", err);
        }
      });

      conn.on("close", () => {
        activeConnections = activeConnections.filter((c) => c !== conn);
        if (activeConnections.length === 0) {
          onStatusChange?.(false);
        }
      });
    });

    peer.on("error", (err) => {
      // If host ID is already taken (e.g. tab duplicate), fallback gracefully
      console.warn("PeerJS host notice:", err.type);
    });
  } catch (err) {
    console.warn("Could not start PeerJS host", err);
  }
}

/**
 * Client Mode (Client Gallery)
 * Connects to photographer host and transmits selection updates in real-time.
 */
export function startP2PClient(
  projectId: string,
  getCurrentPayload: () => P2PSelectionPayload,
  onStatusChange?: (isConnected: boolean) => void
): void {
  cleanupP2P();

  const targetHostId = `aryst-proof-${projectId.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  try {
    const peer = new Peer({ debug: 0 });
    peerInstance = peer;

    peer.on("open", () => {
      try {
        const conn = peer.connect(targetHostId, {
          reliable: true,
        });

        conn.on("open", () => {
          activeConnections = [conn];
          onStatusChange?.(true);
          // Send initial state on connection open
          const initial = getCurrentPayload();
          conn.send(initial);
        });

        conn.on("close", () => {
          activeConnections = [];
          onStatusChange?.(false);
        });

        conn.on("error", () => {
          onStatusChange?.(false);
        });
      } catch (e) {
        console.warn("Failed to connect to host peer", e);
      }
    });

    peer.on("error", (err) => {
      console.warn("PeerJS client notice:", err.type);
    });
  } catch (err) {
    console.warn("Could not start PeerJS client", err);
  }
}

/**
 * Broadcast selection change to connected photographer peers & BroadcastChannel
 */
export function broadcastSelectionUpdate(payload: P2PSelectionPayload): void {
  // 1. BroadcastChannel (instant local sync)
  const bc = getBroadcastChannel();
  if (bc) {
    try {
      bc.postMessage(payload);
    } catch {}
  }

  // 2. WebRTC DataConnection
  activeConnections.forEach((conn) => {
    try {
      if (conn.open) {
        conn.send(payload);
      }
    } catch (e) {
      console.warn("Error sending P2P update", e);
    }
  });
}
