import { Stack } from 'expo-router';
import { COLORS } from '../../constants/design-system';

export default function HostLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: COLORS.background.dark,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                headerShown: false,
            }}
        >
            <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
            <Stack.Screen name="venue-profile" options={{ title: 'Venue Profile' }} />
            <Stack.Screen name="events" options={{ title: 'Events' }} />
            <Stack.Screen name="create-event" options={{ title: 'Create Event' }} />
            <Stack.Screen name="bookings" options={{ title: 'Bookings' }} />
            <Stack.Screen name="qr-scanner" options={{ title: 'QR Scanner' }} />
            <Stack.Screen name="coupons" options={{ title: 'Coupons' }} />
            <Stack.Screen name="media-upload" options={{ title: 'Media Upload' }} />
            <Stack.Screen name="profile" options={{ title: 'Profile' }} />

        </Stack>
    );
}
