import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { GestureResponderEvent, Pressable, ScrollView, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import DateTimePicker, { CalendarDay, DateType } from 'react-native-ui-datepicker';
import CreateFlowHeader from '../../components/create-tweak/CreateFlowHeader';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CustomButton from '../../components/UI/CustomButton';
import CustomTimePickerInput from '../../components/UI/CustomTimePickerInput';
import { SwipeableSlot } from '../../components/UI/SwipeableSlot';
import { useConfirmationStore } from '../../store/useConfirmationStore';
import { useCreateTweakStore } from '../../store/useCreateTweakStore';
import { themeColors } from '../../themes/colors';
import { ScheduleData } from '../../types/tweak';
import { palette } from '@tweak/theme';

interface DaySlot {
    date: string;
    start: string;
    end: string;
    status: 'default' | 'modified';
}

type MutableViewStyle = { -readonly [K in keyof ViewStyle]: ViewStyle[K] };
type MutableTextStyle = { -readonly [K in keyof TextStyle]: TextStyle[K] };

export default function SchedulePage(): React.JSX.Element {
    const router = useRouter();
    const { schedulePreference, setScheduleData, isEditMode } = useCreateTweakStore();
    const confirm = useConfirmationStore(state => state.confirm);

    // State for date selection
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);

    // Time Slots state for 'one_day' - Initially empty
    const [timeSlots, setTimeSlots] = useState<{ start: string, end: string }[]>([]);

    // State for 'deadline' mode
    const [deadlineSlots, setDeadlineSlots] = useState<{
        date: string;
        start: string;
        end: string;
        status: 'default' | 'modified';
    }[]>([]);
    const [activeDeadlineSlot, setActiveDeadlineSlot] = useState<number | null>(null);

    // State for 'few_days' mode
    const [fewDaysSlots, setFewDaysSlots] = useState<{
        date: string;
        start: string;
        end: string;
        status: 'default' | 'modified';
    }[]>([]);
    const [activeFewDaysSlot, setActiveFewDaysSlot] = useState<number | null>(null);
    // State for tracking the currently visible month in the calendar (0-11 index)
    const [calMonth, setCalMonth] = useState(dayjs().month());
    const [calYear, setCalYear] = useState(dayjs().year());
    // Validation state
    const [showValidation, setShowValidation] = useState(false);
    // Derived boolean: are we viewing the current month?
    const isCurrentMonth = calMonth === dayjs().month() && calYear === dayjs().year();

    // Slot type toggle: 'availability' = worker shows when free, 'working_time' = fixed work hours
    const [slotType, setSlotType] = useState<'availability' | 'working_time'>('availability');
    // Single global working time slot (used when slotType === 'working_time' for one_day & few_days)
    const [workingTimeSlot, setWorkingTimeSlot] = useState<{ start: string; end: string }>({ start: '09:00', end: '17:00' });

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

    // Memoize slot lookup maps for better performance
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

    const handleContinue = () => {
        setShowValidation(true);
        // Validation logic
        if (schedulePreference === 'one_day') {
            if (!selectedDate) {
                confirm({
                    title: 'Date Required',
                    message: 'Please select a date from the calendar to continue.',
                    variant: 'warning',
                    confirmLabel: 'OK'
                });
                return;
            }
            // Only validate time slots if the user has added at least one
            if (timeSlots.length > 0 && timeSlots.some(slot => !slot.start || !slot.end)) {
                confirm({
                    title: 'Incomplete Times',
                    message: 'Please ensure all time slots have both a start and end time.',
                    variant: 'warning',
                    confirmLabel: 'OK'
                });
                return;
            }
        }

        if (schedulePreference === 'deadline') {
            if (!selectedDate) {
                confirm({
                    title: 'Deadline Required',
                    message: 'Please select a deadline date to continue.',
                    variant: 'warning',
                    confirmLabel: 'OK'
                });
                return;
            }
            // Only validate the ACTIVE slot's time if it's currently being edited
            if (activeDeadlineSlot !== null && deadlineSlots[activeDeadlineSlot]) {
                const slot = deadlineSlots[activeDeadlineSlot];
                if (!slot.start || !slot.end) {
                    confirm({
                        title: 'Incomplete Time',
                        message: 'Please ensure the active time slot has both a start and end time.',
                        variant: 'warning',
                        confirmLabel: 'OK'
                    });
                    return;
                }
            }
        }

        if (schedulePreference === 'few_days') {
            if (fewDaysSlots.length === 0) {
                confirm({
                    title: 'Dates Required',
                    message: 'Please select at least one date from the calendar.',
                    variant: 'warning',
                    confirmLabel: 'OK'
                });
                return;
            }
            // Only validate the ACTIVE slot's time if it's currently being edited
            if (activeFewDaysSlot !== null && fewDaysSlots[activeFewDaysSlot]) {
                const slot = fewDaysSlots[activeFewDaysSlot];
                if (!slot.start || !slot.end) {
                    confirm({
                        title: 'Incomplete Time',
                        message: 'Please ensure the active time slot has both a start and end time.',
                        variant: 'warning',
                        confirmLabel: 'OK'
                    });
                    return;
                }
            }
        }

        // In working_time mode, we ensure each day has exactly one slot (enforced by UI/sync)
        const resolvedTimeSlots = schedulePreference === 'one_day'
            ? (slotType === 'working_time' ? [workingTimeSlot] : timeSlots)
            : null;
        const resolvedFewDaysSlots = schedulePreference === 'few_days' ? fewDaysSlots : null;

        const data: ScheduleData = {
            date: selectedDate?.toISOString(),
            slotType,
            timeSlots: resolvedTimeSlots ?? undefined,
            deadlineSlots: schedulePreference === 'deadline' ? deadlineSlots : undefined,
            fewDaysSlots: resolvedFewDaysSlots ?? undefined,
            totalHours: schedulePreference === 'few_days'
                ? (resolvedFewDaysSlots ?? []).reduce((t: number, s: { start: string; end: string }) => t + calculateHours(s.start, s.end), 0)
                : undefined,
            preference: schedulePreference ?? undefined
        };

        setScheduleData(data);

        // Navigate back to edit if in edit mode, otherwise continue to pricing
        if (isEditMode) {
            router.back();
        } else {
            router.push('/create-tweak/pricing');
        }
    };

    const addFirstTimeSlot = () => {
        setShowValidation(false);
        setTimeSlots([{ start: '', end: '' }]);
    };

    const addAnotherTimeSlot = () => {
        setShowValidation(false);
        setTimeSlots([...timeSlots, { start: '', end: '' }]);
    };

    const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
        setShowValidation(false);
        const newSlots = [...timeSlots];
        newSlots[index][field] = value;
        setTimeSlots(newSlots);
    };

    const removeTimeSlot = (index: number) => {
        const newSlots = timeSlots.filter((_, i) => i !== index);
        setTimeSlots(newSlots);
    };

    const handleSaveDraft = () => {
        confirm({
            title: 'Draft Saved',
            message: 'Your progress has been saved successfully.',
            variant: 'success',
            confirmLabel: 'Great'
        });
    };

    const renderPicker = () => {
        switch (schedulePreference) {
            case 'one_day':
                return (
                    <View>
                        {/* Helper Text */}
                        <View className="flex-row items-center justify-center mb-2 bg-blue-50 rounded-xl p-3 border border-blue-100">
                            <Ionicons name="information-circle" size={18} color={palette.blue500} />
                            <Text className="text-sm text-blue-700 ml-2 flex-1">
                                Tap the month/year to change them
                            </Text>
                        </View>

                        {/* Calendar */}
                        <View className={`bg-white rounded-3xl border mb-3 shadow-sm overflow-hidden ${showValidation && !selectedDate ? 'border-red-500' : 'border-gray-200'
                            }`} >
                            <View className="px-4 pt-0 pb-4">
                                {/* Custom Calendar Header */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4 }}>
                                    {isCurrentMonth
                                        ? <View style={{ width: 36 }} />
                                        : (
                                            <TouchableOpacity onPress={goPrevMonth} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Previous month">
                                                <Ionicons name="chevron-back" size={20} color={themeColors.primary} />
                                            </TouchableOpacity>
                                        )
                                    }
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: palette.gray800 }}>
                                        {dayjs().month(calMonth).year(calYear).format('MMMM YYYY')}
                                    </Text>
                                    <TouchableOpacity onPress={goNextMonth} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Next month">
                                        <Ionicons name="chevron-forward" size={20} color={themeColors.primary} />
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
                                    styles={{
                                        weekdays: {
                                            color: palette.gray400,
                                            fontWeight: 'bold',
                                            fontSize: 12
                                        }
                                    }}
                                    components={{
                                        Day: ({ date }: CalendarDay) => {
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

                                            // Selected date styling
                                            if (isSelected) {
                                                containerStyle.backgroundColor = palette.brand500;
                                                textStyle.color = palette.white;
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

                            {/* Integrated Selected Date Display */}
                            {selectedDate && (
                                <View className="bg-gray-50/80 border-t border-gray-100 py-2 items-center">
                                    <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                        Selected: <Text style={{ color: themeColors.primary }}>{selectedDate.format('MMMM DD, YYYY')}</Text>
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Only show time slots section if date is selected */}
                        {selectedDate && (
                            <View className="mb-4">
                                {/* ── Slot Type Toggle ── */}
                                <View style={{ flexDirection: 'row', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: palette.slate200, marginBottom: 16 }}>
                                    <TouchableOpacity
                                        onPress={() => setSlotType('availability')}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 6,
                                            backgroundColor: slotType === 'availability' ? palette.sky600 : palette.slate50,
                                        }}
                                    >
                                        <Ionicons name="time-outline" size={15} color={slotType === 'availability' ? '#fff' : palette.slate500} />
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: slotType === 'availability' ? '#fff' : palette.slate500 }}>Availability Window</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setSlotType('working_time')}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 6,
                                            backgroundColor: slotType === 'working_time' ? palette.violet600 : palette.slate50,
                                        }}
                                    >
                                        <Ionicons name="briefcase-outline" size={15} color={slotType === 'working_time' ? '#fff' : palette.slate500} />
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: slotType === 'working_time' ? '#fff' : palette.slate500 }}>Working Time</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* ── Hint text ── */}
                                <View style={{ backgroundColor: slotType === 'working_time' ? palette.violet50 : palette.sky50, borderRadius: 10, padding: 10, marginBottom: 14, flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                                    <Ionicons name="information-circle-outline" size={15} color={slotType === 'working_time' ? palette.violet600 : palette.sky600} style={{ marginTop: 1 }} />
                                    <Text style={{ fontSize: 12, color: slotType === 'working_time' ? palette.violet900 : palette.sky700, flex: 1 }}>
                                        {slotType === 'working_time'
                                            ? 'Set the exact hours you will work. The worker must be available for the full duration.'
                                            : 'Indicate windows when you are free. The worker can choose when to come within these times.'}
                                    </Text>
                                </View>

                                {slotType === 'availability' ? (
                                    <View>
                                        {timeSlots.length === 0 ? (
                                            <View className="mb-6 mt-2">
                                                <TouchableOpacity
                                                    onPress={addFirstTimeSlot}
                                                    className="flex-row items-center justify-center py-4 bg-white border-2 border-dashed border-gray-200 rounded-3xl active:bg-gray-50"
                                                >
                                                    <View className="bg-primary p-1.5 rounded-xl mr-2.5 shadow-sm shadow-primary/30">
                                                        <Ionicons name="time" size={18} color="white" />
                                                    </View>
                                                    <Text className="text-primary font-bold text-base">Add Available Time</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <Text className="text-sm font-bold text-gray-500 mb-4 text-center">Availability Windows</Text>
                                        )}

                                        {timeSlots.map((slot, index) => (
                                            <View key={index} className="mb-4">
                                                <View className="flex-row items-center gap-3 mb-3">
                                                    <View className="flex-1">
                                                        <Text className="text-xs font-bold text-gray-400 mb-1 ml-1 tracking-wider">START TIME</Text>
                                                        <CustomTimePickerInput
                                                            value={slot.start}
                                                            onChange={(t) => updateTimeSlot(index, 'start', t)}
                                                            placeholder="Start"
                                                            defaultTime="09:00"
                                                            hasError={showValidation && !slot.start}
                                                        />
                                                    </View>
                                                    <Text className="text-gray-300 mt-6">-</Text>
                                                    <View className="flex-1">
                                                        <Text className="text-xs font-bold text-gray-400 mb-1 ml-1 tracking-wider">END TIME</Text>
                                                        <CustomTimePickerInput
                                                            value={slot.end}
                                                            onChange={(t) => updateTimeSlot(index, 'end', t)}
                                                            placeholder="End"
                                                            defaultTime="18:00"
                                                            hasError={showValidation && !slot.end}
                                                        />
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => removeTimeSlot(index)}
                                                        className="mt-6 h-8 w-8 bg-red-50 border border-red-100 rounded-lg items-center justify-center active:bg-red-100"
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Remove time slot"
                                                    >
                                                        <Ionicons name="close" size={16} color={palette.red500} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}

                                        {timeSlots.length > 0 && timeSlots.length < 2 && (
                                            <TouchableOpacity
                                                onPress={addAnotherTimeSlot}
                                                className="flex-row items-center justify-center py-2.5 bg-blue-50/50 border-2 border-solid border-blue-200 rounded-2xl active:bg-blue-100/50"
                                            >
                                                <View className="bg-primary p-1 rounded-full mr-2.5 shadow-sm shadow-primary/30">
                                                    <Ionicons name="add" size={16} color="white" />
                                                </View>
                                                <Text className="text-primary font-bold text-sm">Add Another Slot</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    /* Working Time: single slot editor */
                                    <View className="bg-white p-4 rounded-3xl border border-purple-100 mb-4">
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: palette.violet600, marginBottom: 14 }}>Working Hours</Text>
                                        <View className="flex-row items-center gap-3">
                                            <View className="flex-1">
                                                <Text className="text-xs font-bold text-gray-400 mb-1 ml-1 tracking-wider">START TIME</Text>
                                                <CustomTimePickerInput
                                                    value={workingTimeSlot.start}
                                                    onChange={(t) => { setShowValidation(false); setWorkingTimeSlot(p => ({ ...p, start: t })); }}
                                                    placeholder="Start"
                                                    defaultTime="09:00"
                                                    hasError={false}
                                                />
                                            </View>
                                            <Text className="text-gray-300 mt-6">-</Text>
                                            <View className="flex-1">
                                                <Text className="text-xs font-bold text-gray-400 mb-1 ml-1 tracking-wider">END TIME</Text>
                                                <CustomTimePickerInput
                                                    value={workingTimeSlot.end}
                                                    onChange={(t) => { setShowValidation(false); setWorkingTimeSlot(p => ({ ...p, end: t })); }}
                                                    placeholder="End"
                                                    defaultTime="17:00"
                                                    hasError={false}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                );
            case 'deadline':
                return (
                    <View>
                        <View className={`bg-white rounded-3xl border mb-4 shadow-sm overflow-hidden ${showValidation && !selectedDate ? 'border-red-500' : 'border-gray-200'
                            }`}>
                            <View className="px-4 pt-0 pb-4">
                                {/* Custom Calendar Header */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4 }}>
                                    {isCurrentMonth
                                        ? <View style={{ width: 36 }} />
                                        : (
                                            <TouchableOpacity onPress={goPrevMonth} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Previous month">
                                                <Ionicons name="chevron-back" size={20} color={themeColors.primary} />
                                            </TouchableOpacity>
                                        )
                                    }
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: palette.gray800 }}>
                                        {dayjs().month(calMonth).year(calYear).format('MMMM YYYY')}
                                    </Text>
                                    <TouchableOpacity onPress={goNextMonth} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Next month">
                                        <Ionicons name="chevron-forward" size={20} color={themeColors.primary} />
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

                                            // Generate slots from Today to Deadline (inclusive)
                                            const today = dayjs().startOf('day');
                                            const deadline = d.startOf('day');
                                            const daysDiff = deadline.diff(today, 'day');
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
                                    styles={{
                                        weekdays: {
                                            color: palette.gray400,
                                            fontWeight: 'bold',
                                            fontSize: 12
                                        }
                                    }}
                                    components={{
                                        Day: ({ date }: CalendarDay) => {
                                            const dateObj = dayjs(date);
                                            const dateStr = dateObj.format('YYYY-MM-DD');
                                            const slot = deadlineSlotsMap.get(dateStr);
                                            const isDeadline = selectedDate && dateStr === selectedDate.format('YYYY-MM-DD');
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
                                            };

                                            // Deadline date styling
                                            if (isDeadline) {
                                                containerStyle.backgroundColor = palette.brand500;
                                                textStyle.color = palette.white;
                                                textStyle.fontWeight = 'bold';
                                            }
                                            // Slot dates (non-deadline) styling
                                            else if (slot) {
                                                containerStyle.borderWidth = 1;
                                                containerStyle.borderColor = slot.status === 'modified' ? palette.green600 : palette.brand500;
                                                textStyle.fontWeight = '600';
                                            }

                                            return (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (isBeforeToday) return;
                                                        // Manually handle date selection
                                                        const newDate = dayjs(date);
                                                        setSelectedDate(newDate);

                                                        // Generate slots from Today to Deadline
                                                        const today = dayjs().startOf('day');
                                                        const daysDiff = newDate.startOf('day').diff(today, 'day');
                                                        const newSlots: DaySlot[] = [];

                                                        // Generate for today + next days up to deadline (inclusive)
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

                            {/* Integrated Selected Date Display */}
                            {selectedDate && (
                                <View className="bg-gray-50/80 border-t border-gray-100 py-2 items-center">
                                    <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                        Deadline: <Text style={{ color: palette.brand500 }}>{selectedDate.format('MMMM DD, YYYY')}</Text>
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Deadline Slots List */}
                        {deadlineSlots.length > 0 && (
                            <View className="mb-4" style={{ overflow: 'visible' }}>
                                <Text className="text-sm font-bold text-gray-500 mb-2 text-center">Availability Schedule</Text>
                                <View className="flex-row items-center justify-center mb-4 gap-1">
                                    <Ionicons name="arrow-up" size={10} color={palette.gray400} />
                                    <Text className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Slide up to delete</Text>
                                </View>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ overflow: 'visible' }}
                                    className="mb-6"
                                    contentContainerStyle={{ paddingRight: 20, overflow: 'visible' }}
                                >
                                    {deadlineSlots.map((slot, index) => {
                                        const slotDate = dayjs(slot.date);
                                        const isActive = activeDeadlineSlot === index;

                                        return (
                                            <SwipeableSlot
                                                key={slot.date}
                                                onDelete={() => {
                                                    const newSlots = deadlineSlots.filter((_, i) => i !== index);
                                                    setDeadlineSlots(newSlots);
                                                    if (newSlots.length === 0) setSelectedDate(null);
                                                    if (isActive) setActiveDeadlineSlot(null);
                                                }}
                                            >
                                                <TouchableOpacity
                                                    onPress={() => setActiveDeadlineSlot(index)}
                                                    className={`mr-3 p-4 mt-3 rounded-2xl bg-white border mb-1 shadow-sm w-32 ${isActive ? 'bg-purple-50' : ''
                                                        }`}
                                                    style={{
                                                        borderColor: isActive ? themeColors.primary : (slot.status === 'modified' ? palette.green600 : palette.brand500),
                                                        borderWidth: isActive ? 2 : 1
                                                    }}
                                                >
                                                    <Pressable
                                                        onPress={(e: GestureResponderEvent) => {
                                                            e.stopPropagation();
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            const newSlots = deadlineSlots.filter((_, i) => i !== index);
                                                            setDeadlineSlots(newSlots);
                                                            if (newSlots.length === 0) setSelectedDate(null);
                                                            if (isActive) setActiveDeadlineSlot(null);
                                                        }}
                                                        className="absolute -top-2.5 -right-2.5 p-1 bg-red-100 border-2 border-red-100 rounded-full"
                                                        style={{ zIndex: 10 }}
                                                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Remove day"
                                                    >
                                                        <Ionicons name="close" size={12} color={palette.red500} />
                                                    </Pressable>
                                                    <Text className="text-gray-500 text-xs font-bold uppercase mb-1">{slotDate.format('ddd')}</Text>
                                                    <Text className="text-gray-900 text-xl font-bold mb-2">{slotDate.format('DD MMM')}</Text>

                                                    <View>
                                                        <Text className="text-xs text-gray-600">{dayjs(slot.date + ' ' + slot.start).format('hh:mm a')}</Text>
                                                        <Text className="text-xs text-gray-600">{dayjs(slot.date + ' ' + slot.end).format('hh:mm a')}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            </SwipeableSlot>
                                        );
                                    })}
                                </ScrollView>

                                {/* Active Slot Editor */}
                                {activeDeadlineSlot !== null && deadlineSlots[activeDeadlineSlot] && (
                                    <View className="bg-white p-4 rounded-3xl border border-gray-200 mb-6">
                                        <Text className="text-lg font-bold text-gray-900 mb-4">
                                            Edit Time for {dayjs(deadlineSlots[activeDeadlineSlot].date).format('MMMM DD')}
                                        </Text>

                                        <View className="flex-row items-center gap-3">
                                            <View className="flex-1">
                                                <Text className="text-xs font-bold text-gray-400 mb-1 ml-1 tracking-wider">START TIME</Text>
                                                <CustomTimePickerInput
                                                    value={deadlineSlots[activeDeadlineSlot].start}
                                                    onChange={(t) => {
                                                        setShowValidation(false);
                                                        const newSlots = [...deadlineSlots];
                                                        newSlots[activeDeadlineSlot] = {
                                                            ...newSlots[activeDeadlineSlot],
                                                            start: t,
                                                            status: 'modified'
                                                        };
                                                        setDeadlineSlots(newSlots);
                                                    }}
                                                    placeholder="Start"
                                                    hasError={showValidation && !deadlineSlots[activeDeadlineSlot].start}
                                                />
                                            </View>
                                            <Text className="text-gray-300 mt-6">-</Text>
                                            <View className="flex-1">
                                                <Text className="text-xs font-bold text-gray-400 mb-1 ml-1 tracking-wider">END TIME</Text>
                                                <CustomTimePickerInput
                                                    value={deadlineSlots[activeDeadlineSlot].end}
                                                    onChange={(t) => {
                                                        setShowValidation(false);
                                                        const newSlots = [...deadlineSlots];
                                                        newSlots[activeDeadlineSlot] = {
                                                            ...newSlots[activeDeadlineSlot],
                                                            end: t,
                                                            status: 'modified'
                                                        };
                                                        setDeadlineSlots(newSlots);
                                                    }}
                                                    placeholder="End"
                                                    hasError={showValidation && !deadlineSlots[activeDeadlineSlot].end}
                                                />
                                            </View>
                                        </View>

                                        {/* Apply to All Days for Deadline */}
                                        {deadlineSlots.length > 1 && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const activeSlot = deadlineSlots[activeDeadlineSlot];
                                                    if (!activeSlot.start || !activeSlot.end) return;
                                                    setDeadlineSlots(prev =>
                                                        prev.map(s => ({ ...s, start: activeSlot.start, end: activeSlot.end, status: 'modified' }))
                                                    );
                                                }}
                                                style={{
                                                    marginTop: 14,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 6,
                                                    paddingVertical: 10,
                                                    borderRadius: 12,
                                                    borderWidth: 1.5,
                                                    borderColor: themeColors.primary,
                                                    backgroundColor: palette.sky50,
                                                }}
                                            >
                                                <Ionicons name="copy-outline" size={15} color={themeColors.primary} />
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.primary }}>Apply to All Days</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                );
            case 'few_days':
                return (
                    <View>
                        <View className={`bg-white rounded-3xl border mb-4 shadow-sm overflow-hidden ${showValidation && fewDaysSlots.length === 0 ? 'border-red-500' : 'border-gray-200'
                            }`}>
                            <View className="px-4 pt-0 pb-4">
                                {/* Custom Calendar Header */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4 }}>
                                    {isCurrentMonth
                                        ? <View style={{ width: 36 }} />
                                        : (
                                            <TouchableOpacity onPress={goPrevMonth} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Previous month">
                                                <Ionicons name="chevron-back" size={20} color={themeColors.primary} />
                                            </TouchableOpacity>
                                        )
                                    }
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: palette.gray800 }}>
                                        {dayjs().month(calMonth).year(calYear).format('MMMM YYYY')}
                                    </Text>
                                    <TouchableOpacity onPress={goNextMonth} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Next month">
                                        <Ionicons name="chevron-forward" size={20} color={themeColors.primary} />
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
                                    styles={{
                                        weekdays: {
                                            color: palette.gray400,
                                            fontWeight: 'bold',
                                            fontSize: 12
                                        }
                                    }}
                                    components={{
                                        Day: ({ date }: CalendarDay) => {
                                            const dateObj = dayjs(date);
                                            const dateStr = dateObj.format('YYYY-MM-DD');
                                            const slotData = fewDaysSlotsMap.get(dateStr);
                                            const isSelected = !!slotData;
                                            const slot = slotData?.slot;
                                            const slotIndex = slotData?.index ?? -1;
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
                                            };

                                            // Selected Slot Styling (Background Color)
                                            if (isSelected && slot) {
                                                // Check if this slot is the currently active one
                                                if (activeFewDaysSlot === slotIndex) {
                                                    containerStyle.backgroundColor = themeColors.primary;
                                                } else {
                                                    containerStyle.backgroundColor = slot.status === 'modified' ? palette.green600 : palette.brand500;
                                                }
                                                textStyle.color = palette.white;
                                                textStyle.fontWeight = 'bold';
                                            }



                                            return (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (isBeforeToday) return;
                                                        const clickedDate = dayjs(date);
                                                        setCalMonth(clickedDate.month());
                                                        setCalYear(clickedDate.year());
                                                        if (isSelected) {
                                                            // Deselect: Remove slot
                                                            const newSlots = fewDaysSlots.filter((_, i) => i !== slotIndex);
                                                            setFewDaysSlots(newSlots);
                                                            if (activeFewDaysSlot === slotIndex) setActiveFewDaysSlot(null);
                                                        } else {
                                                            // Select: Add slot
                                                            const newSlot = {
                                                                date: dateStr,
                                                                start: '09:00',
                                                                end: '17:00',
                                                                status: 'default' as const
                                                            };
                                                            // Add and sort by date
                                                            const newSlots = [...fewDaysSlots, newSlot].sort((a, b) =>
                                                                dayjs(a.date).diff(dayjs(b.date))
                                                            );
                                                            setFewDaysSlots(newSlots);
                                                            setShowValidation(false);
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

                            {/* Integrated Selected Days Display */}
                            {fewDaysSlots.length > 0 && (
                                <View className="bg-gray-50/80 border-t border-gray-100 py-2 px-4 flex-row justify-between items-center">
                                    <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                        Selected: <Text style={{ color: themeColors.primary }}>{fewDaysSlots.length} {fewDaysSlots.length === 1 ? 'Day' : 'Days'}</Text>
                                    </Text>
                                    <Text className="text-[10px] text-gray-400 uppercase tracking-widest">
                                        Total: <Text className="font-bold text-gray-600">{getTotalHours().toFixed(1)}h</Text>
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Few Days Slots List */}
                        {fewDaysSlots.length > 0 && (
                            <View style={{ overflow: 'visible' }}>
                                <Text className="text-sm font-bold text-gray-500 mb-2 text-center">Slots</Text>
                                <View className="flex-row items-center justify-center mb-4 gap-1">
                                    <Ionicons name="arrow-up" size={10} color={palette.gray400} />
                                    <Text className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Slide up to delete</Text>
                                </View>



                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ overflow: 'visible' }}
                                    className="mb-6"
                                    contentContainerStyle={{ paddingRight: 20, overflow: 'visible' }}
                                >
                                    {fewDaysSlots.map((slot, index) => {
                                        const slotDate = dayjs(slot.date);
                                        const isActive = activeFewDaysSlot === index;
                                        const hours = calculateHours(slot.start, slot.end);

                                        return (
                                            <SwipeableSlot
                                                key={slot.date}
                                                onDelete={() => {
                                                    const newSlots = fewDaysSlots.filter((_, i) => i !== index);
                                                    setFewDaysSlots(newSlots);
                                                    if (isActive) setActiveFewDaysSlot(null);
                                                }}
                                            >
                                                <TouchableOpacity
                                                    onPress={() => setActiveFewDaysSlot(index)}
                                                    className={`mr-3 p-4 mt-3 rounded-2xl bg-white border mb-1 shadow-sm w-32 ${isActive ? 'bg-purple-50' : ''
                                                        }`}
                                                    style={{
                                                        borderColor: isActive ? themeColors.primary : (slot.status === 'modified' ? palette.green600 : palette.brand500),
                                                        borderWidth: isActive ? 2 : 1
                                                    }}
                                                >
                                                    <Pressable
                                                        onPress={(e: GestureResponderEvent) => {
                                                            e.stopPropagation();
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            const newSlots = fewDaysSlots.filter((_, i) => i !== index);
                                                            setFewDaysSlots(newSlots);
                                                            if (isActive) setActiveFewDaysSlot(null);
                                                        }}
                                                        className="absolute -top-2.5 -right-2.5 p-1 bg-red-100 border border-red-100 rounded-full"
                                                        style={{ zIndex: 10 }}
                                                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                                        accessibilityRole="button"
                                                        accessibilityLabel="Remove day"
                                                    >
                                                        <Ionicons name="close" size={12} color={palette.red500} />
                                                    </Pressable>


                                                    <Text className="text-gray-500 text-xs font-bold uppercase mb-1">{slotDate.format('ddd')}</Text>
                                                    <Text className="text-gray-900 text-xl font-bold mb-2">{slotDate.format('DD MMM')}</Text>

                                                    <View>
                                                        <Text className="text-xs text-gray-600">{dayjs(slot.date + ' ' + slot.start).format('hh:mm a')}</Text>
                                                        <Text className="text-xs text-gray-600">{dayjs(slot.date + ' ' + slot.end).format('hh:mm a')}</Text>
                                                    </View>

                                                    {/* Hours Badge */}
                                                    <View className="mt-2 bg-gray-100 rounded-full px-2 py-1">
                                                        <Text className="text-xs font-bold text-gray-700 text-center">{hours.toFixed(1)}h</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            </SwipeableSlot>
                                        );
                                    })}
                                </ScrollView>

                                {/* ── Slot Type Toggle (few_days) ── */}
                                <View style={{ flexDirection: 'row', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: palette.slate200, marginBottom: 12 }}>
                                    <TouchableOpacity
                                        onPress={() => setSlotType('availability')}
                                        style={{
                                            flex: 1, paddingVertical: 10, alignItems: 'center',
                                            flexDirection: 'row', justifyContent: 'center', gap: 5,
                                            backgroundColor: slotType === 'availability' ? palette.sky600 : palette.slate50,
                                        }}
                                    >
                                        <Ionicons name="time-outline" size={14} color={slotType === 'availability' ? '#fff' : palette.slate500} />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: slotType === 'availability' ? '#fff' : palette.slate500 }}>Availability</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setSlotType('working_time')}
                                        style={{
                                            flex: 1, paddingVertical: 10, alignItems: 'center',
                                            flexDirection: 'row', justifyContent: 'center', gap: 5,
                                            backgroundColor: slotType === 'working_time' ? palette.violet600 : palette.slate50,
                                        }}
                                    >
                                        <Ionicons name="briefcase-outline" size={14} color={slotType === 'working_time' ? '#fff' : palette.slate500} />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: slotType === 'working_time' ? '#fff' : palette.slate500 }}>Working Time</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Hint text */}
                                <View style={{ backgroundColor: slotType === 'working_time' ? palette.violet50 : palette.sky50, borderRadius: 10, padding: 9, marginBottom: 14, flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                                    <Ionicons name="information-circle-outline" size={14} color={slotType === 'working_time' ? palette.violet600 : palette.sky600} style={{ marginTop: 1 }} />
                                    <Text style={{ fontSize: 11, color: slotType === 'working_time' ? palette.violet900 : palette.sky700, flex: 1 }}>
                                        {slotType === 'working_time'
                                            ? 'One fixed schedule that applies to all selected days.'
                                            : 'Set availability windows per day. Use "Apply to All" to sync all days.'}
                                    </Text>
                                </View>

                                {/* Slot Editor (Both Modes) */}
                                {activeFewDaysSlot !== null && fewDaysSlots[activeFewDaysSlot] ? (
                                    <View className={`bg-white p-4 rounded-3xl border mb-6 ${slotType === 'working_time' ? 'border-purple-200' : 'border-gray-200'}`}>
                                        <Text className="text-base font-bold text-gray-900 mb-4">
                                            {slotType === 'working_time' ? 'Working Time' : 'Availability'} for {dayjs(fewDaysSlots[activeFewDaysSlot].date).format('MMMM DD')}
                                        </Text>

                                        <View className="flex-row items-center gap-3">
                                            <View className="flex-1">
                                                <Text className="text-xs font-bold text-gray-400 mb-1 ml-1 tracking-wider">START TIME</Text>
                                                <CustomTimePickerInput
                                                    value={fewDaysSlots[activeFewDaysSlot].start}
                                                    onChange={(t) => {
                                                        setShowValidation(false);
                                                        const newSlots = [...fewDaysSlots];
                                                        newSlots[activeFewDaysSlot] = { ...newSlots[activeFewDaysSlot], start: t, status: 'modified' };
                                                        setFewDaysSlots(newSlots);
                                                    }}
                                                    placeholder="Start"
                                                    hasError={showValidation && !fewDaysSlots[activeFewDaysSlot].start}
                                                />
                                            </View>
                                            <Text className="text-gray-300 mt-6">-</Text>
                                            <View className="flex-1">
                                                <Text className="text-xs font-bold text-gray-400 mb-1 ml-1 tracking-wider">END TIME</Text>
                                                <CustomTimePickerInput
                                                    value={fewDaysSlots[activeFewDaysSlot].end}
                                                    onChange={(t) => {
                                                        setShowValidation(false);
                                                        const newSlots = [...fewDaysSlots];
                                                        newSlots[activeFewDaysSlot] = { ...newSlots[activeFewDaysSlot], end: t, status: 'modified' };
                                                        setFewDaysSlots(newSlots);
                                                    }}
                                                    placeholder="End"
                                                    hasError={showValidation && !fewDaysSlots[activeFewDaysSlot].end}
                                                />
                                            </View>
                                        </View>

                                        {/* Apply to All Days for Few Days */}
                                        {fewDaysSlots.length > 1 && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const activeSlot = fewDaysSlots[activeFewDaysSlot];
                                                    if (!activeSlot.start || !activeSlot.end) return;
                                                    setFewDaysSlots(prev =>
                                                        prev.map(s => ({ ...s, start: activeSlot.start, end: activeSlot.end, status: 'modified' }))
                                                    );
                                                }}
                                                style={{
                                                    marginTop: 14,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 6,
                                                    paddingVertical: 10,
                                                    borderRadius: 12,
                                                    borderWidth: 1.5,
                                                    borderColor: slotType === 'working_time' ? palette.violet600 : palette.sky600,
                                                    backgroundColor: slotType === 'working_time' ? palette.violet50 : palette.sky50,
                                                }}
                                            >
                                                <Ionicons name="copy-outline" size={15} color={slotType === 'working_time' ? palette.violet600 : palette.sky600} />
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: slotType === 'working_time' ? palette.violet600 : palette.sky600 }}>Apply to All Days</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : null}
                            </View>
                        )}
                    </View>
                );
            default:
                return null;
        }
    };

    const getDescription = () => {
        switch (schedulePreference) {
            case 'one_day': return "Pick a specific day for your Tweak. Perfect for events or one-off tasks.";
            case 'deadline': return "Choose the dates leading up to your deadline.";
            case 'few_days': return "Select multiple days for your Tweak.";
            default: return "Choose how you want to schedule your Tweak.";
        }
    };

    const getTitle = () => {
        switch (schedulePreference) {
            case 'one_day': return "Select Date & Time";
            case 'deadline': return "Set Deadline";
            default: return "Select Dates";
        }
    };


    return (
        <ScreenWrapper>
            <CreateFlowHeader
                stepLabel="Tweak Schedule"
                progress={0.62}
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ flexGrow: 1, padding: 24 }}
            >
                <View className="flex-1">
                    <Text className="text-3xl font-bold text-gray-900 mb-2">{getTitle()}</Text>
                    <Text className="text-gray-500 mb-6">{getDescription()}</Text>

                    {renderPicker()}
                </View>

                {/* Button at the end of scroll OR at bottom of screen if content is short */}
                <View className="mt-8 flex-row gap-3">
                    <CustomButton
                        variant="outlined"
                        className="flex-1"
                        onPress={handleSaveDraft}
                    >
                        Save as Draft
                    </CustomButton>
                    <CustomButton
                        className="flex-1"
                        onPress={handleContinue}
                    >
                        Continue
                    </CustomButton>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}
