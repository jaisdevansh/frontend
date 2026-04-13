import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StaffLayout() {
    const router = useRouter();
    const segments = useSegments();
    const { user } = useAuth();
    const [hasRouted, setHasRouted] = useState(false);

    useEffect(() => {
        const checkAndRoute = async () => {
            // Check if we're in staff section and at tabs
            const inStaffSection = segments[0] === '(staff)';
            const atTabs = segments[segments.length - 1] === 'tabs';
            
            if (!inStaffSection || !atTabs || hasRouted) {
                return; // Don't route if not at tabs or already routed
            }
            
            console.log('[StaffLayout] 🔍 Starting staff routing check...');
            
            let staffType = null;
            
            // Step 1: Try user object
            if (user?.staffType) {
                staffType = user.staffType.toUpperCase();
                console.log('[StaffLayout] ✅ Found staffType in user object:', staffType);
            }
            
            // Step 2: Try AsyncStorage
            if (!staffType) {
                try {
                    const authData = await AsyncStorage.getItem('auth');
                    if (authData) {
                        const parsed = JSON.parse(authData);
                        
                        // Check multiple possible locations
                        staffType = parsed.user?.staffType?.toUpperCase() 
                                 || parsed.staffType?.toUpperCase()
                                 || parsed.data?.staffType?.toUpperCase();
                        
                        if (staffType) {
                            console.log('[StaffLayout] ✅ Found staffType in AsyncStorage:', staffType);
                        }
                    }
                } catch (e) {
                    console.log('[StaffLayout] ⚠️ AsyncStorage read failed:', e);
                }
            }
            
            // Step 3: Try fetching from backend if role is STAFF
            if (!staffType && (user?.role?.toUpperCase() === 'STAFF')) {
                console.log('[StaffLayout] 🌐 Fetching staffType from backend...');
                try {
                    const { staffService } = await import('../../services/staffService');
                    const profileRes = await staffService.getProfile();
                    
                    if (profileRes.success && profileRes.data?.staffType) {
                        staffType = profileRes.data.staffType.toUpperCase();
                        console.log('[StaffLayout] ✅ Fetched staffType from backend:', staffType);
                        
                        // Save to AsyncStorage for next time
                        try {
                            const authData = await AsyncStorage.getItem('auth');
                            if (authData) {
                                const parsed = JSON.parse(authData);
                                parsed.staffType = staffType;
                                if (parsed.user) {
                                    parsed.user.staffType = staffType;
                                }
                                await AsyncStorage.setItem('auth', JSON.stringify(parsed));
                                console.log('[StaffLayout] ✅ Saved staffType to AsyncStorage');
                            }
                        } catch (e) {
                            console.log('[StaffLayout] ⚠️ Failed to save to AsyncStorage:', e);
                        }
                    }
                } catch (err) {
                    console.log('[StaffLayout] ❌ Backend fetch failed:', err.message);
                }
            }
            
            // Step 4: Route based on staffType
            setHasRouted(true);
            
            if (staffType === 'SECURITY') {
                console.log('[StaffLayout] 🚀 Redirecting to SECURITY panel');
                router.replace('/(staff)/security');
            } else if (staffType === 'WAITER') {
                console.log('[StaffLayout] 🚀 Redirecting to WAITER panel');
                router.replace('/(staff)/waiter');
            } else {
                console.log('[StaffLayout] ⚠️ No valid staffType found, staying on tabs');
                console.log('[StaffLayout] 💡 User can manually navigate from profile tab');
            }
        };

        checkAndRoute();
    }, [user, segments, hasRouted, router]);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="tabs" />
            <Stack.Screen name="security" />
            <Stack.Screen name="waiter" />
        </Stack>
    );
}
