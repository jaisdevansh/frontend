import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { Platform, LogBox, DeviceEventEmitter } from 'react-native';
import { enableScreens } from 'react-native-screens';
import * as Haptics from 'expo-haptics';
import { log } from '../utils/logger';

// @ts-ignore
if (global.ErrorUtils) {
  // @ts-ignore
  global.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    log("GLOBAL ERROR:", error?.message || error);
  });
}

enableScreens(true);
import 'react-native-reanimated';
import * as NavigationBar from 'expo-navigation-bar';

LogBox.ignoreLogs([
  'expo-notifications: Android Push',
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
  '`setBackgroundColorAsync` is not supported with edge-to-edge enabled.'
]);

if (Platform.OS === 'android') {
  try {
    NavigationBar.setBackgroundColorAsync('#030303');
    NavigationBar.setButtonStyleAsync('light');
  } catch (e) {
    // Edge-to-edge handled automatically, ignore warning
  }
}

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider, useToast } from '../context/ToastContext';
import { AlertProvider } from '../context/AlertProvider';
import { NotificationProvider } from '../context/NotificationContext';
import { useNotifications } from '../hooks/useNotifications';
import { useHostProfile } from '../hooks/useHostProfile';
import { NetworkProvider } from '../context/NetworkProvider';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      const status = error?.response?.status;
      // 🤐 SILENCE: 502/503 (server restarts) and 401 (auth transitions) 
      if (status === 502 || status === 503 || status === 401) return;
      
      // Only log in development
      if (__DEV__) {
        console.warn('[React Query Global Error]', error.message || error);
      }
    }
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 min - data is fresh for 5 min (increased for production)
      gcTime: 30 * 60 * 1000,           // 30 min - drop from memory if unused for 30min
      refetchOnWindowFocus: true,        // ✅ Re-fetch when user returns to the app
      refetchOnMount: true,              // ✅ Always check for fresh data when screen mounts
      refetchOnReconnect: true,          // ✅ Re-fetch when internet reconnects
      retry: 1,                          // 1 retry only to fail fast
      networkMode: 'online',             // ✅ Only fetch when online, don't silently serve stale
      // Production optimization: reduce unnecessary refetches
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    }
  },
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    'PlusJakartaSans-Bold': require('../assets/fonts/SpaceMono-Regular.ttf'),
    'PlusJakartaSans-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      console.warn('[Assets] Font loading failed:', fontError.message);
      // We don't throw the error so the app can still render with fallback fonts
    }
  }, [fontError]);

  // Handle splash completion: if fonts are loaded OR if there's an error (graceful fallback)
  useEffect(() => {
    if (loaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, fontError]);

  // If loading and no error yet, wait. If error, continue to prevent blocking.
  if (!loaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <AuthProvider>
          <AlertProvider>
            <ToastProvider>
              <NotificationProvider>
                <RootLayoutNav />
              </NotificationProvider>
            </ToastProvider>
          </AlertProvider>
        </AuthProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { token, role, hostId, user, isLoading, onboardingCompleted, logout } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();
  const { showToast } = useToast();
  useNotifications();
  
  // 🔥 SINGLE SOURCE OF TRUTH: Live API data for host status (only for hosts)
  const { data: hostProfile } = useHostProfile();

  // Lock to avoid "baar baar" multiple toasts rendering at once
  const sessionToastLock = useRef(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('SESSION_EXPIRED', () => {
      if (!sessionToastLock.current) {
         sessionToastLock.current = true;
         Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
         showToast('Secure Session Ended. Please re-authenticate.', 'error');
         setTimeout(() => { sessionToastLock.current = false; }, 5000);
      }
      logout();
    });
    return () => sub.remove();
  }, [logout]);



  const [showSplashAnim, setShowSplashAnim] = React.useState(true);

  useEffect(() => {
    if (!isLoading) {
        // Orchestrate premium splash reveal: animation + buffer
        const timer = setTimeout(() => {
            setShowSplashAnim(false);
            SplashScreen.hideAsync();
        }, 400); // Slashed from 2200ms to 400ms for production speed
        return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading || showSplashAnim) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isOnboardingPage = segments[1] === 'onboarding';
    const isLoginPage = segments[1] === 'login';

    // 1. GUEST GATE - Don't redirect if on login page (user might be logging in)
    if (!token) {
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
      return;
    }

    // 2. TOKEN EXPIRED / INVALID ROLE EDGE CASE
    if (!role) {
      logout();
      return;
    }

    const currentPath = `/${segments.join('/')}`;
    const navigateTo = (path: string) => {
        if (currentPath !== path) {
            router.replace(path as any);
        }
    };

    // 4. ONBOARDING GUARD (User Only)
    if (role === 'user') {
        if (!onboardingCompleted && !isOnboardingPage) {
            return navigateTo('/(auth)/onboarding');
        }
        if (onboardingCompleted && isOnboardingPage) {
            return navigateTo('/(user)/home');
        }
    }

    // 5. DASHBOARD MAPPING (Synchronized with Directory Structure)
    const dashMap: Record<string, string> = {
        'host': '/(host)/dashboard',
        'admin': '/admin/dashboard',
        'staff': '/(staff)/tabs', // Will be overridden by staffType check below
        'user': '/(user)/home'
    };

    // 5.0 STAFF TYPE ROUTING (Direct navigation based on staffType or staffRole)
    if (role === 'staff') {
        const staffType = (user?.staffType || user?.staffRole || '').toUpperCase();
        if (staffType === 'SECURITY') {
            dashMap['staff'] = '/(staff)/security';
        } else if (staffType === 'WAITER') {
            dashMap['staff'] = '/(staff)/waiter';
        }
        // If no staffType/staffRole, defaults to /(staff)/tabs
    }

    // 5.1 HOST STATUS GUARD - SINGLE SOURCE OF TRUTH
    if (role === 'host') {
        // 🔥 PRIMARY: Use API data, FALLBACK: Use user object during transitions
        const hStatus = hostProfile?.hostStatus || user?.hostStatus;
        
        // If no status available at all, wait
        if (!hStatus) return;
        
        if (hStatus === 'INVITED' || hStatus === 'CREATED') {
            if (segments[1] !== 'onboarding') return navigateTo('/(host)/onboarding');
        } else if (hStatus === 'KYC_PENDING' || hStatus === 'PENDING_VERIFICATION') {
            if (segments[1] !== 'under-review' && segments[1] !== 'success') return navigateTo('/(host)/under-review');
        } else if (hStatus === 'REJECTED') {
            if (segments[1] !== 'rejected') return navigateTo('/(host)/rejected');
        } else if (hStatus === 'SUSPENDED') {
            if (segments[1] !== 'suspended') return navigateTo('/(auth)/suspended');
        } else if (hStatus === 'ACTIVE') {
            // Allow navigation to any host screen
        } else {
            if (segments[1] !== 'onboarding') return navigateTo('/(host)/onboarding');
        }
    }

    const targetHome = dashMap[role] || '/(user)/home';

    // 6. REDIRECTION LOGIC
    // If user is logged in but on an Auth or Index page, send them to their home
    const isRoot = !segments[0] || (segments[0] as string) === 'index';
    if (inAuthGroup || isRoot) {
        if (!isOnboardingPage) return navigateTo(targetHome);
    }

    // 7. RBAC (Role-Based Access Control)
    // Prevent cross-access to folders that don't belong to the current role
    const s0 = segments[0];
    if (role === 'user' && ['(host)', 'admin', '(staff)'].includes(s0)) return navigateTo(targetHome);
    if (role === 'host' && ['admin', '(staff)'].includes(s0)) return navigateTo(targetHome);
    if (role === 'staff' && ['(host)', 'admin', '(user)'].includes(s0)) return navigateTo(targetHome);
    if (role === 'admin' && ['(host)', '(user)', '(staff)'].includes(s0)) return navigateTo(targetHome);
  }, [token, role, hostId, user, hostProfile, isLoading, segments, onboardingCompleted, logout, router]);

  // 🛡️ RENDER BLOCKING (MANDATORY)
  // We keep our custom splash screen visible until BOTH auth and animation are ready.
  // This ensures a seamless "Entry Club" experience from the first millisecond.
  if (isLoading || showSplashAnim) {
    const Index = require('./index').default;
    return <Index />;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ 
        headerShown: false,
        animation: 'fade', // Faster, cleaner transition for role switching
        freezeOnBlur: true,
      }}>
        {!token ? (
           <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        ) : (
           <>
             <Stack.Screen name="(user)" options={{ headerShown: false }} />
             <Stack.Screen name="(host)" options={{ headerShown: false }} />
             <Stack.Screen name="admin" options={{ headerShown: false }} />
             <Stack.Screen name="(staff)" options={{ headerShown: false }} />
           </>
        )}
      </Stack>
    </ThemeProvider>
  );
}
