import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import { palette } from '@tweak/theme';
import ActionSheetModal from '../UI/ActionSheetModal';
import CustomButton from '../UI/CustomButton';
import { StandardInput } from '../UI/StandardInput';

import { LocationAddressModalProps } from '../../types/location';

const schema = z.object({
    contactName: z.string().min(2, 'Name must be at least 2 characters'),
    houseNo: z.string().min(1, 'House No. is required'),
    area: z.string().min(1, 'Area is required'),
    directions: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().optional(),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
    phoneNumber: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
    saveAs: z.string(),
    saveAsOther: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LocationAddressModal({
    visible,
    onClose,
    onSave,
    formattedAddress,
    latitude,
    longitude,
    initialArea = '',
    initialCity = '',
    initialState = '',
    initialPincode = '',
    initialHouseNo = '',
    initialPhoneNumber = '',
    initialContactName = '',
    initialSaveAs = 'Home'
}: LocationAddressModalProps) {
    const { control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            contactName: initialContactName,
            houseNo: initialHouseNo,
            area: initialArea,
            directions: '',
            city: initialCity,
            state: initialState,
            pincode: initialPincode,
            phoneNumber: initialPhoneNumber,
            saveAs: initialSaveAs,
            saveAsOther: '',
        }
    });

    const saveAs = watch('saveAs');

    // Internal state to "freeze" the address details when modal opens
    const [lockedAddress, setLockedAddress] = React.useState(formattedAddress);
    const [lockedCoords, setLockedCoords] = React.useState({ latitude, longitude });

    // Refs for focus management
    const phoneInputRef = React.useRef<React.ComponentRef<typeof StandardInput>>(null);

    React.useEffect(() => {
        if (visible) {
            setLockedAddress(formattedAddress);
            setLockedCoords({ latitude, longitude });
            reset({
                contactName: initialContactName,
                houseNo: initialHouseNo,
                area: initialArea,
                directions: '',
                city: initialCity,
                state: initialState,
                pincode: initialPincode,
                phoneNumber: initialPhoneNumber,
                saveAs: initialSaveAs,
                saveAsOther: '',
            });
        }
    }, [visible, initialArea, initialCity, initialState, initialPincode, initialHouseNo, initialPhoneNumber, initialContactName, initialSaveAs, reset]);

    const saveAsOptions = [
        { label: 'Home', value: 'Home' },
        { label: 'Work', value: 'Work' },
        { label: 'Friends and Family', value: 'Friends' },
        { label: 'Other', value: 'Other' },
    ];

    const onSubmit = (data: FormData) => {
        const { saveAsOther, ...addressData } = data;
        onSave({
            ...addressData,
            id: Date.now().toString(),
            saveAs: data.saveAs === 'Other' ? saveAsOther || 'Other' : data.saveAs,
            formattedAddress: lockedAddress,
            latitude: lockedCoords.latitude,
            longitude: lockedCoords.longitude
        });
    };

    return (
        <ActionSheetModal
            visible={visible}
            onClose={onClose}
            title={lockedAddress.split(',')[0] || 'Address Details'}
            subtitle={lockedAddress.split(',').slice(1).join(',').trim() || `${lockedCoords.latitude.toFixed(4)}, ${lockedCoords.longitude.toFixed(4)}`}
        >
            <View className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 mb-8 flex-row items-center">
                <View className="bg-blue-500 p-2 rounded-lg mr-3">
                    <Ionicons name="information-circle" size={18} color="white" />
                </View>
                <Text className="text-blue-900 text-xs flex-1 font-medium leading-4">
                    Detailed address helps applicants reach you faster and without confusion.
                </Text>
            </View>

            {/* Form Fields */}
            <View className="gap-6">
                <View>
                    <Controller
                        control={control}
                        name="contactName"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <StandardInput
                                label="Contact Person's Name"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                placeholder="Enter name"
                                error={errors.contactName?.message}
                            />
                        )}
                    />
                </View>
                <View>
                    <Controller
                        control={control}
                        name="houseNo"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <StandardInput
                                label="House / Flat / Block No."
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                placeholder="e.g. #42, Green Heights"
                                error={errors.houseNo?.message}
                            />
                        )}
                    />
                </View>

                <View>
                    <Controller
                        control={control}
                        name="area"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <StandardInput
                                label="Apartment / Road / Area"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                placeholder="e.g. HSR Layout, Sector 2"
                                error={errors.area?.message}
                            />
                        )}
                    />
                </View>

                <View>
                    <Controller
                        control={control}
                        name="directions"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <StandardInput
                                label="Nearby Landmark / Directions"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                placeholder="e.g. Opposite the blue gate near park"
                                multiline
                            />
                        )}
                    />
                </View>

                <View className="flex-row gap-4">
                    <View className="flex-1">
                        <View className="flex-1">
                            <Controller
                                control={control}
                                name="city"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <StandardInput
                                        label="City"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        placeholder="City"
                                        error={errors.city?.message}
                                    />
                                )}
                            />
                        </View>
                        <View className="flex-1">
                            <Controller
                                control={control}
                                name="pincode"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <StandardInput
                                        label="Pincode"
                                        onBlur={onBlur}
                                        onChangeText={(text) => {
                                            const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                                            onChange(cleaned);
                                        }}
                                        value={value}
                                        placeholder="000000"
                                        keyboardType="numeric"
                                        error={errors.pincode?.message}
                                        maxLength={6}
                                    />
                                )}
                            />
                        </View>
                    </View>
                </View>

                <View>
                    <Text className="text-gray-400 text-[10px] font-bold mb-3 uppercase tracking-widest px-1">Save Address As</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {saveAsOptions.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                onPress={() => setValue('saveAs', opt.value)}
                                activeOpacity={0.7}
                                style={[
                                    styles.chip,
                                    saveAs === opt.value ? styles.chipActive : styles.chipInactive
                                ]}
                            >
                                <Ionicons
                                    name={
                                        opt.value === 'Home' ? 'home' :
                                            opt.value === 'Work' ? 'briefcase' :
                                                opt.value === 'Friends' ? 'people' : 'location'
                                    }
                                    size={18}
                                    color={saveAs === opt.value ? 'white' : palette.gray500}
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={[
                                    styles.chipText,
                                    saveAs === opt.value ? styles.chipTextActive : styles.chipTextInactive
                                ]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {saveAs === 'Other' && (
                    <Controller
                        control={control}
                        name="saveAsOther"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <StandardInput
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                className="text-primary font-bold"
                                containerStyle={{ backgroundColor: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.2)' }}
                                placeholder="Label name (e.g. Gym, Library)"
                                autoFocus
                            />
                        )}
                    />
                )}

                <View>
                    <Controller
                        control={control}
                        name="phoneNumber"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <StandardInput
                                label="Your Contact Number"
                                ref={phoneInputRef}
                                onBlur={onBlur}
                                onChangeText={(text) => {
                                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                                    onChange(cleaned);
                                }}
                                value={value}
                                placeholder="00000 00000"
                                keyboardType="numeric"
                                error={errors.phoneNumber?.message}
                                maxLength={10}
                                leftComponent={
                                    <View className="flex-row items-center border-r border-gray-200 pr-3 h-6">
                                        <Text className="text-gray-900 font-bold">+91</Text>
                                    </View>
                                }
                            />
                        )}
                    />
                    <View className="flex-row items-center mt-2 px-1">
                        <Ionicons name="lock-closed" size={12} color={palette.gray400} />
                        <Text className="text-gray-400 text-[10px] ml-1">
                            Only visible to confirmed applicants.
                        </Text>
                    </View>
                </View>
            </View>

            <View className="h-10" />
            <CustomButton
                onPress={handleSubmit(onSubmit)}
                variant="filled"
                className="rounded-2xl shadow-xl shadow-primary/20"
            >
                <Text className="text-white font-bold text-lg">Save & Continue</Text>
            </CustomButton>

        </ActionSheetModal>
    );
}
const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 2,
    },
    chipActive: {
        backgroundColor: palette.indigo500,
        borderColor: palette.indigo500,
        shadowColor: palette.indigo500,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    chipInactive: {
        backgroundColor: 'white',
        borderColor: palette.gray100,
    },
    chipText: {
        fontWeight: 'bold',
    },
    chipTextActive: {
        color: 'white',
    },
    chipTextInactive: {
        color: palette.gray700,
    },
});
