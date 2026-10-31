import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal, ScrollView, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { z } from 'zod';
import CreateFlowHeader from '../../components/create-tweak/CreateFlowHeader';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CustomButton from '../../components/UI/CustomButton';
import CustomDropdown from '../../components/UI/CustomDropdown';
import CustomImageUploader from '../../components/UI/CustomImageUploader';
import CustomLabelledField from '../../components/UI/CustomLabelledField';
import CustomVoiceRecorder from '../../components/UI/CustomVoiceRecorder';
import { FeatureFlags } from '../../constants/featureFlags';
import { useAppStore } from '../../store/useAppStore';
import { useConfirmationStore } from '../../store/useConfirmationStore';
import { useCreateTweakStore } from '../../store/useCreateTweakStore';

const schema = z.object({
    description: z.string().min(1, 'Please enter a description for your tweak'),
});

type FormData = z.infer<typeof schema>;

// Mock data for dropdowns
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

const PLACEHOLDERS = [
    "E.g. I need my kitchen tap fixed. It has been leaking for 2 days...",
    "E.g. Looking for someone to help me move a sofa to the second floor...",
    "E.g. Need a deep cleaning service for my 2BHK apartment...",
    "E.g. I need an electrician to fix a short circuit in the living room..."
];

export default function DetailsPage() {
    const router = useRouter();
    const {
        tweakType,
        setDescription, setImages, setAudioUri, setAddress,
        setSkills, setLanguages,
        description, images, audioUri, address, skills, languages
    } = useCreateTweakStore();
    const confirm = useConfirmationStore(state => state.confirm);

    const { savedAddresses } = useAppStore();
    const [showAddressList, setShowAddressList] = useState(false);
    const [isSkillsDropdownVisible, setIsSkillsDropdownVisible] = useState(false);

    // Skills "Other" logic
    const [showOtherSkillInput, setShowOtherSkillInput] = useState(false);
    const [otherSkill, setOtherSkill] = useState('');

    // Internal state for dropdowns to handle "Others" interception
    const [selectedSkills, setSelectedSkills] = useState<string[]>(skills || []);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(languages || []);

    // Placeholder Carousel Logic
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            description: description || '',
        }
    });

    // Handle "Others" for Skills
    const handleSkillsChange = (newSkills: string[]) => {
        if (newSkills.includes('Others')) {
            // Remove 'Others' from immediate selection and open modal
            const filtered = newSkills.filter(s => s !== 'Others');
            setSelectedSkills(filtered);
            setIsSkillsDropdownVisible(false);
            setShowOtherSkillInput(true);
        } else {
            setSelectedSkills(newSkills);
            setSkills(newSkills);
        }
    };

    const confirmOtherSkill = () => {
        if (otherSkill.trim()) {
            const newSkills = otherSkill
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            if (newSkills.length > 0) {
                // Filter out duplicates that might already be selected
                const uniqueNewSkills = newSkills.filter(s => !selectedSkills.includes(s));
                const updated = [...selectedSkills, ...uniqueNewSkills];
                setSelectedSkills(updated);
                setSkills(updated);
            }

            setOtherSkill('');
            setShowOtherSkillInput(false);
        }
    };

    const handleLanguagesChange = (newLangs: string[]) => {
        setSelectedLanguages(newLangs);
        setLanguages(newLangs);
    };

    const onSubmit = (data: FormData) => {
        if (tweakType === 'in_person' && !address) {
            confirm({
                title: 'Location Required',
                message: 'Please select a location for on-site tweaks to continue.',
                variant: 'warning',
                confirmLabel: 'OK'
            });
            return;
        }

        // Final sync before next
        setDescription(data.description);
        setSkills(selectedSkills);
        setLanguages(selectedLanguages);

        router.push('/create-tweak/preferences');
    };

    const handleSaveDraft = () => {
        confirm({
            title: 'Draft Saved',
            message: 'Your progress has been saved successfully.',
            variant: 'success',
            confirmLabel: 'Great'
        });
    };

    return (
        <ScreenWrapper>
            <CreateFlowHeader
                stepLabel="Tweak Details"
                progress={0.38}
            />

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 20 }}>
                <Text className="text-3xl font-bold text-gray-900 mb-2">Describe Your Tweak</Text>
                <Text className="text-gray-500 mb-8">The more details you provide, the better match we can find for you.</Text>

                <View className="gap-8">

                    {/* 1. Description */}
                    <Controller
                        control={control}
                        name="description"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <CustomLabelledField
                                label="What task do you need help with?"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                multiline
                                placeholder={PLACEHOLDERS[placeholderIndex]}
                                maxLength={1000}
                                showCharCount
                                error={errors.description?.message}
                                containerStyle={{ minHeight: 120 }}
                                required
                            />
                        )}
                    />

                    {/* 2. Voice */}
                    <CustomVoiceRecorder
                        uri={audioUri || null}
                        onRecordingComplete={setAudioUri}
                        label="Tap to record additional info"
                    />

                    {/* 3. Media */}
                    <CustomImageUploader
                        images={images || []}
                        onImagesChange={setImages}
                        maxImages={6}
                        showThumbnailFeature={FeatureFlags.ENABLE_THUMBNAIL_FEATURE}
                    />

                    {/* 4. Languages Dropdown */}
                    <CustomDropdown
                        label="Preferred Languages"
                        options={LANGUAGES_LIST}
                        value={selectedLanguages}
                        onChange={handleLanguagesChange}
                        multiSelect
                        placeholder="Select languages"
                    />

                    {/* 5. Skills Dropdown */}
                    <CustomDropdown
                        label="Required Skills"
                        options={SKILLS_LIST}
                        value={selectedSkills}
                        onChange={handleSkillsChange}
                        multiSelect
                        placeholder="Select skills needed"
                        visible={isSkillsDropdownVisible}
                        onVisibleChange={setIsSkillsDropdownVisible}
                    />


                    {/* Buttons at the end of the form */}
                    <View className="mt-4 flex-row gap-3">
                        <CustomButton
                            variant="outlined"
                            className="flex-1"
                            onPress={handleSaveDraft}
                            textClassName="text-base"
                        >
                            Save as Draft
                        </CustomButton>
                        <CustomButton
                            className="flex-1"
                            onPress={handleSubmit(onSubmit)}
                            textClassName="text-base"
                        >
                            Continue
                        </CustomButton>
                    </View>

                </View>
            </ScrollView>

            {/* Other Skill Input Modal */}
            <Modal
                transparent={true}
                visible={showOtherSkillInput}
                animationType="fade"
                onRequestClose={() => setShowOtherSkillInput(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowOtherSkillInput(false)}>
                    <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-white rounded-t-3xl p-6">
                            <Text className="text-lg font-bold text-gray-900 mb-2">Add Custom Skill</Text>
                            <View className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex-row items-start mb-4">
                                <Ionicons name="alert-circle" size={20} color="#EAB308" style={{ marginTop: 2 }} />
                                <Text className="text-yellow-800 ml-2 flex-1 text-sm">
                                    Your suggestion will be reviewed. You can add multiple skills separated by commas (e.g. Painting, Masonry).
                                </Text>
                            </View>

                            <TextInput
                                placeholder="Type skill name..."
                                value={otherSkill}
                                onChangeText={setOtherSkill}
                                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base mb-4"
                                autoFocus
                            />
                            <CustomButton
                                onPress={confirmOtherSkill}
                                disabled={!otherSkill.trim()}
                            >
                                Add Skill
                            </CustomButton>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </ScreenWrapper>
    );
}
