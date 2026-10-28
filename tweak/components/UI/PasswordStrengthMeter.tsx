import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PasswordStrengthMeterProps } from '../../types/auth';

export default function PasswordStrengthMeter({
    password = '',
}: PasswordStrengthMeterProps) {
    const [strength, setStrength] = useState(0);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        calculateStrength(password);
    }, [password]);

    const calculateStrength = (pass: string) => {
        let score = 0;
        if (!pass) {
            setStrength(0);
            setFeedback('');
            return;
        }

        // Criteria
        const hasMinLength = pass.length >= 8;
        const hasNumber = /\d/.test(pass);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
        const hasSmall = /[a-z]/.test(pass);
        const hasCapital = /[A-Z]/.test(pass);

        if (hasMinLength) score += 1;
        if (hasNumber) score += 1;
        if (hasSpecial) score += 1;
        if (hasSmall) score += 1;
        if (hasCapital) score += 1;

        // Cap score at 5 for our segments
        setStrength(score);

        // Feedback Logic
        if (score < 2) setFeedback('Weak');
        else if (score < 4) setFeedback('Medium');
        else if (score >= 5) setFeedback('Strong');
        else setFeedback('Good');
    };

    const getBarColor = (index: number) => {
        if (index >= strength) return '#E5E7EB'; // gray-200
        if (strength <= 2) return '#EF4444'; // red-500
        if (strength <= 4) return '#F59E0B'; // amber-500
        return '#10B981'; // green-500
    };

    return (
        <View className="mt-2">
            {/* Strength Bars */}
            {password.length > 0 && (
                <View className="flex-row items-center mb-1">
                    <Text className="text-xs text-gray-500 mr-2 flex-row flex-1 flex-wrap">
                        <Text className="font-bold text-gray-900">{feedback}</Text> password, add more characters to make it <Text className="font-bold text-gray-900">strong</Text>
                    </Text>
                    <View className="flex-row flex-1 justify-end items-center gap-1">
                        {[0, 1, 2, 3, 4].map((index) => (
                            <View
                                key={index}
                                style={[
                                    styles.bar,
                                    { backgroundColor: getBarColor(index) }
                                ]}
                            />
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        width: 12,
        height: 6,
        borderRadius: 2,
    }
});
