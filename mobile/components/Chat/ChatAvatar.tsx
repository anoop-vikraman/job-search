import React from 'react';
import { Image, Text, View } from 'react-native';
import { palette } from '@tweak/theme';

import type { ChatParticipant } from '../../types/api';

interface ChatAvatarProps {
    user: ChatParticipant;
    size?: number;
}

export default function ChatAvatar({ user, size = 44 }: ChatAvatarProps): React.JSX.Element {
    if (user.profile_picture_url) {
        return (
            <Image
                source={{ uri: user.profile_picture_url }}
                style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.indigo50 }}
            />
        );
    }
    const initial = (user.first_name?.trim().charAt(0) || '?').toUpperCase();
    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: palette.indigo50,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ fontSize: size * 0.42, fontWeight: '800', color: palette.indigo600 }}>{initial}</Text>
        </View>
    );
}
