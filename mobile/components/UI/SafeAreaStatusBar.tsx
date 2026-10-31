import { StatusBar, StatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
    backgroundColor: string;
    style?: StatusBarStyle;
}

export default function SafeAreaStatusBar({ backgroundColor, style = 'auto' }: Props): React.JSX.Element {
    return (
        <SafeAreaView
            edges={['top']}
            style={{ backgroundColor }}
        >
            <StatusBar style={style} />
        </SafeAreaView>
    );
}