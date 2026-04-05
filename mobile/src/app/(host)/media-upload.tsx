import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useStrictBack } from '../../hooks/useStrictBack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/design-system';
import { useToast } from '../../context/ToastContext';
import { hostService } from '../../services/hostService';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';


import { Button } from '../../components/Button';

export default function HostMediaUpload() {
    const router = useRouter();
    const goBack = useStrictBack('/(host)/dashboard');
    const { showToast } = useToast();

    const [mediaList, setMediaList] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [uploading, setUploading] = React.useState(false);

    const fetchGallery = async () => {
        try {
            const res = await hostService.getMedia();
            if (res.success) {
                setMediaList(res.data || []);
            }
        } catch (error) {
            console.error('Fetch Media Error:', error);
            showToast('Failed to load gallery', 'error');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchGallery();
        }, [])
    );

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false, // Must be false for multiple selection
            allowsMultipleSelection: true,
            selectionLimit: 10,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            // Upload each selected image
            for (const asset of result.assets) {
                if (asset.base64) {
                    await handleUpload(`data:image/jpeg;base64,${asset.base64}`);
                }
            }
        }
    };

    const handleUpload = async (base64Url: string) => {
        setUploading(true);
        try {
            const res = await hostService.uploadMedia({
                url: base64Url,
                type: 'image',
                fileName: `gallery_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`
            });
            if (res.success) {
                showToast('Image uploaded - Press Save to confirm', 'success');
                fetchGallery();
            }
        } catch (error) {
            showToast('Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            const res = await hostService.removeMedia(id);
            if (res.success) {
                showToast('Media removed', 'success');
                setMediaList(mediaList.filter(m => m._id !== id));
            }
        } catch (error) {
            showToast('Failed to remove media', 'error');
        }
    };

    const handleSave = async () => {
        try {
            await hostService.approveMedia();
            showToast('Gallery updated successfully', 'success');
            goBack();
        } catch (error) {
            showToast('Failed to save gallery', 'error');
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Gallery</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={handlePickImage}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color={COLORS.primary} />
                    ) : (
                        <>
                            <Text style={styles.plus}>+</Text>
                            <Text style={styles.uploadText}>Upload New Media</Text>
                            <Text style={styles.uploadSub}>Supports JPG, PNG up to 10MB</Text>
                        </>
                    )}
                </TouchableOpacity>

                {loading ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.grid}>
                        {mediaList.map((item) => (
                            <TouchableOpacity
                                key={item._id}
                                style={styles.gridItem}
                                onLongPress={() => handleRemove(item._id)}
                            >
                                <Image source={{ uri: item.url }} style={styles.gridImage} />
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: item.status === 'Approved' ? 'rgba(16, 185, 129, 0.8)' : item.status === 'Rejected' ? 'rgba(255, 69, 58, 0.8)' : 'rgba(212, 175, 55, 0.8)' }
                                ]}>
                                    <Text style={styles.statusBadgeText}>{item.status === 'Approved' ? 'LIVE' : item.status}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Button title="Save Gallery" onPress={handleSave} />
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
        padding: SPACING.lg,
        paddingTop: 40,
    },

    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },

    headerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 100,
    },
    uploadBox: {
        width: '100%',
        height: 180,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    plus: {
        color: COLORS.primary,
        fontSize: 40,
        fontWeight: '300',
    },
    uploadText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 8,
    },
    uploadSub: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 12,
        marginTop: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridItem: {
        width: '31%',
        aspectRatio: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    gridImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    statusBadge: {
        paddingVertical: 4,
        alignItems: 'center',
        width: '100%',
    },
    statusBadgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    footer: {
        padding: SPACING.lg,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(11, 15, 26, 0.8)',
    },
});
