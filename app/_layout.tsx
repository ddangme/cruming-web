import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { useRouter, Slot } from 'expo-router';
import CustomHeader from "@/components/CustomHeader";
import { AuthProvider, useAuth } from '@/api/context/AuthContext';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    useEffect(() => {
        const checkAuth = async () => {
            if (!authLoading && loaded && !user) {
                router.replace('/login');
            }
        };

        checkAuth();
    }, [user, authLoading, loaded]);

    if (!loaded || authLoading) {
        return <Slot />;
    }

    return (
        <SafeAreaProvider>
            <Stack
                screenOptions={{
                    contentStyle: { backgroundColor: 'white' },
                    headerShown: true,
                    header: () => <CustomHeader />,
                    headerStyle: {
                        backgroundColor: 'transparent',
                    }
                }}
            >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                    name="login"
                    options={{
                        headerShown: false,
                        presentation: 'fullScreenModal',
                    }}
                />
            </Stack>
        </SafeAreaProvider>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootLayoutNav />
        </AuthProvider>
    );
}