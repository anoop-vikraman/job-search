import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import ProfileHeaderRight from '../../components/Header/ProfileHeaderRight';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CalculationSummary from '../../components/UI/CalculationSummary';
import CreateTweakNavButtons from '../../components/UI/CreateTweakNavButtons';
import PriceValidationMessage, { getBorderColor } from '../../components/UI/PriceValidationMessage';
import SelectableCard from '../../components/UI/SelectableCard';
import TabSelector from '../../components/UI/TabSelector';
import { useConfirmationStore } from '../../store/useConfirmationStore';
import { themeColors } from '../../themes/colors';

import { DurationTab, PricingType } from '../../types/tweak';

const MIN_AMOUNT = 200;
const RECOMMENDED_AMOUNT = 1000;

const schema = z.object({
    selectedPricingType: z.enum(['fixed', 'quantity', 'duration']),
    fixedPrice: z.string(),
    quantityRate: z.string(),
    quantityUnit: z.string(),
    estimatedQuantity: z.string(),
    durationTab: z.enum(['hourly', 'daily']),
    estimatedHours: z.string(),
    hourlyRate: z.string(),
    dailyRate: z.string(),
}).refine((data) => {
    if (data.selectedPricingType === 'fixed') return parseFloat(data.fixedPrice) >= MIN_AMOUNT;
    if (data.selectedPricingType === 'quantity') return (parseFloat(data.quantityRate) * parseFloat(data.estimatedQuantity)) >= MIN_AMOUNT;
    if (data.selectedPricingType === 'duration') {
        if (data.durationTab === 'hourly') return (parseFloat(data.hourlyRate) * parseFloat(data.estimatedHours)) >= MIN_AMOUNT;
        // daily total calculated externally since it needs numberOfDays
        return true;
    }
    return true;
}, {
    message: `Total amount must be at least ₹${MIN_AMOUNT}`,
    path: ["selectedPricingType"]
});

type FormData = z.infer<typeof schema>;

export default function CreateTweakStep4() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const confirm = useConfirmationStore(state => state.confirm);

    // Check if in edit mode
    const editMode = params.editMode === 'true';

    // Determine scheduling type from params
    const schedulingType = params.schedulingType as string;
    const showDurationPricing = schedulingType === 'fixed';

    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
        resolver: zodResolver(schema),
        defaultValues: {
            selectedPricingType: (params.pricingType as PricingType) || 'fixed',
            fixedPrice: params.fixedPrice?.toString() || '',
            quantityRate: params.quantityRate?.toString() || '',
            quantityUnit: (params.quantityUnit as string) || '',
            estimatedQuantity: params.estimatedQuantity?.toString() || '',
            durationTab: (params.durationType as DurationTab) || 'hourly',
            estimatedHours: params.estimatedHours?.toString() || '',
            hourlyRate: params.hourlyRate?.toString() || '',
            dailyRate: params.dailyRate?.toString() || '',
        }
    });

    const selectedPricingType = watch('selectedPricingType');
    const fixedPrice = watch('fixedPrice');
    const quantityRate = watch('quantityRate');
    const quantityUnit = watch('quantityUnit');
    const estimatedQuantity = watch('estimatedQuantity');
    const durationTab = watch('durationTab');
    const estimatedHours = watch('estimatedHours');
    const hourlyRate = watch('hourlyRate');
    const dailyRate = watch('dailyRate');

    // Calculate number of days for fixed scheduling
    const [numberOfDays, setNumberOfDays] = useState(1);

    useEffect(() => {
        if (schedulingType === 'fixed' && params.startDate && params.endDate) {
            const start = new Date(params.startDate as string);
            const end = new Date(params.endDate as string);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setNumberOfDays(diffDays || 1);
        }
    }, [schedulingType, params.startDate, params.endDate]);

    // Calculations
    const getFixedPriceAmount = () => parseFloat(fixedPrice) || 0;

    const getQuantityTotal = () => {
        const rate = parseFloat(quantityRate) || 0;
        const qty = parseFloat(estimatedQuantity) || 0;
        return rate * qty;
    };

    const getHourlyTotal = () => {
        const hours = parseFloat(estimatedHours) || 0;
        const rate = parseFloat(hourlyRate) || 0;
        return hours * rate;
    };

    const getDailyTotal = () => {
        const rate = parseFloat(dailyRate) || 0;
        return rate * numberOfDays;
    };

    const onSubmit = (data: FormData) => {
        let totalAmount = 0;
        let pricingData: any = {
            pricingType: data.selectedPricingType
        };

        if (data.selectedPricingType === 'fixed') {
            totalAmount = getFixedPriceAmount();
            pricingData.fixedPrice = totalAmount;
        } else if (data.selectedPricingType === 'quantity') {
            totalAmount = getQuantityTotal();
            pricingData.quantityRate = parseFloat(data.quantityRate);
            pricingData.quantityUnit = data.quantityUnit;
            pricingData.estimatedQuantity = parseFloat(data.estimatedQuantity);
            pricingData.totalAmount = totalAmount;
        } else if (data.selectedPricingType === 'duration') {
            if (data.durationTab === 'hourly') {
                totalAmount = getHourlyTotal();
                pricingData.durationType = 'hourly';
                pricingData.estimatedHours = parseFloat(data.estimatedHours);
                pricingData.hourlyRate = parseFloat(data.hourlyRate);
                pricingData.totalAmount = totalAmount;
            } else {
                totalAmount = getDailyTotal();
                pricingData.durationType = 'daily';
                pricingData.dailyRate = parseFloat(data.dailyRate);
                pricingData.numberOfDays = numberOfDays;
                pricingData.totalAmount = totalAmount;
            }
        }

        if (totalAmount < MIN_AMOUNT) {
            confirm({
                title: 'Price Too Low',
                message: `The total amount is below the minimum of ₹${MIN_AMOUNT}. Please increase your pricing.`,
                variant: 'warning',
                confirmLabel: 'OK'
            });
            return;
        }

        const payload = {
            ...params,
            ...pricingData
        };

        router.push({
            pathname: '/create-tweak/preview',
            params: payload
        });
    };

    return (
        <ScreenWrapper scrollable contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Create Tweak</Text>
                    <Text style={styles.headerSubtitle}>STEP 4 OF 4</Text>
                </View>
                <ProfileHeaderRight />
            </View>

            <View>
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Set Your Price</Text>
                    <Text style={styles.subtitle}>Choose how you'd like to price this tweak.</Text>
                </View>

                {/* Fixed Price Card */}
                <SelectableCard
                    title="Fixed Price"
                    isSelected={selectedPricingType === 'fixed'}
                    onSelect={() => setValue('selectedPricingType', 'fixed')}
                >
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>TOTAL AMOUNT</Text>
                        <View style={[
                            styles.priceInputWrapper,
                            { borderColor: getBorderColor(getFixedPriceAmount(), MIN_AMOUNT, RECOMMENDED_AMOUNT) }
                        ]}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <Controller
                                control={control}
                                name="fixedPrice"
                                render={({ field: { onChange, value } }) => (
                                    <TextInput
                                        style={styles.priceInput}
                                        value={value}
                                        onChangeText={onChange}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                )}
                            />
                        </View>
                    </View>
                    <PriceValidationMessage
                        amount={getFixedPriceAmount()}
                        minAmount={MIN_AMOUNT}
                        recommendedAmount={RECOMMENDED_AMOUNT}
                    />
                </SelectableCard>

                {/* By Quantity Card */}
                <SelectableCard
                    title="By Quantity"
                    isSelected={selectedPricingType === 'quantity'}
                    onSelect={() => setValue('selectedPricingType', 'quantity')}
                >
                    <View style={styles.quantityRow}>
                        <View style={styles.quantityInputContainer}>
                            <Text style={styles.inputLabel}>RATE</Text>
                            <View style={styles.quantityInputWrapper}>
                                <Text style={styles.currencySymbol}>₹</Text>
                                <Controller
                                    control={control}
                                    name="quantityRate"
                                    render={({ field: { onChange, value } }) => (
                                        <TextInput
                                            style={styles.quantityInput}
                                            value={value}
                                            onChangeText={onChange}
                                            placeholder="0"
                                            keyboardType="numeric"
                                            placeholderTextColor="#9CA3AF"
                                        />
                                    )}
                                />
                            </View>
                        </View>
                        <Text style={styles.perText}>per</Text>
                        <View style={styles.quantityInputContainer}>
                            <Text style={styles.inputLabel}>UNIT</Text>
                            <Controller
                                control={control}
                                name="quantityUnit"
                                render={({ field: { onChange, value } }) => (
                                    <TextInput
                                        style={styles.unitInput}
                                        value={value}
                                        onChangeText={onChange}
                                        placeholder="e.g., hour, item"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                )}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>ESTIMATED QUANTITY</Text>
                        <Controller
                            control={control}
                            name="estimatedQuantity"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    style={styles.standardInput}
                                    value={value}
                                    onChangeText={onChange}
                                    placeholder="Enter estimated quantity"
                                    keyboardType="numeric"
                                    placeholderTextColor="#9CA3AF"
                                />
                            )}
                        />
                    </View>

                    {estimatedQuantity && quantityRate && (
                        <>
                            <CalculationSummary
                                label={`For ${estimatedQuantity} ${quantityUnit || 'units'}, total cost`}
                                value={getQuantityTotal().toFixed(2)}
                                highlight
                            />
                            <PriceValidationMessage
                                amount={getQuantityTotal()}
                                minAmount={MIN_AMOUNT}
                                recommendedAmount={RECOMMENDED_AMOUNT}
                            />
                        </>
                    )}
                </SelectableCard>

                {/* By Duration Card - Only for Fixed scheduling */}
                {showDurationPricing && (
                    <SelectableCard
                        title="By Duration"
                        isSelected={selectedPricingType === 'duration'}
                        onSelect={() => setValue('selectedPricingType', 'duration')}
                    >
                        <TabSelector
                            options={[
                                { value: 'hourly', label: 'Hourly' },
                                { value: 'daily', label: 'Per Day' }
                            ]}
                            selected={durationTab}
                            onSelect={(value) => setValue('durationTab', value as DurationTab)}
                        />

                        {durationTab === 'hourly' ? (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>ESTIMATED HOURS</Text>
                                    <Controller
                                        control={control}
                                        name="estimatedHours"
                                        render={({ field: { onChange, value } }) => (
                                            <TextInput
                                                style={styles.standardInput}
                                                value={value}
                                                onChangeText={onChange}
                                                placeholder="Enter total hours"
                                                keyboardType="numeric"
                                                placeholderTextColor="#9CA3AF"
                                            />
                                        )}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>RATE PER HOUR</Text>
                                    <View style={styles.quantityInputWrapper}>
                                        <Text style={styles.currencySymbol}>₹</Text>
                                        <Controller
                                            control={control}
                                            name="hourlyRate"
                                            render={({ field: { onChange, value } }) => (
                                                <TextInput
                                                    style={styles.quantityInput}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    placeholder="0"
                                                    keyboardType="numeric"
                                                    placeholderTextColor="#9CA3AF"
                                                />
                                            )}
                                        />
                                    </View>
                                </View>

                                {estimatedHours && hourlyRate && (
                                    <>
                                        <CalculationSummary
                                            label={`${estimatedHours} hours × ₹${hourlyRate}/hr`}
                                            value={getHourlyTotal().toFixed(2)}
                                            highlight
                                        />
                                        <PriceValidationMessage
                                            amount={getHourlyTotal()}
                                            minAmount={MIN_AMOUNT}
                                            recommendedAmount={RECOMMENDED_AMOUNT}
                                        />
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <View style={styles.infoBadge}>
                                    <Ionicons name="calendar-outline" size={16} color="#6366F1" />
                                    <Text style={styles.infoBadgeText}>
                                        Duration: {numberOfDays} {numberOfDays === 1 ? 'day' : 'days'}
                                    </Text>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>RATE PER DAY</Text>
                                    <View style={styles.quantityInputWrapper}>
                                        <Text style={styles.currencySymbol}>₹</Text>
                                        <Controller
                                            control={control}
                                            name="dailyRate"
                                            render={({ field: { onChange, value } }) => (
                                                <TextInput
                                                    style={styles.quantityInput}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    placeholder="0"
                                                    keyboardType="numeric"
                                                    placeholderTextColor="#9CA3AF"
                                                />
                                            )}
                                        />
                                    </View>
                                </View>

                                {dailyRate && (
                                    <>
                                        <CalculationSummary
                                            label={`${numberOfDays} ${numberOfDays === 1 ? 'day' : 'days'} × ₹${dailyRate}/day`}
                                            value={getDailyTotal().toFixed(2)}
                                            highlight
                                        />
                                        <PriceValidationMessage
                                            amount={getDailyTotal()}
                                            minAmount={MIN_AMOUNT}
                                            recommendedAmount={RECOMMENDED_AMOUNT}
                                        />
                                    </>
                                )}
                            </>
                        )}
                    </SelectableCard>
                )}
            </View>

            <CreateTweakNavButtons
                onNext={handleSubmit(onSubmit)}
                nextLabel={editMode ? 'Save' : 'Review Tweak'}
                onSaveDraft={() => {
                    confirm({
                        title: 'Draft Saved',
                        message: 'Your progress has been saved successfully.',
                        variant: 'success',
                        confirmLabel: 'Great'
                    });
                }}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    backButton: {
        marginRight: 16,
        padding: 4,
        borderRadius: 999,
        backgroundColor: '#F9FAFB',
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6366F1',
        letterSpacing: 1.2,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 24,
        paddingBottom: 120,
    },
    titleSection: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
        lineHeight: 38,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 0.8,
    },
    priceInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: 16,
        paddingHorizontal: 16,
        backgroundColor: 'white',
        height: 56,
    },
    currencySymbol: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginRight: 8,
    },
    priceInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    quantityInputContainer: {
        flex: 1,
    },
    quantityInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingHorizontal: 12,
        backgroundColor: 'white',
        height: 48,
    },
    quantityInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    perText: {
        fontSize: 14,
        color: '#6B7280',
        marginHorizontal: 12,
        marginBottom: 12,
        fontWeight: '500',
    },
    unitInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: 'white',
        height: 48,
    },
    standardInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
        backgroundColor: 'white',
        height: 48,
    },
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    infoBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
        marginLeft: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 24,
        right: 24,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        backgroundColor: '#6366F1',
    },
    nextButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
