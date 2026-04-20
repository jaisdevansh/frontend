import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Switch, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import PremiumToast, { ToastRef } from '../../components/PremiumToast';
import { useAuth } from '../../context/AuthContext';
import adminService from '../../services/adminService';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#3b82f6',
    bg: '#000000',
    card: '#080808',
    border: 'rgba(255,255,255,0.06)',
    textWhite: '#ffffff',
    white: '#ffffff',
    textDim: '#a0a0a0',
    success: '#10B981',
    danger: '#F43F5E',
};

const SettingItem = React.memo(({ icon, title, subtitle, color = COLORS.primary, onPress, action }: any) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
        <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
                <MaterialIcons name={icon} size={20} color={color} />
            </View>
            <View>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
        </View>
        {action || <MaterialIcons name="chevron-right" size={24} color={COLORS.textDim} />}
    </TouchableOpacity>
));

export default function AdminSettings() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { logout, user, updateUser } = useAuth();
    const toastRef = useRef<ToastRef>(null);

    const [is2FA, setIs2FA] = useState(true);
    const [auditMode, setAuditMode] = useState(false);
    
    const [isEditModal, setIsEditModal] = useState(false);
    const [editName, setEditName] = useState((user as any)?.fullName || (user as any)?.name || '');
    const [editPic, setEditPic] = useState((user as any)?.profileImage || '');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleLogout = useCallback(async () => {
        toastRef.current?.show({ title: 'Signing Out', message: 'Securing session...', type: 'info' });
        setTimeout(async () => {
            await logout(true);
            router.replace('/(auth)/login');
        }, 800);
    }, [logout, router]);

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            return toastRef.current?.show({ title: 'Permission Error', message: 'Gallery access is required for identity updates.', type: 'error' });
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setEditPic(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleUpdateProfile = async () => {
        if (!editName.trim()) return toastRef.current?.show({ title: 'Error', message: 'Name cannot be empty', type: 'error' });
        setIsUpdating(true);
        try {
            const response = await adminService.updateProfile({ name: editName, profileImage: editPic });
            
            // Critical for UI Update
            if (response.success && response.data) {
                await updateUser({
                    ...response.data,
                    name: response.data.name // Use 'name' from response
                });
            }

            toastRef.current?.show({ title: 'Success', message: 'Profile directives synchronized successfully.', type: 'success' });
            setIsEditModal(false);
        } catch (err: any) {
            toastRef.current?.show({ title: 'Upload Fault', message: err.response?.data?.message || 'Check connection', type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <View style={{ flex: 1, marginRight: 24 }}>
                    <Text style={styles.title} numberOfLines={1}>{(user as any)?.fullName || (user as any)?.name || 'Admin'}</Text>
                    <Text style={styles.subtitle}>Super-Admin interface & credentials</Text>
                </View>
                <TouchableOpacity 
                    style={styles.avatarBox} 
                    onPress={() => {
                        setEditName((user as any)?.fullName || (user as any)?.name || '');
                        setEditPic((user as any)?.profileImage || '');
                        setIsEditModal(true);
                    }}
                >
                    {(user as any)?.profileImage ? (
                        <Image source={{ uri: (user as any).profileImage }} style={styles.avatarImg} />
                    ) : (
                        <Text style={styles.avatarText}>{(((user as any)?.fullName || (user as any)?.name)?.[0] || 'A').toUpperCase()}</Text>
                    )}
                    <View style={styles.editBadge}><MaterialIcons name="camera-alt" size={10} color="#fff" /></View>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionHeader}>IDENTITY ENGINE</Text>
                <View style={styles.card}>
                    <SettingItem 
                        icon="person" 
                        title="Direct Profile Sync" 
                        subtitle="Update administrative credentials"
                        onPress={() => setIsEditModal(true)}
                    />
                    <View style={styles.divider} />
                    <SettingItem 
                        icon="gavel" 
                        title="Secure Ban Terminal" 
                        subtitle="Enforce platform access policies"
                        color={COLORS.danger}
                        onPress={() => router.push('/admin/ban-manager' as any)}
                    />
                    <View style={styles.divider} />
                    <SettingItem 
                        icon="business" 
                        title="Host Fleet Registry" 
                        subtitle="Partner lifecycle & moderation"
                        color="#8b5cf6"
                        onPress={() => router.push('/admin/host-registry-manager' as any)}
                    />
                </View>

                <Text style={styles.sectionHeader}>SECURITY & ACCESS</Text>
                <View style={styles.card}>
                    <SettingItem icon="verified-user" title="Deep 2FA Secure" action={<Switch value={is2FA} onValueChange={setIs2FA} trackColor={{ false: COLORS.border, true: COLORS.primary }} />} />
                    <View style={styles.divider} />
                    <SettingItem icon="security" title="Tactical Audit Mode" action={<Switch value={auditMode} onValueChange={setAuditMode} trackColor={{ false: COLORS.border, true: COLORS.primary }} />} />
                </View>

                <Text style={styles.sectionHeader}>SYSTEM ACTIONS</Text>
                <View style={styles.card}>
                    <SettingItem icon="logout" title="Terminate Session" color={COLORS.danger} onPress={handleLogout} />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>ENTRY CLUB ELITE v2.5.0</Text>
                </View>
            </ScrollView>

            <Modal visible={isEditModal} animationType="slide" transparent={true}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Modify Admin Profile</Text>
                                <TouchableOpacity onPress={() => setIsEditModal(false)}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
                            </View>
                            
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            >
                                <View style={styles.modalBody}>
                                    <View style={styles.avatarEditRow}>
                                        <TouchableOpacity style={styles.modalAvatarBox} onPress={handlePickImage} activeOpacity={0.8}>
                                            {editPic ? (
                                                <Image source={{ uri: editPic }} style={styles.modalAvatar} />
                                            ) : (
                                                <MaterialIcons name="add-a-photo" size={24} color={COLORS.textDim} />
                                            )}
                                            <View style={styles.modalEditBadge}><MaterialIcons name="edit" size={12} color="#FFF" /></View>
                                        </TouchableOpacity>
                                        <View style={styles.avatarEditInfo}>
                                            <Text style={styles.editInfoTitle}>Identity Image</Text>
                                            <Text style={styles.editInfoSub}>Tap to access local device gallery</Text>
                                        </View>
                                    </View>

                                    <View style={[styles.inputLabelRow, { marginTop: 24 }]}><Text style={styles.inputLabel}>FULL IDENTITY NAME</Text></View>
                                    <TextInput 
                                        style={[styles.modalInput, { color: '#FFFFFF' }]} 
                                        value={editName}
                                        onChangeText={setEditName}
                                        placeholder="Admin Name"
                                        placeholderTextColor={COLORS.textDim}
                                        selectionColor={COLORS.primary}
                                        autoCorrect={false}
                                        returnKeyType="done"
                                    />

                                    <TouchableOpacity 
                                        style={[styles.saveBtn, isUpdating && { opacity: 0.7 }]} 
                                        onPress={handleUpdateProfile}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>COMMIT CHANGES</Text>}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <PremiumToast ref={toastRef} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: COLORS.textWhite },
    subtitle: { fontSize: 13, color: COLORS.textDim, marginTop: 4, fontWeight: '600' },
    avatarBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    avatarText: { color: COLORS.white, fontSize: 24, fontWeight: '900' },
    avatarImg: { width: '100%', height: '100%', borderRadius: 16 },
    editBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#000', padding: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    sectionHeader: { color: COLORS.textDim, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginTop: 32, marginBottom: 12, paddingLeft: 4 },
    card: { backgroundColor: COLORS.card, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 60 },
    settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 20, flex: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    settingTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textWhite },
    settingSubtitle: { fontSize: 12, color: COLORS.textDim, marginTop: 6, fontWeight: '600' },
    footer: { marginTop: 60, alignItems: 'center' },
    versionText: { color: COLORS.border, fontSize: 10, fontWeight: '900', letterSpacing: 4 },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: COLORS.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, borderWidth: 1, borderColor: COLORS.border },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    modalBody: { padding: 24 },
    avatarEditRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 8 },
    modalAvatarBox: { width: 88, height: 88, borderRadius: 24, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    modalAvatar: { width: '100%', height: '100%' },
    modalEditBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: COLORS.primary, padding: 6, borderRadius: 10, borderWidth: 1, borderColor: '#000' },
    avatarEditInfo: { flex: 1 },
    editInfoTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    editInfoSub: { color: COLORS.textDim, fontSize: 12, marginTop: 4, fontWeight: '500' },
    inputLabelRow: { marginBottom: 8 },
    inputLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    modalInput: { backgroundColor: '#000', borderRadius: 16, height: 56, paddingHorizontal: 16, color: '#FFF', fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: COLORS.border },
    saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 40, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
