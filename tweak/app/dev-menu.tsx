import AddressCard from '@/components/Location/AddressCard';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import ActionSheetModal from '@/components/UI/ActionSheetModal';
import CustomButton from '@/components/UI/CustomButton';
import CustomCheckbox from '@/components/UI/CustomCheckbox';
import CustomConfirmationModal from '@/components/UI/CustomConfirmationModal';
import CustomDatePicker from '@/components/UI/CustomDatePicker';
import CustomDateTimePicker from '@/components/UI/CustomDateTimePicker';
import CustomDropdown from '@/components/UI/CustomDropdown';
import CustomImageUploader, { ImageItem } from '@/components/UI/CustomImageUploader';
import CustomOTPInput from '@/components/UI/CustomOTPInput';
import CustomRadioButton from '@/components/UI/CustomRadioButton';
import CustomToggleButton from '@/components/UI/CustomToggleButton';
import CustomVoiceRecorder from '@/components/UI/CustomVoiceRecorder';
import DataRow from '@/components/UI/DataRow';
import PasswordStrengthMeter from '@/components/UI/PasswordStrengthMeter';
import SectionCard from '@/components/UI/SectionCard';
import { StandardInput } from '@/components/UI/StandardInput';
import TabSelector from '@/components/UI/TabSelector';
import { Toast } from '@/components/UI/ToastManager';
import { useAuthStore } from '@/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DevMenu() {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { logout, user } = useAuthStore();

    // States for components
    const [shouldCrash, setShouldCrash] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        visible: boolean;
        variant: 'danger' | 'success' | 'warning' | 'info';
        title: string;
        message: string;
    }>({
        visible: false,
        variant: 'danger',
        title: 'Are you sure?',
        message: 'This action cannot be undone. Do you want to proceed?'
    });

    const [text, setText] = useState('');
    const [date, setDate] = useState<Date | null>(null);
    const [dateTime, setDateTime] = useState<Date | null>(null);
    const [dropdownValue, setDropdownValue] = useState('');
    const [images, setImages] = useState<ImageItem[]>([]);
    const [imageSizes, setImageSizes] = useState<{ [key: string]: string }>({});
    const [voiceUri, setVoiceUri] = useState<string | null>(null);
    const [voiceSize, setVoiceSize] = useState<string | null>(null);
    const [showSheet, setShowSheet] = useState(false);
    const [checked, setChecked] = useState(false);
    const [radioValue, setRadioValue] = useState('one');
    const [toggleValue, setToggleValue] = useState('a');
    const [otp, setOtp] = useState('');
    const [activeTab, setActiveTab] = useState('hourly');
    const [password, setPassword] = useState('');

    // Fetch image sizes whenever images change
    useEffect(() => {
        const fetchSizes = async () => {
            const sizes: { [key: string]: string } = {};
            for (const img of images) {
                try {
                    const info = await FileSystem.getInfoAsync(img.uri);
                    if (info.exists) {
                        sizes[img.uri] = (info.size / 1024).toFixed(2) + ' KB';
                    }
                } catch (e) {
                    console.error("Failed to get image size", e);
                }
            }
            setImageSizes(sizes);
        };
        fetchSizes();
    }, [images]);

    // Fetch voice recorder size
    useEffect(() => {
        const fetchVoiceSize = async () => {
            if (!voiceUri) {
                setVoiceSize(null);
                return;
            }
            try {
                const info = await FileSystem.getInfoAsync(voiceUri);
                if (info.exists) {
                    setVoiceSize((info.size / 1024).toFixed(2) + ' KB');
                }
            } catch (e) {
                console.error("Failed to get voice size", e);
            }
        };
        fetchVoiceSize();
    }, [voiceUri]);

    if (shouldCrash) {
        throw new Error("This is a rendering error triggered from Dev Menu!");
    }

    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Developer Menu</Text>
            </View>

            <Section title="1. Crash & Error Handling">
                <TouchableOpacity style={[styles.button, { backgroundColor: '#EF4444' }]} onPress={() => setShouldCrash(true)}>
                    <Text style={styles.buttonText}>Trigger UI Crash (Error Boundary)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#991B1B', marginTop: 10 }]}
                    onPress={() => {
                        setTimeout(() => {
                            throw new Error("This is a FATAL global error!");
                        }, 100);
                    }}
                >
                    <Text style={styles.buttonText}>Trigger Fatal Global Error</Text>
                </TouchableOpacity>
                <Text style={styles.desc}>
                    "UI Crash" is render-time fallback. "Fatal Global" is the native-level recovery modal.
                </Text>
            </Section>

            <Section title="2. Feedback & Notifications">
                <View style={styles.row}>
                    <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#10B981' }]} onPress={() => Toast.success("Success Toast!")}>
                        <Text style={styles.buttonText}>Toast Success</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#EF4444' }]} onPress={() => Toast.error("Error Toast!")}>
                        <Text style={styles.buttonText}>Toast Error</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.row, { marginTop: 10 }]}>
                    <TouchableOpacity style={styles.button} onPress={() => setConfirmModal({ ...confirmModal, visible: true, variant: 'success' })}>
                        <Text style={styles.buttonText}>Open Confirmation Modal</Text>
                    </TouchableOpacity>
                </View>
            </Section>

            <Section title="3. Form & Input Elements">
                <StandardInput
                    label="Floating Label Input"
                    value={text}
                    onChangeText={setText}
                    containerStyle={{ marginBottom: 16 }}
                />

                <PasswordStrengthMeter password={password} />
                <StandardInput
                    label="Password Field"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <View style={{ height: 16 }} />

                <CustomDropdown
                    label="Dropdown Selection"
                    options={[
                        { label: 'Option A', value: 'a' },
                        { label: 'Option B', value: 'b' },
                        { label: 'Option C', value: 'c' }
                    ]}
                    value={dropdownValue}
                    onChange={setDropdownValue}
                />

                <View style={{ height: 16 }} />

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <CustomDatePicker
                            label="Date Picker"
                            value={date}
                            onChange={setDate}
                        />
                    </View>
                </View>

                <CustomDateTimePicker
                    label="Date Time Picker"
                    value={dateTime}
                    onChange={setDateTime}
                    mode="datetime"
                />

                <View style={{ height: 16 }} />

                <Text style={styles.label}>OTP Input (Standard usage)</Text>
                <CustomOTPInput
                    length={4}
                    value={otp}
                    onChange={setOtp}
                />

                <View style={{ height: 16 }} />

                <View style={styles.row}>
                    <CustomCheckbox
                        label="Checkbox Label"
                        checked={checked}
                        onChange={setChecked}
                    />
                </View>

                <View style={{ height: 16 }} />

                <Text style={styles.label}>Radio Buttons</Text>
                <CustomRadioButton
                    options={[
                        { label: 'Radio One', value: 'one' },
                        { label: 'Radio Two', value: 'two' }
                    ]}
                    value={radioValue}
                    onChange={setRadioValue}
                />

                <View style={{ height: 16 }} />

                <Text style={styles.label}>Toggle Switch Style</Text>
                <CustomToggleButton
                    options={[
                        { label: 'Option A', value: 'a' },
                        { label: 'Option B', value: 'b' }
                    ]}
                    value={toggleValue}
                    onChange={setToggleValue}
                />
            </Section>

            <Section title="4. Media & Assets">
                <Text style={styles.label}>Image Uploader (With Compression Sizes)</Text>
                <CustomImageUploader
                    images={images}
                    onImagesChange={setImages}
                    maxImages={3}
                />

                {images.length > 0 && (
                    <View style={styles.sizeReport}>
                        <Text style={styles.sizeReportTitle}>Compression Report:</Text>
                        {images.map((img, i) => (
                            <Text key={i} style={styles.sizeReportItem}>
                                Image {i + 1}: <Text style={{ fontWeight: '700' }}>{imageSizes[img.uri] || 'calculating...'}</Text>
                            </Text>
                        ))}
                    </View>
                )}

                <View style={{ height: 24 }} />

                <Text style={styles.label}>Voice Recorder</Text>
                <CustomVoiceRecorder
                    uri={voiceUri}
                    onRecordingComplete={setVoiceUri}
                />
                {voiceUri && (
                    <Text style={[styles.sizeReportItem, { marginTop: 8 }]}>
                        Voice Recording Size: <Text style={{ fontWeight: '700' }}>{voiceSize || 'calculating...'}</Text>
                    </Text>
                )}
            </Section>

            <Section title="5. Layout & Content">
                <SectionCard onEdit={() => Toast.info("Edit Clicked")}>
                    <DataRow label="User ID" value={user?.id || 'Not logged in'} />
                    <DataRow label="Email" value={user?.contactDetails?.email || 'N/A'} />
                    <DataRow label="Role" value={user?.userType || 'N/A'} />
                </SectionCard>

                <View style={{ height: 16 }} />

                <Text style={styles.label}>Tab Selector</Text>
                <TabSelector
                    options={[
                        { label: 'Hourly', value: 'hourly' },
                        { label: 'Fixed', value: 'fixed' }
                    ]}
                    selected={activeTab}
                    onSelect={setActiveTab}
                />

                <View style={{ height: 16 }} />

                <Text style={styles.label}>Address Card</Text>
                <AddressCard
                    address={{
                        id: 'dev',
                        formattedAddress: 'No. 123, Dev Street, Tech Park, Bangalore, Karnataka - 560001',
                        saveAs: 'Preview Home',
                        houseNo: '123',
                        area: 'Tech Park',
                        city: 'Bangalore',
                        state: 'Karnataka',
                        pincode: '560001',
                        latitude: 0,
                        longitude: 0
                    }}
                    onPress={() => Toast.success("Address Clicked!")}
                />
            </Section>

            <Section title="6. Bottom Sheets & Menus">
                <CustomButton
                    variant="outlined"
                    onPress={() => setShowSheet(true)}
                >
                    Open Action Sheet
                </CustomButton>

                <ActionSheetModal
                    visible={showSheet}
                    onClose={() => setShowSheet(false)}
                    title="Dev Action Sheet"
                >
                    <View style={{ gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => { setShowSheet(false); Toast.success("Action Preferred"); }}
                            style={styles.sheetItem}
                        >
                            <Ionicons name="star" size={20} color="#6366F1" />
                            <Text style={styles.sheetItemText}>Primary Action</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setShowSheet(false); Toast.info("Second option"); }}
                            style={styles.sheetItem}
                        >
                            <Ionicons name="share" size={20} color="#6B7280" />
                            <Text style={styles.sheetItemText}>Secondary Action</Text>
                        </TouchableOpacity>
                    </View>
                </ActionSheetModal>
            </Section>

            <Section title="7. Authentication State">
                <Text style={styles.desc}>User: {user ? user.contactDetails?.email : 'Guest'}</Text>
                <TouchableOpacity style={styles.button} onPress={logout}>
                    <Text style={styles.buttonText}>Logout & Clear Storage</Text>
                </TouchableOpacity>
            </Section>

            <View style={{ height: 100 }} />

            {/* Custom Modal Rendering */}
            <CustomConfirmationModal
                {...confirmModal}
                onClose={() => setConfirmModal({ ...confirmModal, visible: false })}
                onConfirm={() => {
                    Toast.success("Action Confirmed!");
                    setConfirmModal({ ...confirmModal, visible: false });
                }}
            />

        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6366F1',
        letterSpacing: 1.2,
        paddingHorizontal: 24,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    sectionContent: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        padding: 20,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    desc: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 12,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    button: {
        backgroundColor: '#6366F1',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    smallButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    sizeReport: {
        marginTop: 12,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sizeReportTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 4,
    },
    sizeReportItem: {
        fontSize: 12,
        color: '#6B7280',
    },
    sheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    sheetItemText: {
        fontSize: 16,
        marginLeft: 12,
        color: '#374151',
        fontWeight: '500',
    }
});
