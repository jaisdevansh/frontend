import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { Button } from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';

export default function ChangePassword() {
    const router = useRouter();
    const goBack = useStrictBack('/(user)/profile');
    const { showToast } = useToast();
    const { logout } = useAuth();

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);

    const handleSave = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            showToast('Please fill all fields', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showToast('New password must be at least 6 characters', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const res = await userService.changePassword({ oldPassword, newPassword });
            if (res.success) {
                showToast(res.message || 'Password changed successfully', 'success');
                // Backend forcefully clears cookies and token, so we logout the app side
                setTimeout(async () => {
                    await logout();
                }, 1500);
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to change password', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Change Password</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.helperSection}>
                        <Ionicons name="shield-checkmark-outline" size={32} color={COLORS.primary} />
                        <Text style={styles.helperTitle}>Secure your account</Text>
                        <Text style={styles.helperText}>
                            Your new password must be unique and at least 6 characters long. After changing your password, you will be required to log in again.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CURRENT PASSWORD</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                    placeholder="Enter current password"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    secureTextEntry={!showOldPass}
                                />
                                <TouchableOpacity onPress={() => setShowOldPass(!showOldPass)} style={styles.eyeBtn}>
                                    <Ionicons name={showOldPass ? "eye-outline" : "eye-off-outline"} size={20} color="rgba(255,255,255,0.5)" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>NEW PASSWORD</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Enter new password"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    secureTextEntry={!showNewPass}
                                />
                                <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn}>
                                    <Ionicons name={showNewPass ? "eye-outline" : "eye-off-outline"} size={20} color="rgba(255,255,255,0.5)" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm new password"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    secureTextEntry={!showNewPass}
                                />
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <Button title={isSaving ? "Updating..." : "Update Password"} onPress={handleSave} disabled={isSaving} />
            </View>
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
        padding: SPACING.xl,
    },
    helperSection: {
        marginBottom: SPACING.xxl,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    helperTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 8,
    },
    helperText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    form: {
        gap: SPACING.xl,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: BORDER_RADIUS.default,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: SPACING.md,
    },
    input: {
        flex: 1,
        paddingVertical: SPACING.md,
        color: '#FFFFFF',
        fontSize: 16,
    },
    eyeBtn: {
        padding: 8,
    },
    footer: {
        padding: SPACING.lg,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
});
