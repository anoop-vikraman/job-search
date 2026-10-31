import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'tweak',
    slug: 'tweak',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'tweak',
    userInterfaceStyle: 'automatic',
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.anonymous.tweak'
    },
    android: {
        adaptiveIcon: {
            backgroundColor: '#246BFD',
            foregroundImage: './assets/images/android-icon-foreground.png',
            backgroundImage: './assets/images/android-icon-background.png',
            monochromeImage: './assets/images/android-icon-monochrome.png'
        },
        predictiveBackGestureEnabled: false,
        package: 'com.anonymous.tweak',
        permissions: [
            'ACCESS_COARSE_LOCATION',
            'ACCESS_FINE_LOCATION',
            'FOREGROUND_SERVICE'
        ],
        config: {
            googleMaps: {
                apiKey: process.env.GOOGLE_MAPS_API_KEY
            }
        }
    },
    web: {
        output: 'static',
        favicon: './assets/images/favicon.png'
    },
    plugins: [
        'expo-router',
        [
            'expo-splash-screen',
            {
                image: './assets/images/splash3.png',
                imageWidth: 200,
                resizeMode: 'contain',
                backgroundColor: '#0842A7',
                dark: {
                    backgroundColor: '#0842A7'
                }
            }
        ],
        'expo-audio',
        'expo-video',
        [
            'expo-build-properties',
            {
                android: {
                    enableProguardInReleaseBuilds: process.env.PROTECT_APP === 'true',
                    enableShrinkResourcesInReleaseBuilds: process.env.PROTECT_APP === 'true',
                    enableMinifyInReleaseBuilds: process.env.PROTECT_APP === 'true'
                }
            }
        ]
    ],
    experiments: {
        typedRoutes: true,
        reactCompiler: true
    },
});
