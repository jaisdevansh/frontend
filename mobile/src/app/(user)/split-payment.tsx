import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    StatusBar, TextInput, Dimensions, ActivityIndicator, BackHandler, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Contacts from 'expo-contacts';
import { COLORS } from '../../constants/design-system';
import { userService } from '../../services/userService';
import { log } from '../../utils/logger';

const { width, height } = Dimensions.get('window');

const MOCK_FRIENDS = [
    { id: 'm1', name: 'Ananya Sharma', phone: '9876543210', avatar: 'https://i.pravatar.cc/150?u=a' },
    { id: 'm2', name: 'Rohan Malhotra', phone: '9876543211', avatar: 'https://i.pravatar.cc/150?u=b' },
    { id: 'm3', name: 'Ishani Gupta', phone: '9876543212', avatar: 'https://i.pravatar.cc/150?u=c' },
];

export default function SplitPayScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    // Context from params
    const total      = params.total ? Number(params.total) : 25000;
    const guests     = params.guests ? Number(params.guests) : (params.guestCount ? Number(params.guestCount) : 4);
    const title      = params.title ? String(params.title) : 'Private Event';
    const venueName  = params.venueName ? String(params.venueName) : '';
    const cover      = params.coverImage ? String(params.coverImage) : 'https://images.unsplash.com/photo-1514525253361-bee8a197c0c1';
    const timeSlot   = params.timeSlot ? String(params.timeSlot) : '10:30 PM onwards';
    const zone       = params.zone ? String(params.zone) : 'VIP';
    const seatIds    = params.seatIds ? String(params.seatIds).split(',') : [];
    const eventId    = params.eventId ? String(params.eventId) : '';
    const hostId     = params.hostId ? String(params.hostId) : '';

    // Local state
    const [profile, setProfile] = useState<any>(null);
    const [contacts, setContacts] = useState<any[]>(MOCK_FRIENDS);
    const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [processing, setProcessing] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const res = await userService.getProfile();
                if (res.success) setProfile(res.data);
            } catch (e) {}
        };
        fetchInitialData();
        fetchRealContacts(); // Fetch contacts early
    }, []);

    const fetchRealContacts = async () => {
        setLoadingContacts(true);
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
                });
                if (data && data.length > 0) {
                    const formatted = data.map(c => {
                        const firstPhone = c.phoneNumbers?.find(p => p.number)?.number || 'N/A';
                        return {
                            id: c.id,
                            name: c.name,
                            phone: firstPhone,
                            avatar: c.imageAvailable ? c.image?.uri : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=7c4dff&color=fff`
                        };
                    }).filter(c => c.name && c.phone !== 'N/A');
                    
                    // Sort locally to avoid SortOrder issues
                    const sorted = formatted.sort((a,b) => a.name.localeCompare(b.name));
                    setContacts(sorted);
                }
            }
        } catch (error) {
            // Silent error
        } finally {
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        if (showPicker) fetchRealContacts();
    }, [showPicker]);

    const activeSplits = guests > 0 ? guests : 1;
    const shareAmount = Math.ceil(total / activeSplits);
    const remainingSlots = guests - 1 - selectedFriends.length;

    const toggleFriend = (friend: any) => {
        Haptics.selectionAsync();
        const exists = selectedFriends.find(f => f.id === friend.id);
        if (exists) {
            setSelectedFriends(selectedFriends.filter(f => f.id !== friend.id));
        } else if (remainingSlots > 0) {
            setSelectedFriends([...selectedFriends, friend]);
            setSearch('');
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const goBack = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace({
                pathname: '/(user)/payment',
                params: { 
                    eventId, hostId, title, venueName, coverImage: cover, 
                    guests: String(guests), zone, timeSlot, 
                    seatIds: seatIds.join(','), total: total.toString() 
                }
            });
        }
    }, [router, eventId, hostId, title, cover, guests, zone, timeSlot, seatIds, total]);

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (showPicker) {
                setShowPicker(false);
                return true;
            }
            goBack();
            return true;
        });
        return () => sub.remove();
    }, [goBack, showPicker]);

    const handleRequestSplit = async () => {
        if (!eventId) {
            log("ERROR: eventId missing in split-payment");
            return;
        }
        setProcessing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Build participant names list (host + selected friends)
        const allParticipants = [
            profile?.name || 'You',
            ...selectedFriends.map((f: any) => f.name)
        ].join(',');

        log(`[Split] Initiating split for event: ${eventId}, amount: ${shareAmount}`);

        setTimeout(() => {
            setProcessing(false);
            router.push({
                pathname: '/(user)/split-request-received',
                params: {
                    requesterId:    profile?._id    || '',
                    requesterName:  profile?.name   || 'You',
                    requesterAvatar: profile?.profileImage || 'https://i.pravatar.cc/150?u=me',
                    title:          title,
                    coverImage:     cover,
                    venueName:      venueName || 'Exclusive Venue',
                    eventDate:      `${zone} Zone • ${timeSlot}`,
                    shareAmount:    String(shareAmount),
                    totalGuests:    String(guests),
                    zone,
                    participants:   allParticipants,
                    eventId,
                    hostId:         hostId, // MANDATORY for backend verify
                }
            });
        }, 1200);
    };

    const suggestedFriends = contacts.filter(f => !selectedFriends.find(sf => sf.id === f.id));
    const filteredFriends = suggestedFriends.filter(f => 
        f.name.toLowerCase().includes(search.toLowerCase()) || 
        f.phone.replace(/[\s-]/g, '').includes(search.replace(/[\s-]/g, ''))
    );

    const userImageUrl = profile?.profileImage || 'https://i.pravatar.cc/150?u=me';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent />
            
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Split Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 160 + insets.bottom }]} showsVerticalScrollIndicator={false}>
                
                <View style={styles.totalCard}>
                    <View style={styles.totalHeader}>
                        <View>
                            <Text style={styles.totalLabel}>TOTAL BOOKING (FOR {guests})</Text>
                            <Text style={styles.totalAmount}>₹{total.toLocaleString()}</Text>
                        </View>
                        <View style={styles.receiptIcon}>
                           <Ionicons name="receipt-outline" size={24} color="#7c4dff" />
                        </View>
                    </View>
                    <View style={styles.eventInfoBox}>
                        <Image source={{ uri: cover }} style={styles.eventThumb} contentFit="cover" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.eventTitle}>{zone} Booth V{seatIds[0]?.replace(/\D/g,'') || '1'} • {title}</Text>
                            <Text style={styles.eventDate}>Sat, 24 Oct • {timeSlot}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.splitSubHeader}>
                    <Text style={styles.sectionLabel}>Split Details</Text>
                    <Text style={styles.perPerson}>₹{shareAmount.toLocaleString()} <Text style={styles.eachTxt}>each</Text></Text>
                </View>

                <View style={styles.searchRow}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="rgba(255,255,255,0.3)" />
                        <TextInput 
                            placeholder="Add from contacts..." 
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            style={styles.searchInput}
                            value={search}
                            onChangeText={setSearch}
                            editable={remainingSlots > 0}
                        />
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
                        <Ionicons name="people" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {search.length > 0 && filteredFriends.length > 0 && (
                    <View style={styles.searchResults}>
                        {filteredFriends.map(f => (
                            <TouchableOpacity key={f.id} style={styles.resultItem} onPress={() => toggleFriend(f)}>
                                <Image source={{ uri: f.avatar }} style={styles.resultAvatar} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.resultName}>{f.name}</Text>
                                    <Text style={styles.resultPhone}>{f.phone}</Text>
                                </View>
                                <Ionicons name="add-circle" size={24} color="#7c4dff" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.memberList}>
                    <View style={styles.memberHeader}>
                        <Text style={styles.listLabel}>Participants ({selectedFriends.length + 1}/{guests})</Text>
                    </View>

                    <View style={styles.memberCard}>
                        <Image source={{ uri: userImageUrl }} style={styles.memberAvatar} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.memberName}>{profile?.name || 'Loading...'} <Ionicons name="shield-checkmark" size={14} color="#7c4dff" /></Text>
                            <Text style={styles.memberShare}>₹{shareAmount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.settledBadge}>
                            <Text style={styles.settledTxt}>SETTLED</Text>
                        </View>
                    </View>

                    {selectedFriends.map(f => (
                        <View key={f.id} style={styles.memberCard}>
                            <Image source={{ uri: f.avatar }} style={styles.memberAvatar} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.memberName}>{f.name}</Text>
                                <Text style={styles.memberShare}>₹{shareAmount.toLocaleString()}</Text>
                            </View>
                            <TouchableOpacity onPress={() => toggleFriend(f)}>
                                <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.2)" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    
                    {Array.from({ length: remainingSlots }).map((_, idx) => (
                        <TouchableOpacity key={`empty-${idx}`} style={styles.addPlaceholder} onPress={() => setShowPicker(true)}>
                            <View style={styles.dashCircle}><Ionicons name="add" size={20} color="rgba(255,255,255,0.2)" /></View>
                            <Text style={styles.placeholderLabel}>Add Friend Share</Text>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>

            <Modal visible={showPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPicker(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.mBackBtn}>
                                <Ionicons name="chevron-back" size={22} color="#fff" />
                            </TouchableOpacity>
                            <View style={{ alignItems: 'center', flex: 1, marginRight: 40 }}>
                                <View style={styles.mHandle} />
                                <Text style={styles.mTitle}>My Contacts</Text>
                                <Text style={styles.mSub}>{remainingSlots} slots empty</Text>
                            </View>
                        </View>
                        
                        {loadingContacts ? (
                            <ActivityIndicator size="large" color="#7c4dff" style={{ marginVertical: 40 }} />
                        ) : (
                            <ScrollView style={{ maxHeight: height * 0.7 }} showsVerticalScrollIndicator={false}>
                                {contacts.map(f => {
                                    const isAdded = selectedFriends.find(sf => sf.id === f.id);
                                    return (
                                        <TouchableOpacity 
                                            key={f.id} 
                                            style={[styles.pItem, isAdded && { backgroundColor: 'rgba(124,77,255,0.05)' }]} 
                                            onPress={() => toggleFriend(f)}
                                            disabled={!isAdded && remainingSlots <= 0}
                                        >
                                            <Image source={{ uri: f.avatar }} style={styles.pAvatar} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.pName}>{f.name}</Text>
                                                <Text style={styles.pPhone}>{f.phone}</Text>
                                            </View>
                                            <Ionicons 
                                                name={isAdded ? "checkmark-circle" : "add-circle-outline"} 
                                                size={24} 
                                                color={isAdded ? "#22c55e" : "rgba(255,255,255,0.2)"} 
                                            />
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                        <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPicker(false)}>
                            <Text style={styles.doneTxt}>Add to Split</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20 }]}>
                <View style={styles.footerShareRow}>
                    <Text style={styles.shareLabel}>Total Guests: {guests}</Text>
                    <Text style={styles.shareValue}>₹{total.toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={styles.ctaBtn} onPress={handleRequestSplit}>
                    <LinearGradient colors={['#6d28d9', '#4f46e5']} style={styles.ctaGrad}>
                        <Text style={styles.ctaTxt}>{processing ? 'Requesting...' : 'Request Split & Pay'}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container:      { flex: 1, backgroundColor: '#030303' },
    header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
    backBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle:    { color: '#fff', fontSize: 18, fontWeight: '800' },
    scroll:         { paddingHorizontal: 20, paddingTop: 12 },
    totalCard:      { backgroundColor: '#0D0D0D', borderRadius: 28, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    totalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    totalLabel:     { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    totalAmount:    { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4 },
    receiptIcon:    { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(124,77,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    eventInfoBox:   { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 20, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    eventThumb:     { width: 50, height: 50, borderRadius: 12 },
    eventTitle:     { color: '#fff', fontSize: 14, fontWeight: '800' },
    eventDate:      { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
    splitSubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionLabel:   { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800' },
    perPerson:      { color: '#7c4dff', fontSize: 24, fontWeight: '900' },
    eachTxt:        { color: 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: '400' },
    searchRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    searchBar:      { flex: 1, flexDirection: 'row', alignItems: 'center', height: 56, backgroundColor: '#0D0D0D', borderRadius: 20, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    searchInput:    { flex: 1, color: '#fff', fontSize: 14, marginLeft: 12 },
    addBtn:         { width: 56, height: 56, borderRadius: 20, backgroundColor: '#7c4dff', alignItems: 'center', justifyContent: 'center' },
    searchResults:  { backgroundColor: '#111', borderRadius: 24, padding: 8, marginBottom: 24, borderWidth: 1, borderColor: '#7c4dff50' },
    resultItem:     { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 14 },
    resultAvatar:   { width: 40, height: 40, borderRadius: 20 },
    resultName:     { color: '#fff', fontSize: 14, fontWeight: '700' },
    resultPhone:    { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },
    memberList:     { gap: 12 },
    memberHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    listLabel:      { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800' },
    memberCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 20, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    memberAvatar:   { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    memberName:     { color: '#fff', fontSize: 15, fontWeight: '800' },
    memberShare:    { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
    settledBadge:   { backgroundColor: 'rgba(124,77,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    settledTxt:     { color: '#7c4dff', fontSize: 9, fontWeight: '900' },
    addPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20 },
    dashCircle:     { width: 40, height: 40, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    placeholderLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: '600' },
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent:   { backgroundColor: '#0D0D0D', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    mBackBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    mHandle:        { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 16 },
    mTitle:          { color: '#fff', fontSize: 18, fontWeight: '800' },
    mSub:           { color: '#7c4dff', fontSize: 12, fontWeight: '600', marginTop: 4 },
    pItem:          { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, gap: 14, marginBottom: 4 },
    pAvatar:        { width: 44, height: 44, borderRadius: 22 },
    pName:          { color: '#fff', fontSize: 15, fontWeight: '700' },
    pPhone:         { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
    doneBtn:        { backgroundColor: '#7c4dff', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
    doneTxt:        { color: '#fff', fontSize: 16, fontWeight: '800' },
    footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, backgroundColor: '#030303', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    footerShareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    shareLabel:     { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
    shareValue:     { color: '#fff', fontSize: 20, fontWeight: '900' },
    ctaBtn:         { borderRadius: 18, overflow: 'hidden' },
    ctaGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    ctaTxt:         { color: '#fff', fontSize: 16, fontWeight: '900' },
});