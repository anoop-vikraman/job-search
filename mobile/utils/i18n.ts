import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from './storage';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import ml from '../locales/ml.json';
import ta from '../locales/ta.json';

const RESOURCES = {
    en: { translation: en },
    ml: { translation: ml },
    ta: { translation: ta },
    hi: { translation: hi },
};

const LANG_STORAGE_KEY = 'app_language';
const TRANSLATION_STORAGE_PREFIX = 'translation_';

const initI18n = async () => {
    // 1. Try to get user preference from MMKV (Sync is fast!)
    let language = storage.getString(LANG_STORAGE_KEY);

    if (!language) {
        // 2. Fallback to Device Language
        const deviceLanguage = getLocales()[0]?.languageCode;
        if (deviceLanguage && Object.keys(RESOURCES).includes(deviceLanguage)) {
            language = deviceLanguage;
        } else {
            language = 'en';
        }
        // Save for next time
        storage.set(LANG_STORAGE_KEY, language);
    }

    // 3. Load Cached Translations from MMKV if available (Hybrid Strategy)
    const cachedTranslation = storage.getString(TRANSLATION_STORAGE_PREFIX + language);
    let initialResource = RESOURCES[language as keyof typeof RESOURCES].translation;

    if (cachedTranslation) {
        try {
            initialResource = JSON.parse(cachedTranslation);
            // Merge User Cache over Bundled (Primitive deep merge/override)
            // Ideally we use i18next.addResourceBundle but for init we can set it directly
        } catch (e) {
            console.warn('Failed to parse cached translation', e);
        }
    }

    // Initialize i18next
    i18n.use(initReactI18next).init({
        resources: {
            ...RESOURCES,
            [language]: { translation: initialResource } // Ensure selected lang uses potentially newer cache
        },
        lng: language,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false
        }
    });

    // 4. Background Update Check
    checkForUpdates(language);
};

const checkForUpdates = async (lang: string) => {
    // Placeholder for OTA translation updates:
    //   GET /locales/manifest.json -> compare versions -> GET /locales/{lang}.json
    //   -> persist and i18n.addResourceBundle(lang, 'translation', data, true, true)
    // Intentionally a no-op until the locale CDN endpoint exists.
};

export const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    storage.set(LANG_STORAGE_KEY, lang);
    checkForUpdates(lang);
};

initI18n();

export default i18n;
