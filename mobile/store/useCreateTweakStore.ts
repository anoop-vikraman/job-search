import { create } from 'zustand';

export type TweakType = 'remote' | 'in_person' | null;
export type SchedulePreference = 'one_day' | 'deadline' | 'few_days' | 'advanced' | null;
export type PricingModel = 'hourly' | 'quantity' | 'fixed' | 'quote' | null;

export interface CreateTweakState {
    // Step 1: Type
    tweakType: TweakType;
    setTweakType: (type: TweakType) => void;

    // Step 2: Category
    category: string | null;
    suggestedCategory: string | null;
    setCategory: (category: string | null) => void;
    setSuggestedCategory: (category: string | null) => void;

    // Step 3: Schedule Preference
    schedulePreference: SchedulePreference;
    setSchedulePreference: (pref: SchedulePreference) => void;

    // Step 4: Details
    title: string;
    description: string;
    images: any[];
    audioUri: string | null;
    skills: string[];
    languages: string[];
    address: any | null;
    setTitle: (title: string) => void;
    setDescription: (desc: string) => void;
    setImages: (images: any[]) => void;
    setAudioUri: (uri: string | null) => void;
    setSkills: (skills: string[]) => void;
    setLanguages: (langs: string[]) => void;
    setAddress: (address: any | null) => void;

    // Step 5: Schedule Data
    scheduleData: any | null; // Flexible to hold various date/time structures
    setScheduleData: (data: any | null) => void;

    // Step 6 & 7: Pricing
    pricingModel: PricingModel;
    pricingData: any | null;
    setPricingModel: (model: PricingModel) => void;
    setPricingData: (data: any | null) => void;

    // Edit Mode Flag
    isEditMode: boolean;
    setIsEditMode: (isEdit: boolean) => void;

    // Meta
    reset: () => void;
}

const initialState = {
    tweakType: null,
    category: null,
    suggestedCategory: null,
    schedulePreference: null,
    title: '',
    description: '',
    images: [],
    audioUri: null,
    skills: [],
    languages: [],
    address: null,
    scheduleData: null,
    pricingModel: null,
    pricingData: null,
    isEditMode: false,
};

export const useCreateTweakStore = create<CreateTweakState>((set) => ({
    ...initialState,
    setTweakType: (tweakType) => set({ tweakType }),
    setCategory: (category) => set({ category }),
    setSuggestedCategory: (suggestedCategory) => set({ suggestedCategory }),
    setSchedulePreference: (schedulePreference) => set({ schedulePreference }),
    setTitle: (title) => set({ title }),
    setDescription: (description) => set({ description }),
    setImages: (images) => set({ images }),
    setAudioUri: (audioUri) => set({ audioUri }),
    setSkills: (skills) => set({ skills }),
    setLanguages: (languages) => set({ languages }),
    setAddress: (address) => set({ address }),
    setScheduleData: (scheduleData) => set({ scheduleData }),
    setPricingModel: (pricingModel) => set({ pricingModel }),
    setPricingData: (pricingData) => set({ pricingData }),
    setIsEditMode: (isEditMode) => set({ isEditMode }),
    reset: () => set(initialState),
}));
