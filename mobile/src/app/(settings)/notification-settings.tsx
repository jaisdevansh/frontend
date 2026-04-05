import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Platform, LayoutAnimation, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SECTION_SPACING = SPACING.xxl;

export default function NotificationSettings() {
    const router = useRouter();
    const goBack = useStrictBack('/');
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // --- State Structure ---
    const [enabled, setEnabled] = useState(true);
    const [channels, setChannels] = useState({ push: true, inApp: true });
    const [types, setTypes] = useState({ booking: true, messages: true, reminders: true, promotions: false, system: true });
    const [alertPreferences, setAlertPreferences] = useState({ sound: true, vibration: true });
    const [quietHours, setQuietHours] = useState({ enabled: false, from: "22:00", to: "08:00" });
    const [reminderTiming, setReminderTiming] = useState({ checkIn: 24, checkOut: 2 });
    const [promotionalConsent, setPromotionalConsent] = useState(false);

    // --- Handlers ---

    const toggleMasterSwitch = (value: boolean) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setEnabled(value);
    };

    const toggleChannel = (key: keyof typeof channels) => {
        setChannels(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleType = (key: keyof typeof types) => {
        if (key === 'system') return; // Cannot toggle system alerts
        setTypes(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAlertPref = (key: keyof typeof alertPreferences) => {
        setAlertPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleQuietHours = (value: boolean) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setQuietHours(prev => ({ ...prev, enabled: value }));
    };

    const handleSave = () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            showToast("Preferences saved successfully", "success");
            // goBack(); // Optional behavior
        }, 1500);
    };

    // --- Components ---

    const SectionTitle = ({ title }: { title: string }) => (
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
    );

    const ToggleRow = ({ label, value, onValueChange, disabled = false, icon = null, subtext = null }: any) => (
        <View style={[styles.row, disabled && styles.disabledRow]}>
            <View style={styles.rowContent}>
                <View style={styles.labelContainer}>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
                    <View>
                        <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>
                        {subtext && <Text style={styles.subtext}>{subtext}</Text>}
                    </View>
                </View>
                <Switch
                    trackColor={{ false: '#3e3e3e', true: COLORS.primary }}
                    thumbColor={Platform.OS === 'ios' ? '#fff' : value ? '#fff' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={onValueChange}
                    value={value}
                    disabled={disabled}
                />
            </View>
        </View>
    );

    const PickerButton = ({ label, value, onPress, disabled }: any) => (
        <TouchableOpacity
            style={[styles.pickerButton, disabled && styles.disabledRow]}
            onPress={onPress}
            disabled={disabled}
        >
            <Text style={[styles.pickerLabel, disabled && styles.disabledText]}>{label}</Text>
            <View style={styles.pickerValueContainer}>
                <Text style={[styles.pickerValue, disabled && styles.disabledText]}>{value}</Text>
                <Ionicons name="chevron-down" size={16} color={disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)"} />
            </View>
        </TouchableOpacity>
    );

    // Mock Time Selection (Since full Picker requires modal setup)
    const handleTimeSelect = (type: 'from' | 'to') => {
        showToast(`Time picker for "${type}" would open here`, 'info');
    };

    const handleReminderSelect = (type: 'checkIn' | 'checkOut') => {
        showToast(`Duration picker for "${type}" would open here`, 'info');
        // Mock cycle through options for demo
        setReminderTiming(prev => {
            const options = [1, 2, 6, 12, 24];
            const current = prev[type];
            const nextIndex = (options.indexOf(current) + 1) % options.length;
            return { ...prev, [type]: options[nextIndex] };
        });
    };


    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notification Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* 2. GENERAL SETTINGS CARD */}
                <View style={styles.card}>
                    <ToggleRow
                        label="Enable Notifications"
                        value={enabled}
                        onValueChange={toggleMasterSwitch}
                        subtext="You won’t receive any notifications except critical system alerts."
                    />
                </View>

                {/* 3. DELIVERY METHOD SECTION */}
                <View style={styles.section}>
                    <SectionTitle title="Delivery Method" />
                    <View style={styles.card}>
                        <ToggleRow
                            label="Push Notifications"
                            value={channels.push}
                            onValueChange={() => toggleChannel('push')}
                            disabled={!enabled}
                        />
                        <View style={styles.divider} />
                        <ToggleRow
                            label="In-App Notifications"
                            value={channels.inApp}
                            onValueChange={() => toggleChannel('inApp')}
                            disabled={!enabled}
                        />
                    </View>
                </View>

                {/* 4. NOTIFICATION TYPES SECTION */}
                <View style={styles.section}>
                    <SectionTitle title="What notifications do you want?" />
                    <View style={styles.card}>
                        <ToggleRow
                            label="Booking Updates"
                            value={types.booking}
                            onValueChange={() => toggleType('booking')}
                            disabled={!enabled}
                        />
                        <View style={styles.divider} />
                        <ToggleRow
                            label="Messages"
                            value={types.messages}
                            onValueChange={() => toggleType('messages')}
                            disabled={!enabled}
                        />
                        <View style={styles.divider} />
                        <ToggleRow
                            label="Reminders"
                            value={types.reminders}
                            onValueChange={() => toggleType('reminders')}
                            disabled={!enabled}
                        />
                        <View style={styles.divider} />
                        <ToggleRow
                            label="Offers & Promotions"
                            value={types.promotions}
                            onValueChange={() => toggleType('promotions')}
                            disabled={!enabled}
                            subtext="Includes discounts and announcements."
                        />
                        <View style={styles.divider} />
                        <View style={[styles.row, styles.disabledRow]}>
                            <View style={styles.rowContent}>
                                <View style={styles.labelContainer}>
                                    <View>
                                        <Text style={[styles.label, styles.disabledText]}>System Alerts</Text>
                                    </View>
                                </View>
                                <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.3)" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* 5. ALERT PREFERENCES SECTION */}
                <View style={styles.section}>
                    <SectionTitle title="Alert Preferences" />
                    <View style={styles.card}>
                        <ToggleRow
                            label="Notification Sound"
                            value={alertPreferences.sound}
                            onValueChange={() => toggleAlertPref('sound')}
                            disabled={!enabled}
                        />
                        <View style={styles.divider} />
                        <ToggleRow
                            label="Vibration"
                            value={alertPreferences.vibration}
                            onValueChange={() => toggleAlertPref('vibration')}
                            disabled={!enabled}
                        />
                    </View>
                    <Text style={styles.caption}>Final alert behavior depends on your device settings.</Text>
                </View>

                {/* 6. QUIET HOURS */}
                <View style={styles.section}>
                    <SectionTitle title="Quiet Hours" />
                    <View style={styles.card}>
                        <ToggleRow
                            label="Enable Quiet Hours"
                            value={quietHours.enabled}
                            onValueChange={toggleQuietHours}
                            disabled={!enabled}
                        />
                        {quietHours.enabled && (
                            <View style={styles.quietHoursContainer}>
                                <View style={styles.divider} />
                                <View style={styles.timeRow}>
                                    <PickerButton
                                        label="From"
                                        value={quietHours.from}
                                        onPress={() => handleTimeSelect('from')}
                                        disabled={!enabled}
                                    />
                                    <PickerButton
                                        label="To"
                                        value={quietHours.to}
                                        onPress={() => handleTimeSelect('to')}
                                        disabled={!enabled}
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* 7. REMINDER TIMING SECTION */}
                <View style={styles.section}>
                    <SectionTitle title="Reminder Timing" />
                    <View style={styles.card}>
                        <PickerButton
                            label="Check-in Reminder"
                            value={`${reminderTiming.checkIn} hours before`}
                            onPress={() => handleReminderSelect('checkIn')}
                            disabled={!enabled}
                        />
                        <View style={styles.divider} />
                        <PickerButton
                            label="Checkout Reminder"
                            value={`${reminderTiming.checkOut} hours before`}
                            onPress={() => handleReminderSelect('checkOut')}
                            disabled={!enabled}
                        />
                    </View>
                </View>

                {/* 8. PROMOTIONAL CONSENT CARD */}
                <View style={[styles.card, styles.promoCard]}>
                    <ToggleRow
                        label="Receive promotional notifications"
                        value={promotionalConsent}
                        onValueChange={setPromotionalConsent}
                        subtext="You can change this anytime."
                        disabled={!enabled}
                    />
                </View>

                {/* 9. FOOTER ACTION */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveButton, (!enabled && !promotionalConsent) && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Preferences</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background.dark,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: SPACING.lg,
        gap: SECTION_SPACING,
    },
    section: {
        gap: SPACING.sm,
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginLeft: SPACING.xs,
        marginBottom: 8,
    },
    card: {
        backgroundColor: COLORS.card.dark,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.card.glassBorder,
        overflow: 'hidden',
    },
    promoCard: {
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    row: {
        padding: SPACING.md,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
        paddingRight: 16,
    },
    iconContainer: {
        width: 32,
        alignItems: 'center',
    },
    label: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
    subtext: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 4,
    },
    disabledRow: {
        opacity: 0.5,
    },
    disabledText: {
        color: 'rgba(255,255,255,0.4)',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: SPACING.md,
    },
    caption: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginLeft: SPACING.xs,
        marginTop: 4,
    },
    quietHoursContainer: {
        // Animation container
    },
    timeRow: {
        flexDirection: 'row',
        padding: SPACING.md,
        gap: SPACING.md,
    },
    pickerButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        // For rows that are pickers themselves
    },
    pickerLabel: {
        color: '#FFFFFF',
        fontSize: 16,
        flex: 1,
    },
    pickerValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pickerValue: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        marginTop: SPACING.md,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: BORDER_RADIUS.default,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        shadowOpacity: 0,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
