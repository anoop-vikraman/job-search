import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
    PricingData,
    ScheduleData,
    TweakAddress,
    TweakImage,
} from '../types/tweak';

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
    images: TweakImage[];
    audioUri: string | null;
    skills: string[];
    languages: string[];
    address: TweakAddress | null;
    setTitle: (title: string) => void;
    setDescription: (desc: string) => void;
    setImages: (images: TweakImage[]) => void;
    setAudioUri: (uri: string | null) => void;
    setSkills: (skills: string[]) => void;
    setLanguages: (langs: string[]) => void;
    setAddress: (address: TweakAddress | null) => void;

    // Step 5: Schedule Data
    scheduleData: ScheduleData | null;
    setScheduleData: (data: ScheduleData | null) => void;

    // Step 6 & 7: Pricing
    pricingModel: PricingModel;
    pricingData: PricingData | null;
    setPricingModel: (model: PricingModel) => void;
    setPricingData: (data: PricingData | null) => void;

    // Edit Mode Flag
    isEditMode: boolean;
    setIsEditMode: (isEdit: boolean) => void;

    // Meta
    reset: () => void;
}

const initialState = {
    tweakType: null as TweakType,
    category: null as string | null,
    suggestedCategory: null as string | null,
    schedulePreference: null as SchedulePreference,
    title: '',
    description: '',
    images: [] as TweakImage[],
    audioUri: null as string | null,
    skills: [] as string[],
    languages: [] as string[],
    address: null as TweakAddress | null,
    scheduleData: null as ScheduleData | null,
    pricingModel: null as PricingModel,
    pricingData: null as PricingData | null,
    isEditMode: false,
};

export const useCreateTweakStore = create<CreateTweakState>()(
    persist(
        (set) => ({
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
        }),
        {
            name: 'create-tweak-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
