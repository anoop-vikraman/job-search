import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import DateTimePicker, { CalendarDay, DateType } from 'react-native-ui-datepicker';
import AddressListView from '../../components/Location/AddressListView';
import SavedAddressesList from '../../components/Location/SavedAddressesList';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CustomDropdown from '../../components/UI/CustomDropdown';
import CustomImageUploader from '../../components/UI/CustomImageUploader';
import CustomLabelledField from '../../components/UI/CustomLabelledField';
import CustomTimePickerInput from '../../components/UI/CustomTimePickerInput';
import CustomVoiceRecorder from '../../components/UI/CustomVoiceRecorder';
import { SwipeableSlot } from '../../components/UI/SwipeableSlot';
import { Toast } from '../../components/UI/ToastManager';
import { useConfirmationStore } from '../../store/useConfirmationStore';
import { PricingModel, SchedulePreference, useCreateTweakStore } from '../../store/useCreateTweakStore';
import { themeColors } from '../../themes/colors';
import { ScheduleSlot } from '../../types/tweak';
import { palette } from '@tweak/theme';

type MutableViewStyle = { -readonly [K in keyof ViewStyle]: ViewStyle[K] };
type MutableTextStyle = { -readonly [K in keyof TextStyle]: TextStyle[K] };

interface DaySlot {
    date: string;
    start: string;
    end: string;
    status: 'default' | 'modified';
}

const CATEGORIES: { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { name: 'Plumbing', icon: 'water', color: palette.blue500 },
    { name: 'Electrical', icon: 'flash', color: palette.amber500 },
    { name: 'Cleaning', icon: 'sparkles', color: palette.green600 },
    { name: 'Moving', icon: 'car', color: palette.indigo500 },
    { name: 'Painting', icon: 'color-palette', color: palette.pink500 },
    { name: 'Writing', icon: 'document-text', color: palette.purple500 },
    { name: 'Design', icon: 'brush', color: palette.orange500 },
    { name: 'Coding', icon: 'code-slash', color: palette.teal500 },
    { name: 'Others', icon: 'add', color: palette.gray400 }
];

const SKILLS_LIST = [
    { value: 'Plumbing', label: 'Plumbing' },
    { value: 'Electrical Wiring', label: 'Electrical Wiring' },
    { value: 'Carpentry', label: 'Carpentry' },
    { value: 'Heavy Lifting', label: 'Heavy Lifting' },
    { value: 'Driving', label: 'Driving' },
    { value: 'Others', label: 'Others' },
];

const LANGUAGES_LIST = [
    { value: 'English', label: 'English' },
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Malayalam', label: 'Malayalam' },
    { value: 'Tamil', label: 'Tamil' },
    { value: 'Telugu', label: 'Telugu' },
    { value: 'Kannada', label: 'Kannada' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EditTweak(): React.JSX.Element {
    const router = useRouter();

    // Get data from Zustand store
    const {
        category,
        description,
        images,
        audioUri,
        address,
        skills,
        languages,
        schedulePreference,
        scheduleData,
        pricingModel,
        pricingData,
        tweakType,
        setDescription,
        setImages,
        setAudioUri,
        setAddress,
        setSkills,
        setLanguages,
        setTweakType,
        setCategory,
        setSchedulePreference,
        setScheduleData,
        setPricingModel,
        setPricingData,
        setIsEditMode,
    } = useCreateTweakStore();

    const stepperRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
    const [showAddressList, setShowAddressList] = useState(false);
    const [invalidSteps, setInvalidSteps] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Local state for all steps
    const [localTweakType, setLocalTweakType] = useState(tweakType);
    const [localAddress, setLocalAddress] = useState(address);
    const [localCategory, setLocalCategory] = useState(category || '');

    const [localDescription, setLocalDescription] = useState(description || '');

    // Form data for submission
    const [localImages, setLocalImages] = useState(images || []);
    const [localAudioUri, setLocalAudioUri] = useState(audioUri || null);
    const [localSkills, setLocalSkills] = useState<string[]>(skills || []);
    const [localLanguages, setLocalLanguages] = useState<string[]>(languages || []);
    const [localSchedulePreference, setLocalSchedulePreference] = useState<SchedulePreference>(schedulePreference || 'one_day');
    const [localPricingModel, setLocalPricingModel] = useState<PricingModel>(pricingModel || 'quote');
    const [localPricingData, setLocalPricingData] = useState(pricingData);

    // Schedule specific states
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(scheduleData?.date ? dayjs(scheduleData.date) : null);
    const [timeSlots, setTimeSlots] = useState<{ start: string, end: string }[]>(scheduleData?.timeSlots || []);
    const [deadlineSlots, setDeadlineSlots] = useState<ScheduleSlot[]>(scheduleData?.deadlineSlots || []);
    const [activeDeadlineSlot, setActiveDeadlineSlot] = useState<number | null>(null);
    const [fewDaysSlots, setFewDaysSlots] = useState<ScheduleSlot[]>(scheduleData?.fewDaysSlots || []);
    const [activeFewDaysSlot, setActiveFewDaysSlot] = useState<number | null>(null);
    const [calMonth, setCalMonth] = useState(dayjs().month());
    const [calYear, setCalYear] = useState(dayjs().year());
    const [showValidation, setShowValidation] = useState(false);

    // Pricing specific states
    const [hourlyRate, setHourlyRate] = useState(pricingModel === 'hourly' ? pricingData?.price?.toString() || '' : '');
    const [quantityName, setQuantityName] = useState(pricingModel === 'quantity' ? pricingData?.itemName || '' : '');
    const [quantityCount, setQuantityCount] = useState(pricingModel === 'quantity' ? pricingData?.quantity?.toString() || '1' : '1');
    const [quantityPricePerItem, setQuantityPricePerItem] = useState(pricingModel === 'quantity' ? pricingData?.pricePerItem?.toString() || '' : '');
    const [fixedPrice, setFixedPrice] = useState(pricingModel === 'fixed' ? pricingData?.price?.toString() || '' : '');
    const [hasPriceInMind, setHasPriceInMind] = useState<boolean | null>(pricingModel === 'quote' ? false : (pricingModel ? true : null));

    const confirm = useConfirmationStore(state => state.confirm);

    // Helper function to calculate hours from time strings
    const calculateHours = (start: string, end: string): number => {
        if (!start || !end) return 0;
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        return (endMinutes - startMinutes) / 60;
    };

    // Helper function to get total hours for few_days mode
    const getTotalHours = (): number => {
        return fewDaysSlots.reduce((total, slot) => {
            return total + calculateHours(slot.start, slot.end);
        }, 0);
    };

    const isCurrentMonth = calMonth === dayjs().month() && calYear === dayjs().year();

    const goNextMonth = useCallback(() => {
        setCalMonth(m => {
            if (m === 11) {
                setCalYear(y => y + 1);
                return 0;
            }
            return m + 1;
        });
    }, []);

    const goPrevMonth = useCallback(() => {
        setCalMonth(m => {
            if (m === 0) {
                setCalYear(y => y - 1);
                return 11;
            }
            return m - 1;
        });
    }, []);

    const deadlineSlotsMap = useMemo(() => {
        const map = new Map();
        deadlineSlots.forEach(slot => {
            map.set(slot.date, slot);
        });
        return map;
    }, [deadlineSlots]);

    const fewDaysSlotsMap = useMemo(() => {
        const map = new Map();
        fewDaysSlots.forEach((slot, index) => {
            map.set(slot.date, { slot, index });
        });
        return map;
    }, [fewDaysSlots]);



    // Set edit mode flag on mount
    React.useEffect(() => {
        setIsEditMode(true);
        // Initialization for pricing hasPriceInMind
        if (pricingModel) {
            setHasPriceInMind(pricingModel !== 'quote');
        }
        return () => {
            setIsEditMode(false);
        };
    }, [setIsEditMode, pricingModel]);

    const formatScheduleInfo = () => {
        if (!scheduleData) return 'Not set';

        if (schedulePreference === 'one_day' && scheduleData.date) {
            return `One Day - ${new Date(scheduleData.date).toLocaleDateString()}`;
        } else if (schedulePreference === 'deadline' && scheduleData.deadlineSlots) {
            return `Deadline - ${scheduleData.deadlineSlots.length} slots`;
        } else if (schedulePreference === 'few_days' && scheduleData.fewDaysSlots) {
            return `Few Days - ${scheduleData.fewDaysSlots.length} slots`;
        }
        return 'Not set';
    };

    const formatPricingInfo = () => {
        if (!pricingData) {
            return pricingModel === 'quote' ? 'Applicant to Quote' : 'Not set';
        }

        if (pricingModel === 'fixed') {
            return `Fixed - ₹${pricingData.price}`;
        } else if (pricingModel === 'hourly') {
            return `Hourly - ₹${pricingData.price}/hr`;
        } else if (pricingModel === 'quantity') {
            return `Per ${pricingData.itemName} - ₹${pricingData.pricePerItem}`;
        }
        return 'Not set';
    };

    const validateStep = (stepId: string) => {
        switch (stepId) {
            case 'type': return !!localTweakType;
            case 'location': return localTweakType === 'remote' || !!localAddress;
            case 'category': return !!localCategory;
            case 'details': return localDescription.trim().length > 0;
            case 'timeline': return !!localSchedulePreference;
            case 'schedule': return (
                (localSchedulePreference === 'one_day' && !!selectedDate && (timeSlots.length === 0 || timeSlots.every(s => s.start && s.end))) ||
                (localSchedulePreference === 'deadline' && deadlineSlots.length > 0) ||
                (localSchedulePreference === 'few_days' && fewDaysSlots.length > 0)
            );
            case 'pricing': return !!localPricingModel && (
                localPricingModel === 'quote' ||
                (localPricingModel === 'hourly' && !!hourlyRate && !isNaN(parseFloat(hourlyRate))) ||
                (localPricingModel === 'fixed' && !!fixedPrice && !isNaN(parseFloat(fixedPrice))) ||
                (localPricingModel === 'quantity' && !!quantityName && !!quantityCount && !!quantityPricePerItem && !isNaN(parseFloat(quantityPricePerItem)))
            );
            default: return true;
        }
    };

    const cards: { id: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { id: 'type', title: 'Tweak Type', icon: 'apps-outline' },
        { id: 'location', title: 'Location', icon: 'location-outline' },
        { id: 'category', title: 'Category', icon: 'grid-outline' },
        { id: 'details', title: 'Details', icon: 'document-text-outline' },
        { id: 'timeline', title: 'Timeline', icon: 'options-outline' },
        { id: 'schedule', title: 'Schedule', icon: 'calendar-outline' },
        { id: 'pricing', title: 'Pricing', icon: 'wallet-outline' }
    ];

    const renderCardContent = (cardId: string) => {
        switch (cardId) {
            case 'type':
                return (
                    <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 24, flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.gray900, marginBottom: 4 }}>How should this be done?</Text>
                        <Text style={{ color: palette.gray500, marginBottom: 24 }}>Physical presence or online?</Text>
                        <View style={{ gap: 16 }}>
                            <TouchableOpacity
                                onPress={() => setLocalTweakType('in_person')}
                                activeOpacity={0.9}
                                style={{
                                    padding: 24,
                                    borderRadius: 32,
                                    borderWidth: 2,
                                    borderColor: localTweakType === 'in_person' ? palette.brand500 : palette.gray100,
                                    backgroundColor: localTweakType === 'in_person' ? palette.brand500 + '08' : 'white',
                                    overflow: 'hidden',
                                    elevation: localTweakType === 'in_person' ? 0 : 1,
                                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: localTweakType === 'in_person' ? 0 : 0.05, shadowRadius: 2
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: palette.orange100, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 20 }}>
                                        <Ionicons name="location" size={28} color={palette.orange500} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: localTweakType === 'in_person' ? palette.brand500 : palette.gray900 }}>On-site</Text>
                                        <Text style={{ color: palette.gray500, fontSize: 13, marginTop: 4 }}>Requires physical presence at a specific location.</Text>
                                    </View>

                                    <View style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        borderWidth: 2,
                                        borderColor: localTweakType === 'in_person' ? palette.brand500 : palette.gray300,
                                        backgroundColor: localTweakType === 'in_person' ? palette.brand500 : 'white',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {localTweakType === 'in_person' && (
                                            <Ionicons name="checkmark" size={14} color="white" />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setLocalTweakType('remote')}
                                activeOpacity={0.9}
                                style={{
                                    padding: 24,
                                    borderRadius: 32,
                                    borderWidth: 2,
                                    borderColor: localTweakType === 'remote' ? palette.brand500 : palette.gray100,
                                    backgroundColor: localTweakType === 'remote' ? palette.brand500 + '08' : 'white',
                                    overflow: 'hidden',
                                    elevation: localTweakType === 'remote' ? 0 : 1,
                                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: localTweakType === 'remote' ? 0 : 0.05, shadowRadius: 2
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: palette.blue100, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 20 }}>
                                        <Ionicons name="laptop-outline" size={28} color={palette.blue500} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: localTweakType === 'remote' ? palette.brand500 : palette.gray900 }}>Remote</Text>
                                        <Text style={{ color: palette.gray500, fontSize: 13, marginTop: 4 }}>Work can be done digitally from anywhere.</Text>
                                    </View>

                                    <View style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        borderWidth: 2,
                                        borderColor: localTweakType === 'remote' ? palette.brand500 : palette.gray300,
                                        backgroundColor: localTweakType === 'remote' ? palette.brand500 : 'white',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {localTweakType === 'remote' && (
                                            <Ionicons name="checkmark" size={14} color="white" />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 'location':
                return (
                    <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 24, flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.gray900, marginBottom: 4 }}>Where is the tweak?</Text>
                        <Text style={{ color: palette.gray500, marginBottom: 24 }}>Choose a saved address or add a new one.</Text>
                        {localTweakType === 'remote' ? (
                            <View style={{ backgroundColor: palette.blue100, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: palette.blue200, alignItems: 'center' }}>
                                <Ionicons name="information-circle-outline" size={40} color={themeColors.primary} />
                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.primary, marginTop: 16 }}>Remote Tweak</Text>
                                <Text style={{ color: palette.blue800, textAlign: 'center', marginTop: 8 }}>
                                    No physical address needed for digital or remote tasks.
                                </Text>
                            </View>
                        ) : (
                            <AddressListView
                                onSelect={(addr) => setLocalAddress(addr)}
                                currentAddressId={localAddress?.id}
                                onAddAddress={() => router.push('/create-tweak/select-location')}
                                onEditAddress={(addr) => {
                                    router.push({
                                        pathname: '/create-tweak/select-location',
                                        params: { editAddress: JSON.stringify(addr) }
                                    });
                                }}
                            />
                        )}
                    </View>
                );
            case 'category':
                return (
                    <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 24, flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.gray900, marginBottom: 4 }}>Select category</Text>
                        <Text style={{ color: palette.gray500, marginBottom: 24 }}>What best describes this task?</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.name}
                                    onPress={() => setLocalCategory(cat.name)}
                                    activeOpacity={0.9}
                                    style={{
                                        width: '48%',
                                        backgroundColor: localCategory === cat.name ? palette.brand500 + '08' : 'white',
                                        padding: 16,
                                        borderRadius: 20,
                                        borderWidth: 2,
                                        borderColor: localCategory === cat.name ? palette.brand500 : palette.gray100,
                                        marginBottom: 16,
                                        overflow: 'hidden',
                                        elevation: localCategory === cat.name ? 0 : 1,
                                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: localCategory === cat.name ? 0 : 0.05, shadowRadius: 2
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <View style={{ backgroundColor: cat.color + '15', width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name={cat.icon} size={20} color={cat.color} />
                                        </View>
                                        {localCategory === cat.name && (
                                            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: palette.brand500, alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="checkmark" size={14} color="white" />
                                            </View>
                                        )}
                                    </View>
                                    <Text style={{ fontWeight: 'bold', color: localCategory === cat.name ? palette.brand500 : palette.gray700, fontSize: 14 }}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 'details':
                return (
                    <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 24, flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.gray900, marginBottom: 4 }}>Tweak Details</Text>
                        <Text style={{ color: palette.gray500, marginBottom: 24 }}>Describe what needs to be done.</Text>
                        <View style={{ marginBottom: 32 }}>
                            <CustomLabelledField
                                label="Task Description"
                                value={localDescription}
                                onChangeText={setLocalDescription}
                                multiline
                                placeholder="Describe your tweak..."
                                containerStyle={{ marginBottom: 24 }}
                                maxLength={1000}
                                showCharCount
                                error={invalidSteps.includes('details') && localDescription.trim().length === 0 ? 'Description is required' : undefined}
                            />
                        </View>
                        <View style={{ marginBottom: 32 }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: palette.gray400, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Voice Instructions</Text>
                            <CustomVoiceRecorder
                                uri={localAudioUri}
                                onRecordingComplete={setLocalAudioUri}
                            />
                        </View>
                        <View style={{ marginBottom: 32 }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: palette.gray400, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Photos</Text>
                            <CustomImageUploader
                                images={localImages}
                                onImagesChange={setLocalImages}
                                maxImages={6}
                            />
                        </View>
                        <View style={{ gap: 24, marginBottom: 32 }}>
                            <CustomDropdown
                                label="Required Skills"
                                options={SKILLS_LIST}
                                value={localSkills}
                                onChange={(value) => setLocalSkills(Array.isArray(value) ? value : [value])}
                                multiSelect
                                placeholder="Select skills"
                            />
                            <CustomDropdown
                                label="Preferred Languages"
                                options={LANGUAGES_LIST}
                                value={localLanguages}
                                onChange={(value) => setLocalLanguages(Array.isArray(value) ? value : [value])}
                                multiSelect
                                placeholder="Select languages"
                            />
                        </View>
                    </View>
                );
            case 'timeline':
                return (
                    <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 24, flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.gray900, marginBottom: 4 }}>Select Timeline</Text>
                        <Text style={{ color: palette.gray500, marginBottom: 32 }}>Choose a scheduling preference.</Text>
                        <View style={{ gap: 16 }}>
                            {([
                                { id: 'one_day', icon: 'calendar', title: 'Single Day Job', description: 'Best for quick tasks done in one visit.', color: palette.blue500 },
                                { id: 'deadline', icon: 'timer-outline', title: 'By a Deadline', description: 'Task must be completed by a specific date.', color: palette.pink500 },
                                { id: 'few_days', icon: 'calendar-number-outline', title: 'Multi-day Project', description: 'Ideal for larger jobs spanning several days.', color: palette.green600 },
                            ] as { id: string; icon: keyof typeof Ionicons.glyphMap; title: string; description: string; color: string }[]).map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => {
                                        if (localSchedulePreference !== item.id) {
                                            setLocalSchedulePreference(item.id as SchedulePreference);
                                            // Reset schedule data when preference changes
                                            setSelectedDate(null);
                                            setTimeSlots([]);
                                            setDeadlineSlots([]);
                                            setFewDaysSlots([]);
                                            setActiveDeadlineSlot(null);
                                            setActiveFewDaysSlot(null);
                                        }
                                    }}
                                    activeOpacity={0.9}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 20,
                                        backgroundColor: localSchedulePreference === item.id ? palette.brand500 + '08' : 'white',
                                        borderRadius: 24,
                                        borderWidth: 2,
                                        borderColor: localSchedulePreference === item.id ? palette.brand500 : palette.gray100,
                                        marginBottom: 16,
                                        overflow: 'hidden',
                                        elevation: localSchedulePreference === item.id ? 0 : 1,
                                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: localSchedulePreference === item.id ? 0 : 0.05, shadowRadius: 2
                                    }}
                                >
                                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: item.color + '15', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                        <Ionicons name={item.icon} size={22} color={item.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: localSchedulePreference === item.id ? palette.brand500 : palette.gray900 }}>{item.title}</Text>
                                        <Text style={{ fontSize: 12, color: palette.gray500, marginTop: 2 }}>{item.description}</Text>
                                    </View>

                                    <View style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        borderWidth: 2,
                                        borderColor: localSchedulePreference === item.id ? palette.brand500 : palette.gray300,
                                        backgroundColor: localSchedulePreference === item.id ? palette.brand500 : 'white',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {localSchedulePreference === item.id && (
                                            <Ionicons name="checkmark" size={14} color="white" />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 'schedule':
                const renderSchedulePicker = () => {
                    switch (localSchedulePreference) {
                        case 'one_day':
                            return (
                                <View>
                                    <View style={{ backgroundColor: palette.blue50, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: palette.blue200, flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                        <Ionicons name="information-circle" size={18} color={palette.blue500} />
                                        <Text style={{ fontSize: 13, color: palette.blue800, marginLeft: 8, flex: 1 }}>
                                            Tap the month/year to change them
                                        </Text>
                                    </View>

                                    <View style={{ backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: showValidation && !selectedDate ? palette.red500 : palette.gray100, marginBottom: 16, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
                                        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4 }}>
                                                {isCurrentMonth ? <View style={{ width: 36 }} /> : (
                                                    <TouchableOpacity onPress={goPrevMonth} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Previous month">
                                                        <Ionicons name="chevron-back" size={20} color={palette.brand500} />
                                                    </TouchableOpacity>
                                                )}
                                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: palette.gray800 }}>
                                                    {dayjs().month(calMonth).year(calYear).format('MMMM YYYY')}
                                                </Text>
                                                <TouchableOpacity onPress={goNextMonth} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Next month">
                                                    <Ionicons name="chevron-forward" size={20} color={palette.brand500} />
                                                </TouchableOpacity>
                                            </View>
                                            <DateTimePicker
                                                key={`oneday-${calYear}-${calMonth}`}
                                                mode="single"
                                                date={selectedDate || dayjs()}
                                                minDate={dayjs().startOf('day').toDate()}
                                                onChange={(params: { date: DateType }) => {
                                                    if (params.date) {
                                                        const d = dayjs(params.date);
                                                        setSelectedDate(d);
                                                        setCalMonth(d.month());
                                                        setCalYear(d.year());
                                                        setShowValidation(false);
                                                    }
                                                }}
                                                month={calMonth}
                                                year={calYear}
                                                hideHeader={true}
                                                timePicker={false}
                                                components={{
                                                    Day: ({ date, isToday }: CalendarDay) => {
                                                        const dateObj = dayjs(date);
                                                        const dateStr = dateObj.format('YYYY-MM-DD');
                                                        const isSelected = selectedDate && dateStr === selectedDate.format('YYYY-MM-DD');
                                                        const isBeforeToday = dateObj.isBefore(dayjs().startOf('day'));

                                                        const containerStyle: MutableViewStyle = {
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 8,
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                        };

                                                        const textStyle: MutableTextStyle = {
                                                            fontSize: 14,
                                                            color: isBeforeToday ? palette.gray300 : palette.gray700,
                                                            fontWeight: '500'
                                                        };

                                                        if (isSelected) {
                                                            containerStyle.backgroundColor = palette.brand500;
                                                            textStyle.color = palette.white;
                                                            textStyle.fontWeight = 'bold';
                                                        } else if (isToday) {
                                                            containerStyle.borderWidth = 1;
                                                            containerStyle.borderColor = palette.brand500;
                                                            textStyle.color = palette.brand500;
                                                            textStyle.fontWeight = 'bold';
                                                        }

                                                        return (
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    if (isBeforeToday) return;
                                                                    const newDate = dayjs(date);
                                                                    setSelectedDate(newDate);
                                                                    setShowValidation(false);
                                                                }}
                                                                style={containerStyle}
                                                                activeOpacity={isBeforeToday ? 1 : 0.7}
                                                                disabled={isBeforeToday}
                                                            >
                                                                <Text style={textStyle}>{dayjs(date).date()}</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    }
                                                }}
                                            />
                                        </View>
                                        {selectedDate && (
                                            <View style={{ backgroundColor: palette.gray50, borderTopWidth: 1, borderTopColor: palette.gray100, paddingVertical: 8, alignItems: 'center' }}>
                                                <Text style={{ fontSize: 10, color: palette.gray500, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                                                    Selected: <Text style={{ color: palette.brand500 }}>{selectedDate.format('MMMM DD, YYYY')}</Text>
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {selectedDate && (
                                        <View style={{ marginBottom: 16 }}>
                                            {timeSlots.length === 0 ? (
                                                <TouchableOpacity
                                                    onPress={() => setTimeSlots([{ start: '09:00', end: '17:00' }])}
                                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: 'white', borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: palette.gray200 }}
                                                >
                                                    <View style={{ backgroundColor: palette.brand500, borderRadius: 8, padding: 6, marginRight: 10 }}>
                                                        <Ionicons name="time" size={18} color="white" />
                                                    </View>
                                                    <Text style={{ color: palette.brand500, fontWeight: 'bold' }}>Add Available Time</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View>
                                                    {timeSlots.map((slot, index) => (
                                                        <View key={index} style={{
                                                            marginBottom: 12, padding: 16, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: palette.gray100,
                                                            elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2
                                                        }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: palette.gray400, marginBottom: 4, letterSpacing: 1 }}>START</Text>
                                                                    <CustomTimePickerInput
                                                                        value={slot.start}
                                                                        onChange={(t) => {
                                                                            const s = [...timeSlots];
                                                                            s[index].start = t;
                                                                            setTimeSlots(s);
                                                                        }}
                                                                    />
                                                                </View>
                                                                <Text style={{ marginTop: 20, color: palette.gray300 }}>-</Text>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: palette.gray400, marginBottom: 4, letterSpacing: 1 }}>END</Text>
                                                                    <CustomTimePickerInput
                                                                        value={slot.end}
                                                                        onChange={(t) => {
                                                                            const s = [...timeSlots];
                                                                            s[index].end = t;
                                                                            setTimeSlots(s);
                                                                        }}
                                                                    />
                                                                </View>
                                                                <TouchableOpacity
                                                                    onPress={() => {
                                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                        setTimeSlots(timeSlots.filter((_, i) => i !== index));
                                                                    }}
                                                                    style={{
                                                                        marginTop: 20,
                                                                        width: 32,
                                                                        height: 32,
                                                                        borderRadius: 10,
                                                                        backgroundColor: palette.red50,
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center',
                                                                        borderWidth: 1,
                                                                        borderColor: palette.red100
                                                                    }}
                                                                    accessibilityRole="button"
                                                                    accessibilityLabel="Remove time slot"
                                                                >
                                                                    <Ionicons name="close" size={18} color={palette.red500} />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    ))}
                                                    {timeSlots.length < 3 && (
                                                        <TouchableOpacity
                                                            onPress={() => setTimeSlots([...timeSlots, { start: '09:00', end: '17:00' }])}
                                                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: palette.brand500 + '08', borderRadius: 16, borderWidth: 1, borderColor: palette.brand500 + '30', borderStyle: 'dashed' }}
                                                        >
                                                            <Ionicons name="add" size={18} color={palette.brand500} style={{ marginRight: 6 }} />
                                                            <Text style={{ color: palette.brand500, fontWeight: 'bold', fontSize: 14 }}>Add Another Slot</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        case 'deadline':
                            return (
                                <View>
                                    <View style={{ backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: showValidation && !selectedDate ? palette.red500 : palette.gray100, marginBottom: 16, overflow: 'hidden', elevation: 1 }}>
                                        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4 }}>
                                                {isCurrentMonth ? <View style={{ width: 36 }} /> : (
                                                    <TouchableOpacity onPress={goPrevMonth} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Previous month">
                                                        <Ionicons name="chevron-back" size={20} color={palette.brand500} />
                                                    </TouchableOpacity>
                                                )}
                                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: palette.gray800 }}>
                                                    {dayjs().month(calMonth).year(calYear).format('MMMM YYYY')}
                                                </Text>
                                                <TouchableOpacity onPress={goNextMonth} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Next month">
                                                    <Ionicons name="chevron-forward" size={20} color={palette.brand500} />
                                                </TouchableOpacity>
                                            </View>
                                            <DateTimePicker
                                                key={`deadline-${calYear}-${calMonth}`}
                                                mode="single"
                                                date={selectedDate || dayjs()}
                                                minDate={dayjs().startOf('day').toDate()}
                                                onChange={(params: { date: DateType }) => {
                                                    if (params.date) {
                                                        const d = dayjs(params.date);
                                                        setSelectedDate(d);
                                                        setCalMonth(d.month());
                                                        setCalYear(d.year());

                                                        const today = dayjs().startOf('day');
                                                        const daysDiff = d.startOf('day').diff(today, 'day');
                                                        const newSlots: DaySlot[] = [];
                                                        for (let i = 0; i <= Math.max(0, daysDiff); i++) {
                                                            newSlots.push({
                                                                date: today.add(i, 'day').format('YYYY-MM-DD'),
                                                                start: '09:00',
                                                                end: '17:00',
                                                                status: 'default'
                                                            });
                                                        }
                                                        setDeadlineSlots(newSlots);
                                                        setActiveDeadlineSlot(null);
                                                        setShowValidation(false);
                                                    }
                                                }}
                                                month={calMonth}
                                                year={calYear}
                                                hideHeader={true}
                                                timePicker={false}
                                                components={{
                                                    Day: ({ date, isToday }: CalendarDay) => {
                                                        const dateObj = dayjs(date);
                                                        const dateStr = dateObj.format('YYYY-MM-DD');
                                                        const isDeadline = selectedDate && dateStr === selectedDate.format('YYYY-MM-DD');
                                                        const slot = deadlineSlots.find(s => s.date === dateStr);
                                                        const isBeforeToday = dateObj.isBefore(dayjs().startOf('day'));

                                                        const containerStyle: MutableViewStyle = {
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 8,
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                        };

                                                        const textStyle: MutableTextStyle = {
                                                            fontSize: 14,
                                                            color: isBeforeToday ? palette.gray300 : palette.gray700,
                                                            fontWeight: '500'
                                                        };

                                                        if (isDeadline) {
                                                            containerStyle.backgroundColor = palette.brand500;
                                                            textStyle.color = palette.white;
                                                            textStyle.fontWeight = 'bold';
                                                        } else if (slot) {
                                                            containerStyle.borderWidth = 1;
                                                            containerStyle.borderColor = slot.status === 'modified' ? palette.green600 : palette.brand500;
                                                            textStyle.fontWeight = '600';
                                                        } else if (isToday) {
                                                            containerStyle.borderWidth = 1;
                                                            containerStyle.borderColor = palette.brand500;
                                                            textStyle.color = palette.brand500;
                                                            textStyle.fontWeight = 'bold';
                                                        }

                                                        return (
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    if (isBeforeToday) return;
                                                                    const newDate = dayjs(date);
                                                                    setSelectedDate(newDate);

                                                                    // Generate slots from Today to Deadline (inclusive)
                                                                    const today = dayjs().startOf('day');
                                                                    const daysDiff = newDate.startOf('day').diff(today, 'day');
                                                                    const newSlots: DaySlot[] = [];
                                                                    for (let i = 0; i <= Math.max(0, daysDiff); i++) {
                                                                        newSlots.push({
                                                                            date: today.add(i, 'day').format('YYYY-MM-DD'),
                                                                            start: '09:00',
                                                                            end: '17:00',
                                                                            status: 'default'
                                                                        });
                                                                    }
                                                                    setDeadlineSlots(newSlots);
                                                                    setActiveDeadlineSlot(null);
                                                                    setShowValidation(false);
                                                                }}
                                                                style={containerStyle}
                                                                activeOpacity={isBeforeToday ? 1 : 0.7}
                                                                disabled={isBeforeToday}
                                                            >
                                                                <Text style={textStyle}>{dayjs(date).date()}</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    }
                                                }}
                                            />
                                        </View>
                                        {selectedDate && (
                                            <View style={{ backgroundColor: palette.green50, borderTopWidth: 1, borderTopColor: palette.green100, paddingVertical: 8, alignItems: 'center' }}>
                                                <Text style={{ fontSize: 10, color: palette.green800, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                    Deadline: <Text style={{ color: palette.brand500 }}>{selectedDate.format('MMMM DD, YYYY')}</Text>
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {deadlineSlots.length > 0 && (
                                        <View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4, gap: 4 }}>
                                                <Ionicons name="arrow-up" size={10} color={palette.gray400} />
                                                <Text style={{ fontSize: 9, color: palette.gray400, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Slide up to delete</Text>
                                            </View>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ paddingBottom: 8, paddingRight: 20 }}>
                                                {deadlineSlots.map((slot, index) => {
                                                    const isActive = activeDeadlineSlot === index;
                                                    const slotDate = dayjs(slot.date);
                                                    return (
                                                        <SwipeableSlot
                                                            key={slot.date}
                                                            onDelete={() => {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                const newSlots = deadlineSlots.filter((_, i) => i !== index);
                                                                setDeadlineSlots(newSlots);
                                                                if (newSlots.length === 0) setSelectedDate(null);
                                                                if (isActive) setActiveDeadlineSlot(null);
                                                            }}
                                                        >
                                                            <TouchableOpacity
                                                                onPress={() => setActiveDeadlineSlot(index)}
                                                                style={{
                                                                    marginRight: 12, padding: 12, borderRadius: 20, borderWidth: isActive ? 2 : 1, width: 120,
                                                                    borderColor: isActive ? palette.brand500 : (slot.status === 'modified' ? palette.green600 : palette.brand500),
                                                                    backgroundColor: isActive ? palette.brand500 + '05' : 'white',
                                                                    elevation: isActive ? 0 : 1,
                                                                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isActive ? 0 : 0.05, shadowRadius: 2,
                                                                    overflow: 'hidden',
                                                                    marginTop: 4,
                                                                    marginBottom: 2
                                                                }}
                                                            >
                                                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: palette.gray500, textTransform: 'uppercase', marginBottom: 2 }}>{slotDate.format('ddd')}</Text>
                                                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: palette.gray800, marginBottom: 6 }}>{slotDate.format('DD MMM')}</Text>

                                                                <View>
                                                                    <Text style={{ fontSize: 11, color: palette.gray600 }}>{dayjs(slot.date + ' ' + slot.start).format('hh:mm a')}</Text>
                                                                    <Text style={{ fontSize: 11, color: palette.gray600 }}>{dayjs(slot.date + ' ' + slot.end).format('hh:mm a')}</Text>
                                                                </View>
                                                                {slot.status === 'modified' && (
                                                                    <View style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green600 }} />
                                                                )}
                                                            </TouchableOpacity>
                                                        </SwipeableSlot>
                                                    );
                                                })}
                                            </ScrollView>

                                            {activeDeadlineSlot !== null && deadlineSlots[activeDeadlineSlot] && (
                                                <View style={{ backgroundColor: palette.gray50, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: palette.gray100 }}>
                                                    <Text style={{ fontWeight: 'bold', marginBottom: 12 }}>Edit {dayjs(deadlineSlots[activeDeadlineSlot].date).format('MMM DD')}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                        <View style={{ flex: 1 }}>
                                                            <CustomTimePickerInput
                                                                value={deadlineSlots[activeDeadlineSlot].start}
                                                                onChange={(t) => {
                                                                    const s = [...deadlineSlots];
                                                                    s[activeDeadlineSlot].start = t;
                                                                    s[activeDeadlineSlot].status = 'modified';
                                                                    setDeadlineSlots(s);
                                                                }}
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <CustomTimePickerInput
                                                                value={deadlineSlots[activeDeadlineSlot].end}
                                                                onChange={(t) => {
                                                                    const s = [...deadlineSlots];
                                                                    s[activeDeadlineSlot].end = t;
                                                                    s[activeDeadlineSlot].status = 'modified';
                                                                    setDeadlineSlots(s);
                                                                }}
                                                            />
                                                        </View>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        case 'few_days':
                            return (
                                <View>
                                    <View style={{ backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: showValidation && fewDaysSlots.length === 0 ? palette.red500 : palette.gray100, marginBottom: 16, overflow: 'hidden', elevation: 1 }}>
                                        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4 }}>
                                                {isCurrentMonth ? <View style={{ width: 36 }} /> : (
                                                    <TouchableOpacity onPress={goPrevMonth} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Previous month">
                                                        <Ionicons name="chevron-back" size={20} color={palette.brand500} />
                                                    </TouchableOpacity>
                                                )}
                                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: palette.gray800 }}>
                                                    {dayjs().month(calMonth).year(calYear).format('MMMM YYYY')}
                                                </Text>
                                                <TouchableOpacity onPress={goNextMonth} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Next month">
                                                    <Ionicons name="chevron-forward" size={20} color={palette.brand500} />
                                                </TouchableOpacity>
                                            </View>
                                            <DateTimePicker
                                                key={`fewdays-${calYear}-${calMonth}`}
                                                mode="multiple"
                                                month={calMonth}
                                                year={calYear}
                                                minDate={dayjs().startOf('day').toDate()}
                                                hideHeader={true}
                                                timePicker={false}
                                                onChange={(params: { dates: DateType[]; datePressed?: DateType; change: 'added' | 'removed' | 'updated' }) => {
                                                    // Selection logic is handled in custom Day component
                                                }}
                                                components={{
                                                    Day: ({ date, isToday }: CalendarDay) => {
                                                        const dateStr = dayjs(date).format('YYYY-MM-DD');
                                                        const slotData = fewDaysSlotsMap.get(dateStr);
                                                        const isSelected = !!slotData;
                                                        const isBeforeToday = dayjs(date).isBefore(dayjs().startOf('day'));

                                                        const containerStyle: MutableViewStyle = {
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 8,
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                        };

                                                        const textStyle: MutableTextStyle = {
                                                            fontSize: 14,
                                                            color: isSelected ? 'white' : (isBeforeToday ? palette.gray300 : palette.gray700),
                                                            fontWeight: isSelected || isToday ? 'bold' : 'normal'
                                                        };

                                                        if (isSelected) {
                                                            containerStyle.backgroundColor = palette.brand500;
                                                        } else if (isToday) {
                                                            containerStyle.borderWidth = 1;
                                                            containerStyle.borderColor = palette.brand500;
                                                            textStyle.color = palette.brand500;
                                                        }

                                                        return (
                                                            <TouchableOpacity
                                                                onPress={() => {
                                                                    if (isBeforeToday) return;
                                                                    if (isSelected) {
                                                                        const newSlots = fewDaysSlots.filter(s => s.date !== dateStr);
                                                                        setFewDaysSlots(newSlots);
                                                                        if (activeFewDaysSlot !== null && (activeFewDaysSlot >= newSlots.length || fewDaysSlots[activeFewDaysSlot]?.date === dateStr)) {
                                                                            setActiveFewDaysSlot(null);
                                                                        }
                                                                    } else {
                                                                        const newSlots = [...fewDaysSlots, { date: dateStr, start: '09:00', end: '17:00', status: 'default' as const }].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
                                                                        setFewDaysSlots(newSlots);
                                                                    }
                                                                }}
                                                                style={containerStyle}
                                                                activeOpacity={isBeforeToday ? 1 : 0.7}
                                                                disabled={isBeforeToday}
                                                            >
                                                                <Text style={textStyle}>{dayjs(date).date()}</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    }
                                                }}
                                            />
                                        </View>
                                    </View>

                                    {fewDaysSlots.length > 0 && (
                                        <View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4, gap: 4 }}>
                                                <Ionicons name="arrow-up" size={10} color={palette.gray400} />
                                                <Text style={{ fontSize: 9, color: palette.gray400, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Slide up to delete</Text>
                                            </View>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ paddingBottom: 8, paddingRight: 20 }}>
                                                {fewDaysSlots.map((slot, index) => {
                                                    const isActive = activeFewDaysSlot === index;
                                                    const slotDate = dayjs(slot.date);
                                                    const hours = calculateHours(slot.start, slot.end);
                                                    return (
                                                        <SwipeableSlot
                                                            key={slot.date}
                                                            onDelete={() => {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                const newSlots = fewDaysSlots.filter((_, i) => i !== index);
                                                                setFewDaysSlots(newSlots);
                                                                if (isActive) setActiveFewDaysSlot(null);
                                                            }}
                                                        >
                                                            <TouchableOpacity
                                                                onPress={() => setActiveFewDaysSlot(index)}
                                                                style={{
                                                                    marginRight: 12, padding: 12, borderRadius: 20, borderWidth: isActive ? 2 : 1, width: 120,
                                                                    borderColor: isActive ? palette.brand500 : (slot.status === 'modified' ? palette.green600 : palette.brand500),
                                                                    backgroundColor: isActive ? palette.brand500 + '05' : 'white',
                                                                    elevation: isActive ? 0 : 1,
                                                                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isActive ? 0 : 0.05, shadowRadius: 2,
                                                                    overflow: 'hidden',
                                                                    marginTop: 4,
                                                                    marginBottom: 2
                                                                }}
                                                            >
                                                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: palette.gray500, textTransform: 'uppercase', marginBottom: 2 }}>{slotDate.format('ddd')}</Text>
                                                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: palette.gray800, marginBottom: 6 }}>{slotDate.format('DD MMM')}</Text>

                                                                <View>
                                                                    <Text style={{ fontSize: 11, color: palette.gray600 }}>{dayjs(slot.date + ' ' + slot.start).format('hh:mm a')}</Text>
                                                                    <Text style={{ fontSize: 11, color: palette.gray600 }}>{dayjs(slot.date + ' ' + slot.end).format('hh:mm a')}</Text>
                                                                </View>

                                                                <View style={{ marginTop: 8, backgroundColor: palette.gray100, borderRadius: 8, paddingVertical: 2, alignItems: 'center' }}>
                                                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: palette.gray600 }}>{hours.toFixed(1)}h</Text>
                                                                </View>

                                                                {slot.status === 'modified' && (
                                                                    <View style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green600 }} />
                                                                )}
                                                            </TouchableOpacity>
                                                        </SwipeableSlot>
                                                    );
                                                })}
                                            </ScrollView>

                                            {activeFewDaysSlot !== null && fewDaysSlots[activeFewDaysSlot] && (
                                                <View style={{ backgroundColor: palette.gray50, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: palette.gray100 }}>
                                                    <Text style={{ fontWeight: 'bold', marginBottom: 12 }}>Edit {dayjs(fewDaysSlots[activeFewDaysSlot].date).format('MMM DD')}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                        <View style={{ flex: 1 }}>
                                                            <CustomTimePickerInput
                                                                value={fewDaysSlots[activeFewDaysSlot].start}
                                                                onChange={(t) => {
                                                                    const s = [...fewDaysSlots];
                                                                    s[activeFewDaysSlot].start = t;
                                                                    s[activeFewDaysSlot].status = 'modified';
                                                                    setFewDaysSlots(s);
                                                                }}
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <CustomTimePickerInput
                                                                value={fewDaysSlots[activeFewDaysSlot].end}
                                                                onChange={(t) => {
                                                                    const s = [...fewDaysSlots];
                                                                    s[activeFewDaysSlot].end = t;
                                                                    s[activeFewDaysSlot].status = 'modified';
                                                                    setFewDaysSlots(s);
                                                                }}
                                                            />
                                                        </View>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        default:
                            return null;
                    }
                };

                return (
                    <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 24, flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.gray900, marginBottom: 4 }}>Schedule Details</Text>
                        <Text style={{ color: palette.gray500, marginBottom: 24 }}>Set the exact days and times.</Text>
                        {renderSchedulePicker()}
                    </View>
                );
            case 'pricing':
                const renderPricingEditor = () => {
                    const PricingOption = ({ id, title, description, icon, color, isSelected, onSelect, children }: {
                        id: string;
                        title: string;
                        description: string;
                        icon: keyof typeof Ionicons.glyphMap;
                        color: string;
                        isSelected: boolean;
                        onSelect: () => void;
                        children?: React.ReactNode;
                    }) => (
                        <View
                            style={{
                                borderRadius: 24, backgroundColor: isSelected ? palette.brand500 + '08' : 'white', borderWidth: 2, marginBottom: 16,
                                borderColor: isSelected ? palette.brand500 : palette.gray100,
                                overflow: 'hidden',
                                elevation: isSelected ? 0 : 1,
                                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isSelected ? 0 : 0.05, shadowRadius: 2
                            }}
                        >
                            <TouchableOpacity
                                onPress={onSelect}
                                activeOpacity={0.7}
                                style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                    <Ionicons name={icon} size={22} color={color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: palette.gray900 }}>{title}</Text>
                                    <Text style={{ fontSize: 12, color: palette.gray500, marginTop: 2 }}>{description}</Text>
                                </View>

                                <View style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    borderWidth: 2,
                                    borderColor: isSelected ? palette.brand500 : palette.gray300,
                                    backgroundColor: isSelected ? palette.brand500 : 'white',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {isSelected && (
                                        <Ionicons name="checkmark" size={14} color="white" />
                                    )}
                                </View>
                            </TouchableOpacity>
                            {isSelected && children && (
                                <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                                    {children}
                                </View>
                            )}
                        </View>
                    );

                    return (
                        <View>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.gray700, marginBottom: 16 }}>Do you have a price in mind?</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                                <TouchableOpacity
                                    onPress={() => setHasPriceInMind(true)}
                                    style={{ flex: 1, padding: 16, borderRadius: 20, borderWidth: 2, alignItems: 'center', borderColor: hasPriceInMind === true ? themeColors.primary : palette.gray100, backgroundColor: hasPriceInMind === true ? themeColors.primary + '08' : 'white' }}
                                >
                                    <Text style={{ fontWeight: 'bold', color: hasPriceInMind === true ? themeColors.primary : palette.gray500 }}>Yes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { setHasPriceInMind(false); setLocalPricingModel('quote'); }}
                                    style={{ flex: 1, padding: 16, borderRadius: 20, borderWidth: 2, alignItems: 'center', borderColor: hasPriceInMind === false ? themeColors.primary : palette.gray100, backgroundColor: hasPriceInMind === false ? themeColors.primary + '08' : 'white' }}
                                >
                                    <Text style={{ fontWeight: 'bold', color: hasPriceInMind === false ? themeColors.primary : palette.gray500 }}>No</Text>
                                </TouchableOpacity>
                            </View>

                            {hasPriceInMind === false && (
                                <View style={{ padding: 24, backgroundColor: palette.green50, borderRadius: 24, borderWidth: 1, borderColor: palette.green100, alignItems: 'center' }}>
                                    <Ionicons name="sparkles" size={40} color={palette.green600} />
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.green800, marginTop: 12 }}>Applicants will Quote</Text>
                                    <Text style={{ textAlign: 'center', color: palette.green700, marginTop: 8 }}>They will propose their fee and you can choose the best offer.</Text>
                                </View>
                            )}

                            {hasPriceInMind === true && (
                                <View>
                                    <PricingOption
                                        id="hourly" title="Per Hour" description="Pay for time spent." icon="time" color={palette.blue500}
                                        isSelected={localPricingModel === 'hourly'} onSelect={() => setLocalPricingModel('hourly')}
                                    >
                                        <View style={{ marginTop: 8 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: palette.gray500, marginBottom: 8, letterSpacing: 0.5 }}>HOURLY RATE</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 2, borderColor: palette.gray100 }}>
                                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.gray900, marginRight: 8 }}>₹</Text>
                                                <TextInput value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" style={{ flex: 1, fontSize: 18, fontWeight: 'bold', color: palette.gray900 }} placeholder="0" />
                                            </View>
                                        </View>
                                    </PricingOption>

                                    <PricingOption
                                        id="quantity" title="By Quantity" description="Pay per unit/item." icon="cube" color={palette.green600}
                                        isSelected={localPricingModel === 'quantity'} onSelect={() => setLocalPricingModel('quantity')}
                                    >
                                        <View style={{ marginTop: 8, gap: 16 }}>
                                            <View>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: palette.gray500, marginBottom: 8, letterSpacing: 0.5 }}>ITEM NAME</Text>
                                                <TextInput
                                                    value={quantityName}
                                                    onChangeText={setQuantityName}
                                                    style={{ backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 2, borderColor: palette.gray100, fontSize: 16, fontWeight: 'bold', color: palette.gray900 }}
                                                    placeholder="e.g. Page, Bag, Box"
                                                />
                                            </View>
                                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '700', color: palette.gray500, marginBottom: 8, letterSpacing: 0.5 }}>QUANTITY</Text>
                                                    <TextInput
                                                        value={quantityCount}
                                                        onChangeText={setQuantityCount}
                                                        keyboardType="numeric"
                                                        style={{ backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 2, borderColor: palette.gray100, fontSize: 16, fontWeight: 'bold', color: palette.gray900 }}
                                                        placeholder="1"
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '700', color: palette.gray500, marginBottom: 8, letterSpacing: 0.5 }}>PRICE PER ITEM</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 2, borderColor: palette.gray100 }}>
                                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: palette.gray900, marginRight: 4 }}>₹</Text>
                                                        <TextInput
                                                            value={quantityPricePerItem}
                                                            onChangeText={setQuantityPricePerItem}
                                                            keyboardType="numeric"
                                                            style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: palette.gray900 }}
                                                            placeholder="0"
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={{ padding: 16, backgroundColor: palette.brand500 + '08', borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: palette.brand500 + '20' }}>
                                                <Text style={{ color: palette.gray500, fontSize: 14, fontWeight: '500' }}>Total Cost</Text>
                                                <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.brand500 }}>
                                                    ₹{(parseFloat(quantityCount || '0') * parseFloat(quantityPricePerItem || '0')).toLocaleString()}
                                                </Text>
                                            </View>
                                        </View>
                                    </PricingOption>

                                    <PricingOption
                                        id="fixed" title="Fixed Price" description="One flat fee." icon="pricetag" color={palette.purple500}
                                        isSelected={localPricingModel === 'fixed'} onSelect={() => setLocalPricingModel('fixed')}
                                    >
                                        <View style={{ marginTop: 8 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: palette.gray500, marginBottom: 8, letterSpacing: 0.5 }}>TOTAL AMOUNT</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 2, borderColor: palette.gray100 }}>
                                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.gray900, marginRight: 8 }}>₹</Text>
                                                <TextInput value={fixedPrice} onChangeText={setFixedPrice} keyboardType="numeric" style={{ flex: 1, fontSize: 18, fontWeight: 'bold', color: palette.gray900 }} placeholder="0" />
                                            </View>
                                        </View>
                                    </PricingOption>
                                </View>
                            )}
                        </View>
                    );
                };

                return (
                    <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 24, flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.gray900, marginBottom: 4 }}>Pricing</Text>
                        <Text style={{ color: palette.gray500, marginBottom: 24 }}>Set the compensation for this task.</Text>
                        {renderPricingEditor()}
                    </View>
                );
            default:
                return null;
        }
    };

    const scrollToStep = (index: number) => {
        if (index >= 0 && index < cards.length) {
            const previousStepId = cards[currentIndex].id;
            const isValid = validateStep(previousStepId);

            setInvalidSteps(prev => {
                if (isValid) return prev.filter(id => id !== previousStepId);
                if (!prev.includes(previousStepId)) return [...prev, previousStepId];
                return prev;
            });

            setCurrentIndex(index);

            // Auto-scroll the stepper to center the selected icon
            if (stepperRef.current) {
                // Item width (40) + Gap (12) = 52
                const itemWidth = 52;
                const xOffset = Math.max(0, (index * itemWidth) - (SCREEN_WIDTH / 2) + (itemWidth / 2));
                stepperRef.current.scrollTo({ x: xOffset, animated: true });
            }
        }
    };

    // Keep stepper scrolled to current index automatically
    useEffect(() => {
        if (stepperRef.current) {
            const itemWidth = 52;
            const xOffset = Math.max(0, (currentIndex * itemWidth) - (SCREEN_WIDTH / 2) + (itemWidth / 2));
            stepperRef.current.scrollTo({ x: xOffset, animated: true });
        }
    }, [currentIndex]);

    const handleSave = () => {
        // Validate all steps
        const errors: string[] = [];
        cards.forEach(card => {
            if (!validateStep(card.id)) {
                errors.push(card.id);
            }
        });

        if (errors.length > 0) {
            setInvalidSteps(errors);
            Toast.warning('Please complete all steps correctly before previewing');
            // Optionally scroll to the first invalid step
            const firstErrorIndex = cards.findIndex(c => c.id === errors[0]);
            scrollToStep(firstErrorIndex);
            return;
        }

        // Prepare schedule data
        let finalScheduleData = null;
        if (localSchedulePreference === 'one_day') {
            finalScheduleData = { date: selectedDate?.toISOString(), timeSlots, preference: 'one_day' };
        } else if (localSchedulePreference === 'deadline') {
            finalScheduleData = { date: selectedDate?.toISOString(), deadlineSlots, preference: 'deadline' };
        } else if (localSchedulePreference === 'few_days') {
            finalScheduleData = { fewDaysSlots, totalHours: getTotalHours(), preference: 'few_days' };
        }

        // Prepare pricing data
        let finalPricingData = null;
        if (localPricingModel === 'hourly' && hourlyRate) {
            finalPricingData = { price: parseFloat(hourlyRate) };
        } else if (localPricingModel === 'fixed' && fixedPrice) {
            finalPricingData = { price: parseFloat(fixedPrice) };
        } else if (localPricingModel === 'quantity') {
            finalPricingData = {
                itemName: quantityName,
                quantity: parseInt(quantityCount),
                pricePerItem: parseFloat(quantityPricePerItem),
                totalPrice: parseInt(quantityCount) * parseFloat(quantityPricePerItem)
            };
        }

        // Commit all local changes to the global store
        setTweakType(localTweakType);
        setAddress(localAddress);
        setCategory(localCategory);
        setDescription(localDescription);
        setImages(localImages);
        setAudioUri(localAudioUri);
        setSkills(localSkills);
        setLanguages(localLanguages);
        setSchedulePreference(localSchedulePreference);
        setPricingModel(localPricingModel);
        setPricingData(finalPricingData);
        setScheduleData(finalScheduleData);

        router.push('/create-tweak/preview');
    };

    const handleSaveAsDraft = () => {
        // Save current state to store 
        // Prepare schedule data
        let finalScheduleData = null;
        if (localSchedulePreference === 'one_day') {
            finalScheduleData = { date: selectedDate?.toISOString(), timeSlots, preference: 'one_day' };
        } else if (localSchedulePreference === 'deadline') {
            finalScheduleData = { date: selectedDate?.toISOString(), deadlineSlots, preference: 'deadline' };
        } else if (localSchedulePreference === 'few_days') {
            finalScheduleData = { fewDaysSlots, totalHours: getTotalHours(), preference: 'few_days' };
        }

        // Prepare pricing data
        let finalPricingData = null;
        if (localPricingModel === 'hourly' && hourlyRate) {
            finalPricingData = { price: parseFloat(hourlyRate) };
        } else if (localPricingModel === 'fixed' && fixedPrice) {
            finalPricingData = { price: parseFloat(fixedPrice) };
        } else if (localPricingModel === 'quantity') {
            finalPricingData = {
                itemName: quantityName,
                quantity: parseInt(quantityCount),
                pricePerItem: parseFloat(quantityPricePerItem),
                totalPrice: parseInt(quantityCount) * parseFloat(quantityPricePerItem)
            };
        }

        // Commit all local changes to the global store
        setTweakType(localTweakType);
        setAddress(localAddress);
        setCategory(localCategory);
        setDescription(localDescription);
        setImages(localImages);
        setAudioUri(localAudioUri);
        setSkills(localSkills);
        setLanguages(localLanguages);
        setSchedulePreference(localSchedulePreference);
        setPricingModel(localPricingModel);
        setPricingData(finalPricingData);
        setScheduleData(finalScheduleData);

        Toast.success('Draft saved successfully');
    };



    return (
        <ScreenWrapper edges={['top', 'bottom', 'left', 'right']} style={{ backgroundColor: 'white' }}>
            {/* Header - Tightened and Premium */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={20} color={themeColors.text} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Edit Tweak</Text>
                    <Text style={styles.headerSubtitle}>STEP {currentIndex + 1} OF 7</Text>
                </View>
            </View>

            {/* Stepper Row - Improved spacing and dynamic coloring */}
            <View style={{ height: 68, borderBottomWidth: 1, borderBottomColor: palette.gray100, backgroundColor: 'white' }}>
                <ScrollView
                    ref={stepperRef}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center', gap: 12 }}
                >
                    {cards.map((card, i) => {
                        const isActive = currentIndex === i;
                        const isCompleted = currentIndex > i;
                        const hasError = invalidSteps.includes(card.id);

                        // Icon and Background Color Logic
                        let backgroundColor: string = palette.gray50;
                        let borderColor: string = palette.gray100;
                        let iconColor: string = palette.gray400;

                        if (hasError) {
                            backgroundColor = palette.red50;
                            borderColor = palette.red200;
                            iconColor = palette.red500;
                        } else if (isActive) {
                            backgroundColor = themeColors.primary;
                            borderColor = themeColors.primary;
                            iconColor = 'white';
                        } else if (isCompleted) {
                            backgroundColor = themeColors.primary + '20'; // Light Primary Blue
                            borderColor = themeColors.primary + '30';
                            iconColor = themeColors.primary;
                        }

                        return (
                            <View key={card.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity
                                    onPress={() => scrollToStep(i)}
                                    style={{ alignItems: 'center' }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Go to ${card.title}`}
                                >
                                    <View
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 12,
                                            backgroundColor,
                                            borderColor,
                                            borderWidth: 1.5,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            ...(isActive && {
                                                shadowColor: themeColors.primary,
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.3,
                                                shadowRadius: 6,
                                                elevation: 8,
                                                transform: [{ scale: 1.05 }]
                                            }),
                                            ...(hasError && !isActive && {
                                                shadowColor: palette.red500,
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 4,
                                                elevation: 2
                                            })
                                        }}
                                    >
                                        <Ionicons
                                            name={card.icon}
                                            size={18}
                                            color={iconColor}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Main Content Area */}
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingTop: 20 }}
                >
                    <View style={{ flex: 1 }}>
                        {renderCardContent(cards[currentIndex].id)}
                    </View>

                    {/* Footer Actions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, marginTop: 32, marginBottom: 40 }}>
                        <TouchableOpacity
                            onPress={() => currentIndex > 0 ? scrollToStep(currentIndex - 1) : router.back()}
                            style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: palette.gray100, alignItems: 'center', justifyContent: 'center' }}
                            accessibilityRole="button"
                            accessibilityLabel="Previous step"
                        >
                            <Ionicons name="chevron-back" size={24} color={palette.gray700} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSaveAsDraft}
                            style={{ flex: 1, height: 56, borderRadius: 16, borderWidth: 1, borderColor: palette.gray300, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Text style={{ fontWeight: 'bold', color: palette.gray700, fontSize: 13 }}>Save Draft</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSave}
                            style={{ flex: 1, height: 56, borderRadius: 16, backgroundColor: themeColors.primary, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 13 }}>Preview</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                if (currentIndex < cards.length - 1) {
                                    if (validateStep(cards[currentIndex].id)) {
                                        scrollToStep(currentIndex + 1);
                                        setInvalidSteps(prev => prev.filter(s => s !== cards[currentIndex].id));
                                    } else {
                                        setInvalidSteps(prev => [...new Set([...prev, cards[currentIndex].id])]);
                                    }
                                } else {
                                    handleSave();
                                }
                            }}
                            style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: themeColors.primary, alignItems: 'center', justifyContent: 'center' }}
                            accessibilityRole="button"
                            accessibilityLabel="Next step"
                        >
                            <Ionicons name="chevron-forward" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>

            <SavedAddressesList
                visible={showAddressList}
                onClose={() => setShowAddressList(false)}
                onSelect={(selectedAddr) => {
                    setAddress(selectedAddr);
                    setShowAddressList(false);
                }}
                currentAddressId={address?.id}
            />

            {/* Save Button - Hidden as we now use inline card navigation, but kept for legacy just in case if someone prefers jumping */}
            {/* 
            <View style={styles.footer}>
                <CustomButton onPress={handleSave} style={styles.saveButton} variant="filled">
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                </CustomButton>
            </View>
            */}
        </ScreenWrapper >
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: palette.gray100,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    backButton: {
        marginRight: 16,
        padding: 4,
        borderRadius: 999,
        backgroundColor: palette.gray50,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: palette.gray900,
    },
    headerSubtitle: {
        fontSize: 12,
        color: palette.gray500,
    },
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.gray200,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: palette.gray200,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
