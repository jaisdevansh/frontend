import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function Rejected() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    const reason = params.reason || "Documents provided were illegible or didn't match the information provided.";

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.centerBox}>
                <Ionicons name="alert-circle" size={80} color="#F43F5E" style={{ marginBottom: 24 }} />
                
                <Text style={styles.title}>Verification Failed</Text>
                
                <Text style={styles.message}>
                    Unfortunately, your host profile submission could not be approved at this time.
                </Text>

                <View style={styles.rejectCard}>
                    <Text style={styles.rejectReasonTitle}>Reason for Rejection</Text>
                    <Text style={styles.rejectReasonText}>{reason}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.primaryBtn} 
                    onPress={() => router.replace('/(host)/onboarding')}
                >
                    <Text style={styles.primaryBtnText}>Update & Resubmit</Text>
                    <Ionicons name="refresh" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.outlineBtn} 
                    onPress={() => router.replace('/')}
                >
                    <Text style={styles.outlineBtnText}>Go to User App</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0f',
        padding: 24,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    message: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    rejectCard: {
        width: '100%',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.3)',
        borderRadius: 16,
        padding: 24,
    },
    rejectReasonTitle: {
        color: '#F43F5E',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    rejectReasonText: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 22,
    },
    footer: {
        paddingBottom: 20,
        gap: 16,
    },
    primaryBtn: {
        backgroundColor: '#F43F5E',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F43F5E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    outlineBtn: {
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    outlineBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    }
});
