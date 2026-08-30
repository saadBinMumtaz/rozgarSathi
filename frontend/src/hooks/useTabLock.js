// frontend/src/hooks/useTabLock.js
// Day 6: Detects when two browser tabs are open on the same session.
// Uses BroadcastChannel API to communicate between tabs.
// Returns { isLocked, otherTabWarning } — the component should show a
// visible warning when isLocked becomes true.

import { useState, useEffect, useRef, useCallback } from 'react';

const CHANNEL_PREFIX = 'rozgar-sathi-tab-';

/**
 * @param {string|null} sessionId — the active session ID (null if no session yet)
 * @param {string} mode — 'behavioral' | 'technical' | 'coding'
 * @returns {{ isLocked: boolean, dismissWarning: () => void }}
 */
export const useTabLock = (sessionId, mode) => {
  const [isLocked, setIsLocked] = useState(false);
  const channelRef = useRef(null);
  const tabId = useRef(`tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  useEffect(() => {
    if (!sessionId) return;

    const channelName = `${CHANNEL_PREFIX}${mode}-${sessionId}`;
    let channel;
    try {
      channel = new BroadcastChannel(channelName);
    } catch {
      // BroadcastChannel not supported — skip tab detection
      return;
    }
    channelRef.current = channel;

    // Announce this tab's presence
    channel.postMessage({ type: 'tab-join', tabId: tabId.current });

    // Listen for other tabs
    channel.onmessage = (event) => {
      const data = event.data;
      if (data.tabId === tabId.current) return; // ignore own messages

      if (data.type === 'tab-join' || data.type === 'tab-active') {
        // Another tab is on the same session — show warning
        setIsLocked(true);
      }

      if (data.type === 'tab-leave') {
        // Other tab left — release lock
        setIsLocked(false);
      }
    };

    // Periodic heartbeat so new tabs know we're here
    const heartbeat = setInterval(() => {
      try { channel.postMessage({ type: 'tab-active', tabId: tabId.current }); } catch {}
    }, 5000);

    // Cleanup on unmount or session change
    return () => {
      clearInterval(heartbeat);
      try {
        channel.postMessage({ type: 'tab-leave', tabId: tabId.current });
        channel.close();
      } catch {}
      channelRef.current = null;
    };
  }, [sessionId, mode]);

  const dismissWarning = useCallback(() => {
    setIsLocked(false);
  }, []);

  return { isLocked, dismissWarning };
};

export default useTabLock;
