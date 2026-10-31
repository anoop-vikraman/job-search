import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ProfileHeaderRight from '../../components/Header/ProfileHeaderRight';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CustomButton from '../../components/UI/CustomButton';
import CustomConfirmationModal from '../../components/UI/CustomConfirmationModal';
import DataRow from '../../components/UI/DataRow';
import DraftConfirmationDialog from '../../components/UI/DraftConfirmationDialog';
import SectionCard from '../../components/UI/SectionCard';
import { themeColors } from '../../themes/colors';

export default function CreateTweakStep5() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [showDraftDialog, setShowDraftDialog] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDraftSaveModal, setShowDraftSaveModal] = useState(false);

    // Parse params
    const title = params.title as string;
    const category = params.category as string;
    const description = params.description as string;

    const address = params.address ? JSON.parse(params.address as string) : null;

    const schedulingType = params.schedulingType as string;
    const closingDate = params.closingDate ? new Date(params.closingDate as string) : null;

    // Pricing data
    const pricingType = params.pricingType as string;

    // Format helpers
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatDateTime = (date: Date) => {
        return date.toLocaleString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    const getSchedulingTypeLabel = () => {
        switch (schedulingType) {
            case 'oneDay': return 'One Day';
            case 'flexible': return 'Flexible';
            case 'fixed': return 'Fixed Duration';
            default: return schedulingType;
        }
    };

    const getPricingTypeLabel = () => {
        switch (pricingType) {
            case 'fixed': return 'Fixed Price';
            case 'quantity': return 'By Quantity';
            case 'duration': return 'By Duration';
            default: return pricingType;
        }
    };

    const handleEditSection = (step: string) => {
        const editParams = { ...params, editMode: 'true' };
        router.push({
            pathname: `/create-tweak/${step}` as any,
            params: editParams
        });
    };

    const handleSaveDraft = async () => {
        // TODO: Implement draft save to AsyncStorage/MMKV
        console.log('Saving draft...', params);
        setShowDraftSaveModal(true);
    };

    const handleActivate = () => {
        // TODO: Implement tweak activation (API call)
        console.log('Activating tweak...', params);
        setShowSuccessModal(true);
    };

    const handleBack = () => {
        setShowDraftDialog(true);
    };

    const handleDiscard = () => {
        setShowDraftDialog(false);
        router.push('/');
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Review Your Tweak</Text>
                    <Text style={styles.headerSubtitle}>STEP 5 OF 5</Text>
                </View>
                <ProfileHeaderRight />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Almost There!</Text>
                    <Text style={styles.subtitle}>
                        Review your tweak details below. You can edit any section before publishing.
                    </Text>
                </View>

                {/* Section 1: Basic Details */}
                <SectionCard onEdit={() => handleEditSection('index')}>
                    <DataRow label="Title" value={title || 'Not set'} />
                    <DataRow label="Category" value={category || 'Not set'} />
                    <DataRow label="Description" value={description || 'Not set'} />
                </SectionCard>

                {/* Section 2: Location */}
                <SectionCard onEdit={() => handleEditSection('step2')}>
                    <DataRow
                        label="Location"
                        value={address ?
                            `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.pincode || ''}`.trim()
                            : 'Not set'
                        }
                    />
                    {address?.landmark && (
                        <DataRow label="Landmark" value={address.landmark} />
                    )}
                </SectionCard>

                {/* Section 3: Scheduling */}
                <SectionCard onEdit={() => handleEditSection('step3')}>
                    <DataRow label="Scheduling Type" value={getSchedulingTypeLabel()} highlight />

                    {schedulingType === 'oneDay' && params.date && (
                        <>
                            <DataRow label="Date" value={formatDate(new Date(params.date as string))} />
                            <DataRow label="Time Slot" value={params.timeSlot as string || 'Anytime'} />
                        </>
                    )}

                    {schedulingType === 'flexible' && params.deadline && (
                        <DataRow label="Deadline" value={formatDate(new Date(params.deadline as string))} />
                    )}

                    {schedulingType === 'fixed' && params.startDate && params.endDate && (
                        <>
                            <DataRow label="Start" value={formatDateTime(new Date(params.startDate as string))} />
                            <DataRow label="End" value={formatDateTime(new Date(params.endDate as string))} />
                            {params.dailyDuration && (
                                <DataRow label="Daily Duration" value={params.dailyDuration as string} />
                            )}
                        </>
                    )}

                    {closingDate && (
                        <DataRow label="Applications Close" value={formatDateTime(closingDate)} />
                    )}
                </SectionCard>

                {/* Section 4: Pricing */}
                <SectionCard onEdit={() => handleEditSection('step4')}>
                    <DataRow label="Pricing Model" value={getPricingTypeLabel()} highlight />

                    {pricingType === 'fixed' && params.fixedPrice && (
                        <DataRow label="Total Amount" value={`₹${params.fixedPrice}`} />
                    )}

                    {pricingType === 'quantity' && (
                        <>
                            <DataRow label="Rate" value={`₹${params.quantityRate} per ${params.quantityUnit}`} />
                            <DataRow label="Estimated Quantity" value={params.estimatedQuantity as string} />
                            <DataRow label="Total Amount" value={`₹${params.totalAmount}`} />
                        </>
                    )}

                    {pricingType === 'duration' && (
                        <>
                            <DataRow label="Duration Type" value={params.durationType === 'hourly' ? 'Hourly' : 'Per Day'} />
                            {params.durationType === 'hourly' ? (
                                <>
                                    <DataRow label="Estimated Hours" value={params.estimatedHours as string} />
                                    <DataRow label="Hourly Rate" value={`₹${params.hourlyRate}`} />
                                </>
                            ) : (
                                <>
                                    <DataRow label="Number of Days" value={params.numberOfDays as string} />
                                    <DataRow label="Daily Rate" value={`₹${params.dailyRate}`} />
                                </>
                            )}
                            <DataRow label="Total Amount" value={`₹${params.totalAmount}`} />
                        </>
                    )}
                </SectionCard>

                <View style={styles.actionSection}>
                    <CustomButton
                        onPress={handleSaveDraft}
                        style={styles.draftButton}
                        variant="outlined"
                    >
                        <Ionicons name="bookmark-outline" size={20} color="#6366F1" />
                        <Text style={styles.draftButtonText}>Save as Draft</Text>
                    </CustomButton>

                    <CustomButton
                        onPress={handleActivate}
                        style={styles.activateButton}
                        variant="filled"
                    >
                        <Text style={styles.activateButtonText}>Activate Tweak</Text>
                        <Ionicons name="checkmark-circle" size={24} color="white" />
                    </CustomButton>
                </View>
            </ScrollView>

            <DraftConfirmationDialog
                visible={showDraftDialog}
                onSaveDraft={() => {
                    setShowDraftDialog(false);
                    handleSaveDraft();
                }}
                onDiscard={handleDiscard}
                onCancel={() => setShowDraftDialog(false)}
            />

            <CustomConfirmationModal
                visible={showDraftSaveModal}
                onClose={() => setShowDraftSaveModal(false)}
                onConfirm={() => {
                    setShowDraftSaveModal(false);
                    router.push('/');
                }}
                title="Draft Saved"
                message="Your tweak has been saved as a draft. You can finish it later from your dashboard."
                confirmLabel="Home"
                variant="info"
            />

            <CustomConfirmationModal
                visible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                onConfirm={() => {
                    setShowSuccessModal(false);
                    router.push('/');
                }}
                title="Tweak Activated!"
                message="Your tweak has been activated and is now live in the community. Good luck!"
                confirmLabel="Done"
                variant="success"
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
        paddingBottom: 40,
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
        lineHeight: 24,
    },
    actionSection: {
        marginTop: 24,
        gap: 12,
    },
    draftButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#6366F1',
        backgroundColor: 'white',
    },
    draftButtonText: {
        color: '#6366F1',
        fontSize: 16,
        fontWeight: 'bold',
    },
    activateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#6366F1',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    activateButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
