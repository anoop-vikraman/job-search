import React from 'react';
import { Text, View } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';

export default function Jobs() {
    return (
        <ScreenWrapper>
            <View className="flex-1 justify-center items-center">
                <Text className="text-xl font-bold text-gray-900">Permanent Jobs</Text>
                <Text className="text-gray-500 mt-2">Coming Soon</Text>
            </View>
        </ScreenWrapper>
    );
}
