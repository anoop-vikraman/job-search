import { create } from 'zustand';

interface RealtimeState {
    /** True while the chat event socket is authenticated and open. */
    connected: boolean;
    setConnected: (connected: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>()((set) => ({
    connected: false,
    setConnected: (connected) => set({ connected }),
}));
