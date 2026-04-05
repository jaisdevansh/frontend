import { useEffect, useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';

export function useStrictBack(fallbackRoute?: any) {
    const navigation = useNavigation();
    const router = useRouter();

    const goBack = useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else if (fallbackRoute) {
            router.replace(fallbackRoute);
        }
        
        // Always return true to BackHandler to signify we've intercepted the system event
        // This prevents the default (sometimes buggy) OS behavior from triggering simultaneously
        return true;
    }, [navigation, router, fallbackRoute]);

    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', goBack);
        return () => subscription.remove();
    }, [goBack]);

    return goBack;
}
