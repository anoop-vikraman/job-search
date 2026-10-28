import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themeColors } from '../themes/colors';
import { ScreenWrapperProps } from '../types/ui';

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    style,
    keyboardOffset = 0,
    scrollable = false,
    contentContainerStyle,
    edges,
}) => {
    // On Android, 'height' behavior works best with 'windowSoftInputMode: adjustResize'
    // On iOS, 'padding' is the standard.
    const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

    return (
        <SafeAreaView
            edges={edges || ['left', 'right', 'bottom']}
            style={[{
                flex: 1,
                backgroundColor: themeColors.background
            }, style]}
        >
            <KeyboardAvoidingView
                behavior={keyboardBehavior}
                style={{ flex: 1 }}
                keyboardVerticalOffset={keyboardOffset}
            >
                {scrollable ? (
                    <ScrollView
                        contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {children}
                    </ScrollView>
                ) : (
                    <View style={[{ flex: 1 }, contentContainerStyle]}>
                        {children}
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};
