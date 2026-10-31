import { Address } from './location';

export interface AppState {
    language: string;
    setLanguage: (lang: string) => void;
    hasFinishedOnboarding: boolean;
    completeOnboarding: () => void;
    savedAddresses: Address[];
    addAddress: (address: Address) => void;
    removeAddress: (id: string) => void;
    updateAddress: (id: string, address: Address) => void;
}
