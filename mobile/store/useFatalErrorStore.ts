import { create } from 'zustand';

interface FatalErrorState {
    visible: boolean;
    error: Error | null;
    showError: (error: Error) => void;
    hideError: () => void;
}

export const useFatalErrorStore = create<FatalErrorState>((set) => ({
    visible: false,
    error: null,
    showError: (error) => set({ visible: true, error }),
    hideError: () => set({ visible: false, error: null }),
}));
