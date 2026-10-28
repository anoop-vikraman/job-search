import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SelectableCardProps {
    title: string;
    children: React.ReactNode;
    isSelected: boolean;
    onSelect: () => void;
}

export default function SelectableCard({ title, children, isSelected, onSelect }: SelectableCardProps) {
    return (
        <View style={[
            styles.container,
            isSelected ? styles.containerSelected : styles.containerUnselected
        ]}>
            <TouchableOpacity
                onPress={onSelect}
                activeOpacity={0.7}
                style={styles.header}
            >
                <Text style={[
                    styles.title,
                    isSelected ? styles.titleSelected : styles.titleUnselected
                ]}>
                    {title}
                </Text>
                <View style={[
                    styles.radio,
                    isSelected ? styles.radioSelected : styles.radioUnselected
                ]}>
                    {isSelected && <View style={styles.radioDot} />}
                </View>
            </TouchableOpacity>
            {isSelected && (
                <View style={styles.content}>
                    {children}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    containerSelected: {
        borderColor: '#6366f1',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    containerUnselected: {
        borderColor: '#e5e7eb',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    titleSelected: {
        color: '#6366f1',
    },
    titleUnselected: {
        color: '#111827',
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: '#6366f1',
        backgroundColor: '#6366f1',
    },
    radioUnselected: {
        borderColor: '#d1d5db',
        backgroundColor: 'white',
    },
    radioDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 8,
    },
});
