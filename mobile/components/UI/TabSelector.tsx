import { palette } from '@tweak/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TabSelectorProps } from '../../types/ui';

export default function TabSelector({ options, selected, onSelect }: TabSelectorProps): React.JSX.Element {
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
        backgroundColor: palette.gray100,
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
        backgroundColor: palette.white,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: palette.gray500,
    },
    tabTextActive: {
        color: palette.indigo500,
    },
});
