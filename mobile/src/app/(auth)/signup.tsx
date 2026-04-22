import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/design-system';

/**
 * Signup deep-link handler.
 * Catch-all for entry-club://(auth)/signup?code=REFERENCE_CODE
 */
export default function SignupRedirect() {
    const { code } = useLocalSearchParams();
    const router = useRouter();

    useEffect(() => {
        const handleDeepLink = async () => {
            if (code) {
                console.log('[DeepLink] 📎 Storing referral code:', code);
                await AsyncStorage.setItem('pending_referral_code', code as string);
            }
            // Redirect to the main login/auth entry point
            router.replace('/(auth)/login');
        };

        handleDeepLink();
    }, [code]);

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background.dark, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );
}
