import { useCreateTweakStore } from '../store/useCreateTweakStore';
import { Tweak } from '../store/useTweaksStore';

/**
 * Load a draft tweak into the create tweak store for editing
 */
export const loadDraftIntoCreateStore = (tweak: Tweak) => {
    const store = useCreateTweakStore.getState();

    store.setTweakType(tweak.tweakType as any);
    store.setCategory(tweak.category);
    store.setDescription(tweak.description);
    store.setImages(tweak.images || []);
    store.setAudioUri(tweak.audioUri);
    store.setAddress(tweak.address);
    store.setSkills(tweak.skills || []);
    store.setLanguages(tweak.languages || []);
    store.setSchedulePreference(tweak.schedulePreference as any);
    store.setScheduleData(tweak.scheduleData);
    store.setPricingModel(tweak.pricingModel as any);
    store.setPricingData(tweak.pricingData);
};
