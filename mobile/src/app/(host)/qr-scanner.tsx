import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/design-system';
import { useSecurityStore } from '../../store/securityStore';
// Use dynamic imports or simple text view if scanner view is complex
import { ScannerView } from '../../features/security/components/ScannerView';
import { ScanHistoryItem } from '../../features/security/components/ScanHistoryItem';

export default function TicketScanner() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    
    const scanIds = useSecurityStore(state => state.scanIds);
    const scansById = useSecurityStore(state => state.scansById);
    const clearHistory = useSecurityStore(state => state.clearHistory);

    const scanHistory = useMemo(() => {
        return scanIds.map(id => scansById[id]).filter(Boolean);
    }, [scanIds, scansById]);

    const renderItem = useCallback(({ item }: { item: any }) => <ScanHistoryItem item={item} />, []);

    const renderHeader = useMemo(() => (
        <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>RECENT SCANS</Text>
            {scanIds.length > 0 && (
                <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
                    <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                    <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
            )}
        </View>
    ), [scanIds, clearHistory]);

    const ListEmptyComponent = useMemo(() => (
        <View style={styles.empty}>
            <Ionicons name="scan-outline" size={48} color="rgba(255,255,255,0.05)" />
            <Text style={styles.emptyTxt}>Ready to scan</Text>
        </View>
    ), []);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" translucent />
            
            <View style={styles.nav}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Entry Validation</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.scannerContainer}>
                <ScannerView />
            </View>

            <FlatList
                data={scanHistory}
                renderItem={renderItem}
                keyExtractor={(item: any) => item._id || Math.random().toString()}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={ListEmptyComponent}
                removeClippedSubviews
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={6}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0C16' }, // Updated to match dashboard
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center' },
    title: { color: 'white', fontSize: 18, fontWeight: '800' },
    scannerContainer: { height: 350, margin: 20, borderRadius: 32, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 10, marginBottom: 16 },
    sectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255, 59, 48, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    clearText: { color: '#FF3B30', fontSize: 12, fontWeight: '700' },
    listContent: { paddingBottom: 40 },
    empty: { alignItems: 'center', marginTop: 40 },
    emptyTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600', marginTop: 12 }
});
