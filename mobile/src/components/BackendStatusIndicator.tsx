import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const BackendStatusIndicator = () => {
    const [visible, setVisible] = useState(false);
    const [isLocal, setIsLocal] = useState(false);
    const opacity = useState(new Animated.Value(0))[0];

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('BACKEND_CONNECTED', (data) => {
            setIsLocal(data?.isLocal || false);
            showIndicator();
        });

        return () => sub.remove();
    }, []);

    const showIndicator = () => {
        setVisible(true);
        Animated.sequence([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.delay(3000),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start(() => setVisible(false));
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity }]}>
            <View style={styles.content}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.text}>
                    Connected to {isLocal ? 'Local' : 'Production'} Backend
                </Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        zIndex: 9999,
        alignItems: 'center',
    },
    content: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(76, 175, 80, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});
