import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { getLogs, log } from '../../utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';

export default function DebugScreen() {
    const navigation = useNavigation();
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        // Force a mock rerender hack if we want live logs, or just read once
        setLogs([...getLogs()]);
        
        const interval = setInterval(() => {
            setLogs([...getLogs()]);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>System Logs</Text>
                <TouchableOpacity onPress={() => { log("DEBUG PING"); setLogs([...getLogs()]); }} style={styles.pingBtn}>
                    <Text style={styles.pingTxt}>Ping</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
                {logs.length === 0 ? (
                    <Text style={styles.empty}>No logs yet.</Text>
                ) : (
                    logs.map((item, i) => (
                        <View key={i} style={styles.logCard}>
                            <Text style={styles.logText}>{item}</Text>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
    backBtn: { marginRight: 16 },
    title: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    pingBtn: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    pingTxt: { color: '#FFF', fontSize: 12 },
    scroll: { flex: 1 },
    empty: { color: '#888', textAlign: 'center', marginTop: 40 },
    logCard: { backgroundColor: '#111', padding: 10, marginBottom: 8, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#7c4dff' },
    logText: { color: '#00FF41', fontSize: 12, fontFamily: 'monospace' }
});
