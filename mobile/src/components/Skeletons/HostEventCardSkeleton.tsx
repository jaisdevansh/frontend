import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonBase } from './SkeletonBase';

const { width } = Dimensions.get('window');

/**
 * Host Event Card Skeleton - Matches host dashboard event card layout
 * Used in: Host Dashboard events section
 */
export const HostEventCardSkeleton: React.FC = React.memo(() => {
    return (
        <View style={styles.card}>
            {/* Event Image */}
            <SkeletonBase width="100%" height={160} borderRadius={12} style={styles.image} />
            
            {/* Event Info Row */}
            <View style={styles.info}>
                <View style={styles.textContainer}>
                    {/* Title */}
                    <SkeletonBase width={180} height={18} borderRadius={4} style={styles.title} />
                    
                    {/* Date */}
                    <SkeletonBase width={140} height={13} borderRadius={4} />
                </View>
                
                {/* Badge */}
                <SkeletonBase width={70} height={24} borderRadius={8} />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        width: width - 40,
        backgroundColor: '#0A0A0A',
        borderRadius: 20,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    image: {
        marginBottom: 12,
    },
    info: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingBottom: 4,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        marginBottom: 4,
    },
});
