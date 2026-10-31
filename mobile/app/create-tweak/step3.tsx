import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import ProfileHeaderRight from '../../components/Header/ProfileHeaderRight';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CreateTweakNavButtons from '../../components/UI/CreateTweakNavButtons';
import CustomDatePicker from '../../components/UI/CustomDatePicker';
import CustomDateTimePicker from '../../components/UI/CustomDateTimePicker';
import CustomLabelledField from '../../components/UI/CustomLabelledField';
import SelectableCard from '../../components/UI/SelectableCard';
import { themeColors } from '../../themes/colors';

import { TimeSlot } from '../../types/tweak';

const schema = z.object({
    selectedType: z.enum(['oneDay', 'flexible', 'fixed']),
    oneDayDate: z.date().nullable(),
    timeSlot: z.enum(['anytime', 'before6pm', 'after6pm']),
    altTimeSlot: z.enum(['anytime', 'before6pm', 'after6pm', 'custom']),
    altStartTime: z.date().nullable(),
    altEndTime: z.date().nullable(),
    flexibleDate: z.date().nullable(),
    fixedStartDate: z.date().nullable(),
    fixedEndDate: z.date().nullable(),
    dailyDuration: z.string(),
    closingDate: z.date().nullable().refine(val => val !== null, 'Closing date is required'),
}).refine((data) => {
    if (data.selectedType === 'oneDay') return data.oneDayDate !== null;
    if (data.selectedType === 'flexible') return data.flexibleDate !== null;
    if (data.selectedType === 'fixed') return data.fixedStartDate !== null && data.fixedEndDate !== null;
    return true;
}, {
    message: "Requirement date/time is missing",
    path: ["selectedType"]
}).refine((data) => {
    if (data.selectedType === 'fixed' && data.fixedStartDate && data.fixedEndDate) {
        return data.fixedEndDate > data.fixedStartDate;
    }
    return true;
}, {
    message: "End time must be after start time",
    path: ["fixedEndDate"]
});

type FormData = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

export default function CreateTweakStep3() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormInput, unknown, FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            selectedType: 'oneDay',
            oneDayDate: null,
            timeSlot: 'anytime',
            altTimeSlot: 'anytime',
            altStartTime: null,
            altEndTime: null,
            flexibleDate: null,
            fixedStartDate: null,
            fixedEndDate: null,
            dailyDuration: '',
            closingDate: null,
        }
    });

    const selectedType = watch('selectedType');
    const oneDayDate = watch('oneDayDate');
    const timeSlot = watch('timeSlot');
    const altTimeSlot = watch('altTimeSlot');
    const altStartTime = watch('altStartTime');
    const altEndTime = watch('altEndTime');
    const flexibleDate = watch('flexibleDate');
    const fixedStartDate = watch('fixedStartDate');
    const fixedEndDate = watch('fixedEndDate');
    const dailyDuration = watch('dailyDuration');
    const closingDate = watch('closingDate');

    // Alternative Flow State (UI toggle only, not in form for now)
    const [showAlternativeFlow, setShowAlternativeFlow] = useState(false);

    // Advanced UI Chips State
    const [activeChip, setActiveChip] = useState<'allDay' | 'startAfter' | 'endBefore' | 'windowed'>('allDay');
    const [isWindowedVisible, setIsWindowedVisible] = useState(false);

    const [address, setAddress] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        if (params.address) {
            try {
                const parsedAddress = JSON.parse(params.address as string) as Record<string, unknown>;
                setAddress(parsedAddress);
            } catch (e) {
                console.error("Failed to parse address params", e);
            }
        }
    }, [params.address]);

    const formatDateShort = (date: Date) => {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatDateTimeShort = (date: Date) => {
        return date.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleAltTimeSlotSelect = (slot: 'anytime' | 'before6pm' | 'after6pm' | 'custom') => {
        setValue('altTimeSlot', slot);
        if (slot === 'anytime') {
            setValue('altStartTime', null);
            setValue('altEndTime', null);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    const renderOneDaySummary = () => {
        if (!oneDayDate && !altStartTime && !altEndTime) return null;

        const dateStr = oneDayDate ? formatDateShort(oneDayDate) : null;
        const startTimeStr = altStartTime ? formatTime(altStartTime) : null;
        const endTimeStr = altEndTime ? formatTime(altEndTime) : null;

        if (dateStr && !startTimeStr && !endTimeStr) {
            return (
                <Text className="text-xs text-gray-500 font-medium mt-2 text-center">
                    Tweak will start on <Text className="font-bold text-gray-900">{dateStr}</Text>
                </Text>
            );
        }

        if (dateStr && (startTimeStr || endTimeStr)) {
            let timeText = "";
            if (altTimeSlot === 'before6pm' && startTimeStr) {
                timeText = `start at ${startTimeStr}`;
            } else if (altTimeSlot === 'after6pm' && endTimeStr) {
                timeText = `end at ${endTimeStr}`;
            } else if (altTimeSlot === 'custom') {
                if (startTimeStr && endTimeStr) {
                    timeText = `start at ${startTimeStr} and end at ${endTimeStr}`;
                } else if (startTimeStr) {
                    timeText = `start at ${startTimeStr}`;
                } else if (endTimeStr) {
                    timeText = `end at ${endTimeStr}`;
                }
            } else {
                // Fallback for anytime or other cases
                if (startTimeStr && endTimeStr) {
                    timeText = `start at ${startTimeStr} and end at ${endTimeStr}`;
                } else if (startTimeStr) {
                    timeText = `start at ${startTimeStr}`;
                } else if (endTimeStr) {
                    timeText = `end at ${endTimeStr}`;
                }
            }

            return (
                <Text className="text-xs text-gray-500 font-medium mt-2 text-center">
                    Tweak will <Text className="font-bold text-gray-900">{timeText}</Text>
                    {` on `}
                    <Text className="font-bold text-gray-900">{dateStr}</Text>
                </Text>
            );
        }

        return null;
    };

    const onSubmit = (data: FormData) => {
        const payload: Record<string, string | string[] | undefined> = {
            ...params,
            schedulingType: data.selectedType,
            closingDate: data.closingDate?.toISOString(),
            address: JSON.stringify(address)
        };

        if (data.selectedType === 'oneDay') {
            payload.date = data.oneDayDate?.toISOString();

            if (activeChip === 'allDay') {
                payload.timeSlot = 'anytime';
            } else {
                payload.timeSlot = 'custom';
                payload.altStartTime = data.altStartTime?.toISOString();
                payload.altEndTime = data.altEndTime?.toISOString();
            }
        } else if (data.selectedType === 'flexible') {
            payload.deadline = data.flexibleDate?.toISOString();
        } else if (data.selectedType === 'fixed') {
            payload.startDate = data.fixedStartDate?.toISOString();
            payload.endDate = data.fixedEndDate?.toISOString();
            payload.dailyDuration = data.dailyDuration;
        }

        router.push({
            pathname: '/create-tweak/step4',
            params: payload
        });
    };

    return (
        <ScreenWrapper scrollable contentContainerStyle={{ flexGrow: 1 }}>
            <View className="px-6 py-4 border-b border-gray-100 flex-row items-center bg-white relative justify-between">
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1 rounded-full bg-gray-50" accessibilityRole="button" accessibilityLabel="Go back">
                        <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-xl font-bold text-gray-900">Create Tweak</Text>
                        <Text className="text-primary text-xs font-bold uppercase tracking-wider">Step 3 of 4</Text>
                    </View>
                </View>

                <ProfileHeaderRight />


                {/* Invisible Debug Toggle - Top Left */}
                <TouchableOpacity
                    onPress={() => setShowAlternativeFlow(!showAlternativeFlow)}
                    className="absolute top-4 left-16 w-12 h-12 items-center justify-center z-50"
                >
                    <View className="w-full h-full bg-transparent" />
                </TouchableOpacity>
            </View>

            <View className="px-6 py-6 pb-32">
                <View className="mb-8">
                    <Text className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
                        {showAlternativeFlow ? "Choose one that fits your need" : "When & Where"}
                    </Text>
                    {!showAlternativeFlow && (
                        <Text className="text-gray-500 text-base">
                            Tell us when you need this done.
                        </Text>
                    )}
                </View>

                {showAlternativeFlow ? (
                    /* ALTERNATIVE FLOW UI (ADVANCED) */
                    <>
                        <SelectableCard
                            title="One day"
                            isSelected={selectedType === 'oneDay'}
                            onSelect={() => setValue('selectedType', 'oneDay')}
                        >
                            <Controller
                                control={control}
                                name="oneDayDate"
                                render={({ field: { onChange, value } }) => (
                                    <CustomDatePicker
                                        label="Tweak Date"
                                        placeholder="Select Date"
                                        value={value}
                                        onChange={onChange}
                                        minimumDate={new Date()}
                                    />
                                )}
                            />

                            {/* CHIPS ROW */}
                            <View className="flex-row flex-wrap gap-2 mb-6 mt-2">
                                <TouchableOpacity
                                    onPress={() => setActiveChip('allDay')}
                                    className={`px-3 py-1.5 rounded-full border ${activeChip === 'allDay' ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}
                                >
                                    <Text className={`text-xs font-bold ${activeChip === 'allDay' ? 'text-white' : 'text-gray-600'}`}>All day</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setActiveChip('startAfter')}
                                    className={`px-3 py-1.5 rounded-full border ${activeChip === 'startAfter' ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}
                                >
                                    <Text className={`text-xs font-bold ${activeChip === 'startAfter' ? 'text-white' : 'text-gray-600'}`}>Start After</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setActiveChip('endBefore')}
                                    className={`px-3 py-1.5 rounded-full border ${activeChip === 'endBefore' ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}
                                >
                                    <Text className={`text-xs font-bold ${activeChip === 'endBefore' ? 'text-white' : 'text-gray-600'}`}>End Before</Text>
                                </TouchableOpacity>

                                {isWindowedVisible && (
                                    <TouchableOpacity
                                        onPress={() => setActiveChip('windowed')}
                                        className={`px-3 py-1.5 rounded-full border ${activeChip === 'windowed' ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}
                                    >
                                        <Text className={`text-xs font-bold ${activeChip === 'windowed' ? 'text-white' : 'text-gray-600'}`}>Windowed</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* DYNAMIC CONTENT AREA */}
                            <View className="bg-gray-50 rounded-xl p-4 border border-gray-100">

                                {activeChip === 'allDay' && (
                                    <View>
                                        <View className="flex-row items-center gap-2 mb-2">
                                            <Ionicons name="checkmark-circle" size={20} color={themeColors.primary} />
                                            <Text className="text-sm font-bold text-gray-800">Great! Flexible time attracts more applicants.</Text>
                                        </View>
                                        <Text className="text-xs text-gray-500">
                                            Tweak will be done <Text className="font-bold text-gray-900">anytime</Text> on <Text className="font-bold text-gray-900">{oneDayDate ? formatDateShort(oneDayDate) : 'this day'}</Text>.
                                        </Text>
                                    </View>
                                )}

                                {activeChip === 'startAfter' && (
                                    <View>
                                        <Controller
                                            control={control}
                                            name="altStartTime"
                                            render={({ field: { onChange, value } }) => (
                                                <CustomDateTimePicker
                                                    label="Start After"
                                                    placeholder="Select Time"
                                                    value={value}
                                                    onChange={onChange}
                                                    mode="time"
                                                />
                                            )}
                                        />
                                        <TouchableOpacity
                                            onPress={() => {
                                                setIsWindowedVisible(true);
                                                setActiveChip('windowed');
                                            }}
                                            className="mt-3"
                                        >
                                            <Text className="text-primary text-xs font-bold">+ Add a Finish Before time also?</Text>
                                        </TouchableOpacity>
                                        <Text className="text-xs text-gray-400 mt-4 text-center">
                                            Tweak will start after <Text className="font-bold text-gray-600">{altStartTime ? formatTime(altStartTime) : '...'}</Text> on {oneDayDate ? formatDateShort(oneDayDate) : 'this day'}.
                                        </Text>
                                    </View>
                                )}

                                {activeChip === 'endBefore' && (
                                    <View>
                                        <Controller
                                            control={control}
                                            name="altEndTime"
                                            render={({ field: { onChange, value } }) => (
                                                <CustomDateTimePicker
                                                    label="Finish Before"
                                                    placeholder="Select Time"
                                                    value={value}
                                                    onChange={onChange}
                                                    mode="time"
                                                />
                                            )}
                                        />
                                        <TouchableOpacity
                                            onPress={() => {
                                                setIsWindowedVisible(true);
                                                setActiveChip('windowed');
                                            }}
                                            className="mt-3"
                                        >
                                            <Text className="text-primary text-xs font-bold">+ Add a Start After time also?</Text>
                                        </TouchableOpacity>
                                        <Text className="text-xs text-gray-400 mt-4 text-center">
                                            Tweak will end before <Text className="font-bold text-gray-600">{altEndTime ? formatTime(altEndTime) : '...'}</Text> on {oneDayDate ? formatDateShort(oneDayDate) : 'this day'}.
                                        </Text>
                                    </View>
                                )}

                                {activeChip === 'windowed' && (
                                    <View>
                                        <View className="flex-row gap-3">
                                            <View className="flex-1">
                                                <Controller
                                                    control={control}
                                                    name="altStartTime"
                                                    render={({ field: { onChange, value } }) => (
                                                        <CustomDateTimePicker
                                                            label="Start After"
                                                            placeholder="Time"
                                                            value={value}
                                                            onChange={onChange}
                                                            mode="time"
                                                        />
                                                    )}
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Controller
                                                    control={control}
                                                    name="altEndTime"
                                                    render={({ field: { onChange, value } }) => (
                                                        <CustomDateTimePicker
                                                            label="Finish Before"
                                                            placeholder="Time"
                                                            value={value}
                                                            onChange={onChange}
                                                            mode="time"
                                                        />
                                                    )}
                                                />
                                            </View>
                                        </View>
                                        <Text className="text-xs text-gray-400 mt-4 text-center">
                                            Tweak will start after <Text className="font-bold text-gray-600">{altStartTime ? formatTime(altStartTime) : '...'}</Text> and end before <Text className="font-bold text-gray-600">{altEndTime ? formatTime(altEndTime) : '...'}</Text> on {oneDayDate ? formatDateShort(oneDayDate) : 'this day'}.
                                        </Text>
                                    </View>
                                )}

                            </View>
                        </SelectableCard>

                        <SelectableCard
                            title="Flexible"
                            isSelected={selectedType === 'flexible'}
                            onSelect={() => setValue('selectedType', 'flexible')}
                        >
                            <View className="flex-row items-center gap-2 mb-2">
                                <Text className="text-gray-500 text-sm">Sometime before</Text>
                                <View className="flex-1">
                                    <Controller
                                        control={control}
                                        name="flexibleDate"
                                        render={({ field: { onChange, value } }) => (
                                            <CustomDatePicker
                                                label="Deadline"
                                                placeholder="Tweak Date Time" // wireframe placeholder
                                                value={value}
                                                onChange={onChange}
                                                minimumDate={new Date()}
                                            />
                                        )}
                                    />
                                </View>
                            </View>
                            <Text className="text-xs text-center text-gray-500">
                                Tweak shall be taken up sometime before <Text className="font-bold text-gray-900">{flexibleDate ? formatDateShort(flexibleDate) : 'this date'}</Text> (deadline).
                            </Text>
                        </SelectableCard>
                    </>
                ) : (
                    /* EXISTING FLOW UI */
                    <>
                        <SelectableCard
                            title="One day"
                            isSelected={selectedType === 'oneDay'}
                            onSelect={() => setValue('selectedType', 'oneDay')}
                        >
                            <Controller
                                control={control}
                                name="oneDayDate"
                                render={({ field: { onChange, value } }) => (
                                    <CustomDatePicker
                                        label="Tweak Date"
                                        placeholder="Select Date"
                                        value={value}
                                        onChange={onChange}
                                        minimumDate={new Date()}
                                    />
                                )}
                            />

                            <View className="flex-row flex-wrap gap-2 mb-4">
                                {(['anytime', 'before6pm', 'after6pm'] as TimeSlot[]).map((slot) => (
                                    <TouchableOpacity
                                        key={slot}
                                        onPress={() => setValue('timeSlot', slot)}
                                        className={`px-4 py-2 rounded-full border ${timeSlot === slot ? 'bg-gray-600 border-gray-600' : 'bg-white border-gray-300'}`}
                                    >
                                        <Text className={`text-xs font-bold ${timeSlot === slot ? 'text-white' : 'text-gray-500'}`}>
                                            {slot === 'anytime' ? 'Anytime' : slot === 'before6pm' ? 'Before 6 PM' : 'After 6 PM'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text className="text-xs text-gray-500 font-medium italic">
                                Tweak shall be taken up <Text className="font-bold text-gray-700">{timeSlot === 'anytime' ? 'anytime' : timeSlot === 'before6pm' ? 'before 6 PM' : 'after 6 PM'}</Text> on <Text className="font-bold text-gray-700">{oneDayDate ? formatDateShort(oneDayDate) : 'this day'}</Text>.
                            </Text>
                        </SelectableCard>

                        <SelectableCard
                            title="Flexible"
                            isSelected={selectedType === 'flexible'}
                            onSelect={() => setValue('selectedType', 'flexible')}
                        >
                            <Controller
                                control={control}
                                name="flexibleDate"
                                render={({ field: { onChange, value } }) => (
                                    <CustomDatePicker
                                        label="Deadline"
                                        placeholder="Select Deadline"
                                        value={value}
                                        onChange={onChange}
                                        minimumDate={new Date()}
                                    />
                                )}
                            />
                            <Text className="text-xs text-textSecondary font-medium italic mt-[-8px]">
                                Tweak shall be taken up sometime before <Text className="font-bold text-gray-700">{flexibleDate ? formatDateShort(flexibleDate) : 'this date'}</Text>.
                            </Text>
                        </SelectableCard>

                        <SelectableCard
                            title="Fixed"
                            isSelected={selectedType === 'fixed'}
                            onSelect={() => setValue('selectedType', 'fixed')}
                        >
                            <Controller
                                control={control}
                                name="fixedStartDate"
                                render={({ field: { onChange, value } }) => (
                                    <CustomDateTimePicker
                                        label="Start Time"
                                        placeholder="Start Time"
                                        value={value}
                                        onChange={onChange}
                                        minimumDate={new Date()}
                                        mode="datetime"
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="fixedEndDate"
                                render={({ field: { onChange, value } }) => (
                                    <CustomDateTimePicker
                                        label="End Time"
                                        placeholder="End Time"
                                        value={value}
                                        onChange={onChange}
                                        minimumDate={fixedStartDate || new Date()}
                                        mode="datetime"
                                    />
                                )}
                            />

                            {fixedStartDate && fixedEndDate && (Math.abs(fixedEndDate.getTime() - fixedStartDate.getTime()) > (1000 * 60 * 60 * 24)) && (
                                <Controller
                                    control={control}
                                    name="dailyDuration"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <CustomLabelledField
                                            label="Daily Duration"
                                            placeholder="e.g. 4 hours per day"
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                        />
                                    )}
                                />
                            )}

                            <Text className="text-xs text-textSecondary font-medium italic mt-[-8px]">
                                Tweak will start on <Text className="font-bold text-gray-700">{fixedStartDate ? formatDateTimeShort(fixedStartDate) : '...'}</Text> and ends on <Text className="font-bold text-gray-700">{fixedEndDate ? formatDateTimeShort(fixedEndDate) : '...'}</Text>.
                            </Text>
                        </SelectableCard>
                    </>
                )}


                <TouchableOpacity className="mb-6 items-center">
                    <Text className="text-xs text-gray-500">
                        Doesn't this match what you had in mind? <Text className="text-primary font-bold">Try Advanced Selector</Text>
                    </Text>
                </TouchableOpacity>

                <Controller
                    control={control}
                    name="closingDate"
                    render={({ field: { onChange, value } }) => (
                        <CustomDateTimePicker
                            label="Application Closing Date"
                            placeholder="Close applications by..."
                            value={value}
                            onChange={onChange}
                            minimumDate={new Date()}
                            mode="datetime"
                        />
                    )}
                />
                {errors.closingDate && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.closingDate.message}</Text>}

                <View className="mb-4 bg-yellow-50 p-4 rounded-xl border border-yellow-100 mt-2">
                    <Text className="text-yellow-800 text-xs leading-5 font-medium">
                        Long work hours drain energy. We encourage you to give a break in between to boost productivity!
                    </Text>
                </View>

            </View>

            <CreateTweakNavButtons
                onNext={handleSubmit(onSubmit)}
                onSaveDraft={handleSubmit(() => router.push('/create-tweak/preview'))}
            />
        </ScreenWrapper>
    );
}
