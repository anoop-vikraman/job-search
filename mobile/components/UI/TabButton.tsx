import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

interface TabButtonProps {
    label: string;
    active: boolean;
    onPress: () => void;
    count?: number;
}

export default function TabButton({ label, active, onPress, count }: TabButtonProps): React.JSX.Element {
    return (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-1 py-3 px-4 rounded-xl ${active ? 'bg-primary' : 'bg-gray-100 dark:bg-slate-800'
                }`}
            activeOpacity={0.7}
        >
            <Text
                className={`text-center font-bold text-sm ${active ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                    }`}
            >
                {label}
                {count !== undefined && count > 0 && ` (${count})`}
            </Text>
        </TouchableOpacity>
    );
}
