import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TabSelectorProps } from '../../types/ui';

export default function TabSelector({ options, selected, onSelect }: TabSelectorProps) {
    return (
        <View style={styles.container}>
            {options.map((option) => (
                <TouchableOpacity
                    key={option.value}
                    onPress={() => onSelect(option.value)}
                    style={[
                        styles.tab,
                        selected === option.value && styles.tabActive
                    ]}
                    activeOpacity={0.7}
                >
                    <Text style={[
                        styles.tabText,
                        selected === option.value && styles.tabTextActive
                    ]}>
                        {option.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#6366F1',
    },
});
