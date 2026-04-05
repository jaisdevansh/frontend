import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { useAlert } from '../../context/AlertProvider';

interface PaymentMethodItem {
    id: string;
    type: 'Card' | 'UPI';
    title: string;
    subtitle: string;
    logo?: string;
}

export default function PaymentMethods() {
    const router = useRouter();
    const goBack = useStrictBack('/');
    const { showToast } = useToast();
    const { showAlert } = useAlert();

    const [savedCards, setSavedCards] = useState<PaymentMethodItem[]>([
        { id: '1', type: 'Card', title: 'HDFC Regalia Credit Card', subtitle: '**** 4582' },
        { id: '2', type: 'Card', title: 'ICICI Sapphiro Debit Card', subtitle: '**** 1290' },
    ]);

    const [upiAccounts, setUpiAccounts] = useState<PaymentMethodItem[]>([
        { 
            id: '3', 
            type: 'UPI', 
            title: 'Google Pay', 
            subtitle: 'user@oksbi', 
            logo: 'https://cdn-icons-png.flaticon.com/512/6124/6124998.png' 
        },
        { 
            id: '4', 
            type: 'UPI', 
            title: 'PhonePe', 
            subtitle: '9876543210@ybl', 
            logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/phonepe-icon.png' 
        },
    ]);

    const handleAddMethod = (type: 'Card' | 'UPI') => {
        const newId = Math.random().toString(36).substr(2, 9);
        const newItem: PaymentMethodItem = type === 'Card' 
            ? { id: newId, type: 'Card', title: 'New Credit Card', subtitle: '**** ' + Math.floor(1000 + Math.random() * 9000) }
            : { id: newId, type: 'UPI', title: 'New UPI ID', subtitle: 'user' + Math.floor(10 + Math.random() * 90) + '@okaxis', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/upi-icon.png' };

        if (type === 'Card') {
            setSavedCards([...savedCards, newItem]);
        } else {
            setUpiAccounts([...upiAccounts, newItem]);
        }
        
        showToast(`New ${type} added successfully!`, 'success');
    };

    const handleDeleteMethod = (id: string, type: 'Card' | 'UPI', title: string) => {
        showAlert(
            'Remove Method',
            `Are you sure you want to remove ${title}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        if (type === 'Card') {
                            setSavedCards(savedCards.filter(item => item.id !== id));
                        } else {
                            setUpiAccounts(upiAccounts.filter(item => item.id !== id));
                        }
                        showToast(`${title} removed successfully`, 'success');
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment Methods</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Saved Cards Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>SAVED CARDS</Text>
                        <TouchableOpacity onPress={() => handleAddMethod('Card')}>
                            <Text style={styles.addText}>+ Add New</Text>
                        </TouchableOpacity>
                    </View>

                    {savedCards.length === 0 ? (
                        <Text style={styles.emptyText}>No saved cards</Text>
                    ) : (
                        savedCards.map((item) => (
                            <View key={item.id} style={styles.cardItem}>
                                <View style={styles.cardIcon}>
                                    <Ionicons name="card" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.methodTitle}>{item.title}</Text>
                                    <Text style={styles.methodSubtitle}>{item.subtitle}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteMethod(item.id, 'Card', item.title)}>
                                    <Ionicons name="trash-outline" size={20} color="rgba(255,59,48,0.7)" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                {/* UPI Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>UPI ACCOUNTS</Text>
                        <TouchableOpacity onPress={() => handleAddMethod('UPI')}>
                            <Text style={styles.addText}>+ Add New</Text>
                        </TouchableOpacity>
                    </View>

                    {upiAccounts.length === 0 ? (
                        <Text style={styles.emptyText}>No UPI accounts linked</Text>
                    ) : (
                        upiAccounts.map((item) => (
                            <View key={item.id} style={styles.cardItem}>
                                <View style={styles.logoContainer}>
                                    <Image
                                        source={{ uri: item.logo || 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/upi-icon.png' }}
                                        style={styles.methodLogo}
                                        resizeMode="contain"
                                    />
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.methodTitle}>{item.title}</Text>
                                    <Text style={styles.methodSubtitle}>{item.subtitle}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteMethod(item.id, 'UPI', item.title)}>
                                    <Ionicons name="trash-outline" size={20} color="rgba(255,59,48,0.7)" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
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
        padding: SPACING.xl,
        gap: SPACING.xxl,
    },
    section: {
        gap: SPACING.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    addText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 20,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: BORDER_RADIUS.default,
    },
    cardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.default,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: 16,
    },
    cardIcon: {
        width: 40,
        height: 28,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        width: 40,
        height: 28,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
    },
    methodLogo: {
        width: '100%',
        height: '100%',
    },
    cardInfo: {
        flex: 1,
    },
    methodTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    methodSubtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 2,
    },
});
