import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import ProfileHeaderRight from '../../components/Header/ProfileHeaderRight';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import CreateTweakNavButtons from '../../components/UI/CreateTweakNavButtons';
import CustomDropdown from '../../components/UI/CustomDropdown';
import CustomLabelledField from '../../components/UI/CustomLabelledField';
import CustomRadioButton from '../../components/UI/CustomRadioButton';

const schema = z.object({
    category: z.string().min(1, 'Category is required'),
    customCategory: z.string().optional(),
    lookingFor: z.array(z.string()).min(1, 'Select at least one skill'),
    languages: z.array(z.string()).min(1, 'Select at least one language'),
    experience: z.boolean().nullable().refine(val => val !== null, 'Please select an option'),
    kycVerified: z.boolean().nullable().refine(val => val !== null, 'Please select an option'),
});

type FormData = z.infer<typeof schema>;

export default function CreateTweakStep2() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<any>({
        resolver: zodResolver(schema),
        defaultValues: {
            category: '',
            customCategory: '',
            lookingFor: [],
            languages: [],
            experience: null,
            kycVerified: null,
        }
    });

    const category = watch('category');
    const languages = watch('languages');

    // Mock Options
    const categoryOptions = [
        { label: 'Technology & Programming', value: 'tech' },
        { label: 'Design & Creative', value: 'design' },
        { label: 'Writing & Translation', value: 'writing' },
        { label: 'Cloud Services', value: 'cloud' },
        { label: 'Delivery', value: 'delivery' },
        { label: 'Other', value: 'other' },
    ];

    const lookingForOptions = [
        { label: 'Python Developer', value: 'python' },
        { label: 'Graphic Designer', value: 'graphic_designer' },
        { label: 'Content Writer', value: 'content_writer' },
        { label: 'Courier', value: 'courier' },
        { label: 'Accountant', value: 'accountant' },
        { label: 'Lawn Mowing', value: 'lawn_mowing' },
    ];

    const languageOptions = [
        { label: 'English', value: 'english' },
        { label: 'Spanish', value: 'spanish' },
        { label: 'French', value: 'french' },
        { label: 'German', value: 'german' },
        { label: 'Hindi', value: 'hindi' },
        { label: 'Malayalam', value: 'malayalam' },
        { label: 'Not Preferred', value: 'not_preferred' },
    ];

    const booleanOptions = [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
    ];

    // Handle Language Change to enforce 'Not Preferred' exclusivity
    const handleLanguageChange = (newValues: string[]) => {
        // Did we just add 'not_preferred'?
        if (newValues.includes('not_preferred') && !languages.includes('not_preferred')) {
            setValue('languages', ['not_preferred']);
            return;
        }

        // Did we just add something else while 'not_preferred' was active?
        if (languages.includes('not_preferred') && newValues.length > 1) {
            // Remove 'not_preferred' and keep the rest
            const filtered = newValues.filter(v => v !== 'not_preferred');
            setValue('languages', filtered);
            return;
        }

        setValue('languages', newValues);
    };

    const onSubmit = (data: FormData) => {
        router.push({
            pathname: '/create-tweak/step3',
            params: {
                ...params,
                category: data.category === 'other' ? data.customCategory : data.category,
                lookingFor: JSON.stringify(data.lookingFor),
                languages: JSON.stringify(data.languages),
                experience: String(data.experience),
                kycVerified: String(data.kycVerified),
            }
        });
    };

    // Inside component
    return (
        <ScreenWrapper scrollable contentContainerStyle={{ flexGrow: 1 }}>
            <View className="px-6 py-4 border-b border-gray-100 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold">Create Tweak</Text>
                </View>
                <View className="flex-row items-center gap-4">
                    <Text className="text-primary font-bold">Step 2 of 4</Text>
                    <ProfileHeaderRight />
                </View>
            </View>

            <View className="px-6 py-6 pb-24">
                <View className="mb-6">
                    <Text className="text-2xl font-bold text-text mb-2">
                        Details & Preferences
                    </Text>
                    <Text className="text-base text-textSecondary">
                        Choose a category and tell us who you are looking for.
                    </Text>
                </View>

                {/* Category */}
                <Controller
                    control={control}
                    name="category"
                    render={({ field: { onChange, value } }) => (
                        <CustomDropdown
                            label="Category"
                            placeholder="Select Category"
                            options={categoryOptions}
                            value={value}
                            onChange={(val) => {
                                onChange(val);
                                if (val !== 'other') setValue('customCategory', '');
                            }}
                            containerStyle={{ marginBottom: 24 }}
                        />
                    )}
                />

                {/* Custom Category Input if 'Other' is selected */}
                {category === 'other' && (
                    <Controller
                        control={control}
                        name="customCategory"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <CustomLabelledField
                                label="Category name for your tweak"
                                placeholder="Enter category name"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value || ''}
                                containerStyle={{ marginTop: -8, marginBottom: 24 }}
                            />
                        )}
                    />
                )}

                {/* Looking For (Multi-Select) */}
                <Controller
                    control={control}
                    name="lookingFor"
                    render={({ field: { onChange, value } }) => (
                        <CustomDropdown
                            label="Choose what you are looking for"
                            placeholder="Select skills/roles"
                            options={lookingForOptions}
                            value={value}
                            onChange={onChange}
                            multiSelect
                            containerStyle={{ marginBottom: 24 }}
                        />
                    )}
                />

                {/* Languages (Multi-Select) */}
                <Controller
                    control={control}
                    name="languages"
                    render={({ field: { value } }) => (
                        <CustomDropdown
                            label="Languages preferred"
                            placeholder="Select languages"
                            options={languageOptions}
                            value={value}
                            onChange={handleLanguageChange}
                            multiSelect
                            containerStyle={{ marginBottom: 24 }}
                        />
                    )}
                />

                {/* Experience Preference */}
                <View className="mb-6">
                    <Text className="text-gray-700 text-base mb-3">
                        Are you looking for someone with previous experience?
                    </Text>
                    <Controller
                        control={control}
                        name="experience"
                        render={({ field: { onChange, value } }) => (
                            <CustomRadioButton
                                options={booleanOptions}
                                value={value}
                                onChange={onChange}
                            />
                        )}
                    />
                    {errors.experience && <Text className="text-red-500 text-xs mt-1">{(errors.experience as any).message}</Text>}
                </View>

                {/* KYC Preference */}
                <View className="mb-6">
                    <Text className="text-gray-700 text-base mb-3">
                        Do you want only KYC verified users?
                    </Text>
                    <Controller
                        control={control}
                        name="kycVerified"
                        render={({ field: { onChange, value } }) => (
                            <CustomRadioButton
                                options={booleanOptions}
                                value={value}
                                onChange={onChange}
                            />
                        )}
                    />
                    {errors.kycVerified && <Text className="text-red-500 text-xs mt-1">{(errors.kycVerified as any).message}</Text>}
                </View>

            </View>

            <CreateTweakNavButtons
                onNext={handleSubmit(onSubmit)}
                onSaveDraft={handleSubmit(() => router.push('/create-tweak/preview'))}
            />
        </ScreenWrapper>
    );
}
