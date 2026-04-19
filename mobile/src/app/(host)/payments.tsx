import React, { useMemo, useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Dimensions,
    RefreshControl, SectionList, Modal, Alert, ScrollView,
    Linking, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { hostService } from '../../services/hostService';
import { Image } from 'expo-image';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import dayjs from 'dayjs';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonBase } from '../../components/Skeletons/SkeletonBase';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const { width } = Dimensions.get('window');

const C = {
    bg: '#000000',
    card: '#0a0a0f',
    cardBorder: 'rgba(255,255,255,0.07)',
    primary: '#6C63FF',
    green: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    blue: '#3B82F6',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.5)',
    textMuted: 'rgba(255,255,255,0.2)',
};

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Payment {
    _id?: string;
    memberName?: string;
    memberImage?: string;
    memberPhone?: string;
    userName?: string;
    userId?: { name?: string; profilePic?: string; phone?: string };
    amount?: number;
    status?: string;
    plan?: string;
    date?: string;
    grandTotal?: number;
}
interface Order {
    _id?: string;
    userName?: string;
    userId?: { name?: string; profilePic?: string; phone?: string };
    phone?: string;
    items?: { name?: string; itemName?: string; price?: number; qty?: number; quantity?: number }[];
    totalAmount?: number;
    total?: number;
    status?: string;
    createdAt?: string;
    grandTotal?: number;
}
interface UserTotal {
    name: string;
    img: string | null;
    phone: string | null;
    ticket: number;
    food: number;
    total: number;
    planText: string;
    itemsHtml: string;
    foodStr: string;
    status: string;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function statusColor(status: string) {
    const s = (status || '').toLowerCase();
    if (s === 'success' || s === 'paid' || s === 'completed' || s === 'delivered') return C.green;
    if (s === 'pending') return C.amber;
    return C.rose;
}

async function shareOnWhatsApp(phone: string | null, message: string) {
    let processPhone = phone ? String(phone).replace(/\D/g, '') : null;
    if (processPhone && processPhone.length === 10) processPhone = '91' + processPhone;
    const url = processPhone
        ? `whatsapp://send?phone=${processPhone}&text=${encodeURIComponent(message)}`
        : `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) await Linking.openURL(url);
        else Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to send bills.');
    } catch {
        Alert.alert('Error', 'Could not open WhatsApp.');
    }
}

async function printAndSharePDF(html: string) {
    try {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } else {
            Alert.alert('Error', 'Sharing is not available on this device');
        }
    } catch {
        Alert.alert('Error', 'Failed to generate receipt');
    }
}

function buildPDFHtml(params: {
    name: string;
    planText?: string;
    ticketAmt: number;
    itemsHtml?: string;
    grandTotal: number;
}) {
    const date = dayjs().format('DD MMM YYYY, hh:mm A');
    return `
        <html>
            <body style="font-family:sans-serif;padding:20px;color:#000">
                <h2 style="text-align:center;margin-bottom:5px">Consolidated Receipt</h2>
                <p style="text-align:center;color:#666;margin-top:0;font-size:12px">${date}</p>
                <hr style="border:1px dashed #ccc;margin:20px 0"/>
                <p style="margin:5px 0"><strong>Customer:</strong> ${params.name}</p>
                ${params.planText && params.ticketAmt > 0 ? `<p style="margin:5px 0"><strong>Plan:</strong> ${params.planText}</p>` : ''}
                <hr style="border:1px dashed #ccc;margin:20px 0"/>
                ${params.ticketAmt > 0 ? `
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                        <strong>Entry Ticket</strong>
                        <strong>&#8377;${params.ticketAmt.toLocaleString()}</strong>
                    </div>
                ` : ''}
                ${params.itemsHtml ? `<div style="margin-top:10px">${params.itemsHtml}</div>` : ''}
                <hr style="border:1px dashed #ccc;margin:20px 0"/>
                <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold">
                    <span>Grand Total Billed</span>
                    <span>&#8377;${params.grandTotal.toLocaleString()}</span>
                </div>
            </body>
        </html>
    `;
}

// ── SUMMARY CARD ──────────────────────────────────────────────────────────────
interface SummaryCardProps { label: string; value: string; icon: any; color: string; sub?: string; style?: any }
const SummaryCard = React.memo(({ label, value, icon, color, sub, style }: SummaryCardProps) => (
    <View style={[styles.summaryCard, { borderColor: color + '18' }, style]}>
        <LinearGradient
            colors={[color + '22', 'transparent']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={[styles.summaryIcon, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
        {sub ? <Text style={[styles.summarySub, { color }]}>{sub}</Text> : null}
    </View>
));

// ── PAYMENT ROW ───────────────────────────────────────────────────────────────
const PaymentRow = React.memo(({ item, isLast }: { item: Payment; isLast: boolean }) => {
    const sc = statusColor(item.status || '');
    return (
        <View style={[styles.row, isLast && styles.rowLast]}>
            {item.memberImage ? (
                <Image source={{ uri: item.memberImage }} style={styles.avatar} contentFit="cover" />
            ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={16} color={C.textMuted} />
                </View>
            )}
            <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>{item.memberName || 'Guest'}</Text>
                <Text style={styles.rowSub}>{item.plan || 'Standard'} · {dayjs(item.date).format('DD MMM, hh:mm A')}</Text>
            </View>
            <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>₹{(item.amount || 0).toLocaleString()}</Text>
                <View style={[styles.statusPill, { backgroundColor: sc + '18', borderColor: sc + '30' }]}>
                    <Text style={[styles.statusText, { color: sc }]}>{item.status || 'Pending'}</Text>
                </View>
            </View>
        </View>
    );
});

// ── ORDER ROW ─────────────────────────────────────────────────────────────────
const OrderRow = React.memo(({ item, isLast }: { item: Order; isLast: boolean }) => {
    const sc = statusColor(item.status || '');
    const itemNames = useMemo(() =>
        (item.items || []).map(i => i.name || i.itemName || '').filter(Boolean).join(', '),
    [item.items]);
    const totalAmount = useMemo(() =>
        item.totalAmount || item.total ||
        (item.items || []).reduce((acc, it) => acc + ((it.price || 0) * (it.qty || it.quantity || 1)), 0),
    [item]);
    return (
        <View style={[styles.row, isLast && styles.rowLast]}>
            <View style={[styles.orderIcon, styles.orderIconAmber]}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={18} color={C.amber} />
            </View>
            <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>{itemNames || 'Order'}</Text>
                <Text style={styles.rowSub}>{dayjs(item.createdAt).format('DD MMM, hh:mm A')}</Text>
            </View>
            <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>₹{totalAmount.toLocaleString()}</Text>
                <View style={[styles.statusPill, { backgroundColor: sc + '18', borderColor: sc + '30' }]}>
                    <Text style={[styles.statusText, { color: sc }]}>{item.status || 'Pending'}</Text>
                </View>
            </View>
        </View>
    );
});

// ── SECTION HEADER ────────────────────────────────────────────────────────────
const SectionHeader = React.memo(({ title, count }: { title: string; count: number }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
            <Text style={styles.countText}>{count}</Text>
        </View>
    </View>
));

// ── USER TOTAL ROW ────────────────────────────────────────────────────────────
const UserTotalRow = React.memo(({ u, isLast }: { u: UserTotal; isLast: boolean }) => {
    const handlePrint = useCallback(async () => {
        const html = buildPDFHtml({
            name: u.name,
            planText: u.planText.trim(),
            ticketAmt: u.ticket,
            itemsHtml: u.itemsHtml,
            grandTotal: u.total,
        });
        await printAndSharePDF(html);
    }, [u]);

    const handleWhatsApp = useCallback(async () => {
        let message = `Hello! Here is your Consolidated Receipt:\n`;
        if (u.ticket > 0) message += `\n*Entry Ticket (${u.planText.trim() || 'Standard'}):* ₹${u.ticket.toLocaleString()}\n`;
        if (u.food > 0) message += `\n*Food & Drink Orders:*\n${u.foodStr}`;
        message += `\n*Grand Total Billed:* ₹${u.total.toLocaleString()}\n\n*Status:* ${u.status.toUpperCase()}\nThank you!`;
        await shareOnWhatsApp(u.phone, message);
    }, [u]);

    return (
        <View style={[styles.userTotalRow, isLast && styles.userTotalRowLast]}>
            <View style={styles.userTotalTop}>
                {u.img ? (
                    <Image source={{ uri: u.img }} style={styles.userTotalAvatar} contentFit="cover" />
                ) : (
                    <View style={[styles.userTotalAvatar, styles.userTotalAvatarFallback]}>
                        <Ionicons name="person" size={20} color={C.textMuted} />
                    </View>
                )}
                <View style={styles.userTotalInfo}>
                    <Text style={styles.userTotalName}>{u.name}</Text>
                    <Text style={styles.userTotalSub}>
                        Ticket: ₹{u.ticket.toLocaleString()}  |  Food: ₹{u.food.toLocaleString()}
                    </Text>
                </View>
                <Text style={styles.userTotalAmount}>₹{u.total.toLocaleString()}</Text>
            </View>
            <View style={styles.userTotalActions}>
                <TouchableOpacity style={styles.actionBtnPurple} onPress={handlePrint} activeOpacity={0.7}>
                    <Ionicons name="print-outline" size={16} color={C.primary} style={styles.actionBtnIcon} />
                    <Text style={[styles.actionBtnTxt, { color: C.primary }]}>Print PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnGreen} onPress={handleWhatsApp} activeOpacity={0.7}>
                    <Ionicons name="logo-whatsapp" size={16} color={C.green} style={styles.actionBtnIcon} />
                    <Text style={[styles.actionBtnTxt, { color: C.green }]}>WhatsApp</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

// ── SKELETON ─────────────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
            <SkeletonBase width={44} height={44} borderRadius={16} />
            <View style={styles.headerCenter}>
                <SkeletonBase width={160} height={24} borderRadius={6} style={styles.skeletonMb4} />
                <SkeletonBase width={100} height={12} borderRadius={4} />
            </View>
            <SkeletonBase width={44} height={44} borderRadius={16} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.listHeaderPadding}>
                <SkeletonBase width={150} height={20} borderRadius={6} style={styles.skeletonMb14} />
                <View style={styles.summaryGrid}>
                    {[0, 1, 2, 3].map(i => (
                        <View key={i} style={[styles.summaryCard, styles.summaryCardBorderTransparent]}>
                            <SkeletonBase width={40} height={40} borderRadius={14} style={styles.skeletonMb14} />
                            <SkeletonBase width="80%" height={20} borderRadius={4} style={styles.skeletonMb8} />
                            <SkeletonBase width="50%" height={12} borderRadius={4} />
                        </View>
                    ))}
                </View>
                <SkeletonBase width="100%" height={80} borderRadius={20} style={styles.skeletonMb24} />
            </View>
            {[0, 1].map(si => (
                <View key={si}>
                    <View style={styles.sectionHeader}>
                        <SkeletonBase width={130} height={20} borderRadius={6} />
                        <SkeletonBase width={30} height={20} borderRadius={8} />
                    </View>
                    <View style={[styles.listItemWrapper, styles.listItemFirst, styles.listItemLast]}>
                        {[0, 1, 2].map(i => (
                            <View key={i} style={[styles.row, i === 2 && styles.rowLast]}>
                                <SkeletonBase width={42} height={42} borderRadius={14} />
                                <View style={styles.rowInfo}>
                                    <SkeletonBase width={120} height={16} borderRadius={4} style={styles.skeletonMb6} />
                                    <SkeletonBase width={160} height={12} borderRadius={4} />
                                </View>
                                <View style={styles.rowRight}>
                                    <SkeletonBase width={60} height={18} borderRadius={4} style={styles.skeletonMb6} />
                                    <SkeletonBase width={50} height={16} borderRadius={6} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            ))}
        </ScrollView>
    </SafeAreaView>
);

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function PaymentsScreen() {
    const router = useRouter();
    const { openUserTotals } = useLocalSearchParams();
    const [selectedBill, setSelectedBill] = useState<{ type: string; data: any } | null>(null);
    const [showUserTotals, setShowUserTotals] = useState(openUserTotals === 'true');

    const { data: paymentsRes, isLoading: l1, refetch: r1 } = useQuery({
        queryKey: ['hostPayments'],
        queryFn: async () => { const res = await hostService.getPayments(); return res?.data || []; },
        staleTime: 2 * 60 * 1000,
        retry: false,
    });

    const { data: payoutsRes, isLoading: l2, refetch: r2 } = useQuery({
        queryKey: ['hostPayouts'],
        queryFn: async () => {
            const res = await hostService.getPayouts();
            return res?.data || { history: [], summary: { totalEarnings: 0, pendingPayout: 0, completedPayout: 0 } };
        },
        staleTime: 2 * 60 * 1000,
        retry: false,
    });

    const { data: ordersRes, isLoading: l3, refetch: r3 } = useQuery({
        queryKey: ['hostOrders'],
        queryFn: async () => { const res = await hostService.getOrders(); return res?.data || []; },
        staleTime: 2 * 60 * 1000,
        retry: false,
    });

    const isLoading = l1 || l2 || l3;
    const onRefresh = useCallback(async () => { await Promise.all([r1(), r2(), r3()]); }, [r1, r2, r3]);

    const payments: Payment[] = useMemo(() => Array.isArray(paymentsRes) ? paymentsRes : [], [paymentsRes]);
    const orders: Order[] = useMemo(() => Array.isArray(ordersRes) ? ordersRes : [], [ordersRes]);
    const summary = useMemo(() => payoutsRes?.summary || { totalEarnings: 0, pendingPayout: 0, completedPayout: 0 }, [payoutsRes]);
    const payoutHistory: any[] = useMemo(() => payoutsRes?.history || [], [payoutsRes]);

    const totalTicketRevenue = useMemo(() =>
        payments.filter(p => { const s = (p.status || '').toLowerCase(); return s === 'success' || s === 'completed' || s === 'paid' || s === 'pending'; })
            .reduce((s, p) => s + (p.amount || 0), 0),
    [payments]);

    const totalOrderRevenue = useMemo(() =>
        orders.filter(o => { const s = (o.status || '').toLowerCase(); return s !== 'cancelled' && s !== 'rejected' && s !== 'failed'; })
            .reduce((s, o) => {
                const amt = o.totalAmount || o.total || (o.items || []).reduce((a, it) => a + ((it.price || 0) * (it.qty || it.quantity || 1)), 0);
                return s + amt;
            }, 0),
    [orders]);

    const totalRevenue = totalTicketRevenue + totalOrderRevenue;
    const pendingPayments = useMemo(() => payments.filter(p => (p.status || '').toLowerCase() === 'pending').length, [payments]);

    const userTotals: UserTotal[] = useMemo(() => {
        const map = new Map<string, UserTotal>();
        payments.forEach(p => {
            const key = p.memberName || p.userName || p.userId?.name || 'Guest';
            if (!map.has(key)) map.set(key, { name: key, img: null, phone: null, ticket: 0, food: 0, total: 0, planText: '', itemsHtml: '', foodStr: '', status: 'COMPLETED' });
            const obj = map.get(key)!;
            obj.ticket += (p.amount || 0);
            obj.total += (p.amount || 0);
            if (p.plan) obj.planText = p.plan;
            if (!obj.img) obj.img = p.memberImage || p.userId?.profilePic || null;
            if (!obj.phone) obj.phone = p.memberPhone || p.userId?.phone || null;
            if (p.status) obj.status = p.status;
        });
        orders.forEach(o => {
            const key = o.userName || o.userId?.name || 'Guest';
            if (!map.has(key)) map.set(key, { name: key, img: null, phone: null, ticket: 0, food: 0, total: 0, planText: '', itemsHtml: '', foodStr: '', status: 'COMPLETED' });
            const obj = map.get(key)!;
            const oAmt = o.totalAmount || o.total || (o.items || []).reduce((a, it) => a + ((it.price || 0) * (it.qty || it.quantity || 1)), 0);
            obj.food += oAmt;
            obj.total += oAmt;
            if (!obj.img) obj.img = o.userId?.profilePic || null;
            if (!obj.phone) obj.phone = o.userId?.phone || o.phone || null;
            if (o.items) {
                o.items.forEach(it => {
                    const qty = it.qty || it.quantity || 1;
                    obj.foodStr += `${qty}x ${it.name || it.itemName}\n`;
                    obj.itemsHtml += `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>${qty}x ${it.name || it.itemName}</span><span>&#8377;${((it.price || 0) * qty).toLocaleString()}</span></div>`;
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [payments, orders]);

    const userGrandTotal = useMemo(() => userTotals.reduce((s, u) => s + u.total, 0), [userTotals]);

    const consolidatedReceipt = useMemo(() => {
        if (!selectedBill) return null;
        const { type, data } = selectedBill;
        const targetUser = type === 'payment'
            ? data.memberName || data.userName || data.userId?.name || 'Guest'
            : data.userName || data.userId?.name || 'Guest';
        const userPmts = payments.filter(p => (p.memberName || p.userName || p.userId?.name) === targetUser);
        const userOrders = orders.filter(o => (o.userName || o.userId?.name) === targetUser);
        const ticketAmt = userPmts.reduce((s, p) => s + (p.amount || 0), 0);
        const planText = userPmts.map(p => p.plan).filter(Boolean).join(', ');
        let totalFoodAmt = 0, foodStr = '', itemsHtml = '';
        userOrders.forEach(o => {
            const a = o.totalAmount || o.total || (o.items || []).reduce((acc, it) => acc + ((it.price || 0) * (it.qty || it.quantity || 1)), 0);
            totalFoodAmt += a;
            (o.items || []).forEach(it => {
                const qty = it.qty || it.quantity || 1;
                foodStr += `${qty}x ${it.name || it.itemName} – ₹${((it.price || 0) * qty).toLocaleString()}\n`;
                itemsHtml += `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>${qty}x ${it.name || it.itemName}</span><span>&#8377;${((it.price || 0) * qty).toLocaleString()}</span></div>`;
            });
        });
        return { targetUser, ticketAmt, planText, totalFoodAmt, foodStr, itemsHtml, grandTotal: ticketAmt + totalFoodAmt, status: data.status || 'COMPLETED' };
    }, [selectedBill, payments, orders]);

    const handlePrintBill = useCallback(async () => {
        if (!consolidatedReceipt) return;
        const html = buildPDFHtml({
            name: consolidatedReceipt.targetUser,
            planText: consolidatedReceipt.planText,
            ticketAmt: consolidatedReceipt.ticketAmt,
            itemsHtml: consolidatedReceipt.itemsHtml,
            grandTotal: consolidatedReceipt.grandTotal,
        });
        await printAndSharePDF(html);
    }, [consolidatedReceipt]);

    const handleWhatsAppBill = useCallback(async () => {
        if (!selectedBill || !consolidatedReceipt) return;
        let message = `Hello! Here is your Consolidated Receipt:\n`;
        if (consolidatedReceipt.ticketAmt > 0) message += `\n*Entry Ticket (${consolidatedReceipt.planText}):* ₹${consolidatedReceipt.ticketAmt.toLocaleString()}\n`;
        if (consolidatedReceipt.totalFoodAmt > 0) message += `\n*Food & Drink Orders:*\n${consolidatedReceipt.foodStr}`;
        message += `\n*Grand Total Billed:* ₹${consolidatedReceipt.grandTotal.toLocaleString()}\n\n*Status:* ${consolidatedReceipt.status.toUpperCase()}\nThank you!`;
        const phone = selectedBill.data.userId?.phone || selectedBill.data.memberPhone || selectedBill.data.phone || null;
        await shareOnWhatsApp(phone, message);
        setSelectedBill(null);
    }, [selectedBill, consolidatedReceipt]);

    const sections = useMemo(() => {
        const enrichedPayments = payments.map(p => {
            const targetUser = p.memberName || p.userName || p.userId?.name || 'Guest';
            const foodAmt = orders.filter(o => (o.userName || o.userId?.name) === targetUser)
                .reduce((a, o) => a + (o.totalAmount || o.total || (o.items || []).reduce((ac, it) => ac + ((it.price || 0) * (it.qty || it.quantity || 1)), 0)), 0);
            return { ...p, grandTotal: (p.amount || 0) + foodAmt };
        });
        const enrichedOrders = orders.map(o => {
            const targetUser = o.userName || o.userId?.name || 'Guest';
            const ticketAmt = payments.filter(p => (p.memberName || p.userName || p.userId?.name) === targetUser).reduce((a, p) => a + (p.amount || 0), 0);
            const oAmt = o.totalAmount || o.total || (o.items || []).reduce((a, it) => a + ((it.price || 0) * (it.qty || it.quantity || 1)), 0);
            return { ...o, grandTotal: oAmt + ticketAmt };
        });
        const s: any[] = [
            {
                type: 'payments',
                title: `Ticket Payments (₹${totalTicketRevenue.toLocaleString()})`,
                data: payments.length > 0 ? enrichedPayments : [{ _isEmpty: true, msg: 'No ticket payments yet', icon: 'ticket-outline' }],
            },
            {
                type: 'orders',
                title: `Food & Drink Orders (₹${totalOrderRevenue.toLocaleString()})`,
                data: orders.length > 0 ? enrichedOrders : [{ _isEmpty: true, msg: 'No food orders yet', icon: 'silverware-fork-knife' }],
            },
        ];
        if (payoutHistory.length > 0) {
            s.push({ type: 'payouts', title: 'Payout History', data: payoutHistory });
        }
        return s;
    }, [payments, orders, payoutHistory, totalTicketRevenue, totalOrderRevenue]);

    const renderSectionHeader = useCallback(({ section }: any) => (
        <SectionHeader title={section.title} count={section.data[0]?._isEmpty ? 0 : section.data.length} />
    ), []);

    const renderItem = useCallback(({ item, index, section }: any) => {
        if (item._isEmpty) {
            return (
                <View style={styles.emptyBox}>
                    {section.type === 'orders'
                        ? <MaterialCommunityIcons name={item.icon} size={36} color={C.textMuted} />
                        : <Ionicons name={item.icon} size={36} color={C.textMuted} />}
                    <Text style={styles.emptyText}>{item.msg}</Text>
                </View>
            );
        }
        const isFirst = index === 0;
        const isLast = index === section.data.length - 1;
        let ChildNode: React.ReactNode;
        if (section.type === 'payments') {
            ChildNode = (
                <TouchableOpacity onPress={() => setSelectedBill({ type: 'payment', data: item })} activeOpacity={0.7}>
                    <PaymentRow item={item} isLast={isLast} />
                </TouchableOpacity>
            );
        } else if (section.type === 'orders') {
            ChildNode = (
                <TouchableOpacity onPress={() => setSelectedBill({ type: 'order', data: item })} activeOpacity={0.7}>
                    <OrderRow item={item} isLast={isLast} />
                </TouchableOpacity>
            );
        } else {
            const sc = statusColor(item.status || 'Pending');
            ChildNode = (
                <View style={[styles.row, isLast && styles.rowLast]}>
                    <View style={[styles.orderIcon, styles.orderIconGreen]}>
                        <Ionicons name="card-outline" size={18} color={C.green} />
                    </View>
                    <View style={styles.rowInfo}>
                        <Text style={styles.rowName}>{item.method || 'Bank Transfer'}</Text>
                        <Text style={styles.rowSub}>{dayjs(item.date || item.createdAt).format('DD MMM YYYY')}</Text>
                    </View>
                    <View style={styles.rowRight}>
                        <Text style={[styles.rowAmount, { color: C.green }]}>₹{(item.amount || 0).toLocaleString()}</Text>
                        <View style={[styles.statusPill, { backgroundColor: sc + '18', borderColor: sc + '30' }]}>
                            <Text style={[styles.statusText, { color: sc }]}>{item.status || 'Pending'}</Text>
                        </View>
                    </View>
                </View>
            );
        }
        return (
            <View style={[styles.listItemWrapper, isFirst && styles.listItemFirst, isLast && styles.listItemLast]}>
                {ChildNode}
            </View>
        );
    }, []);

    const renderUserTotalItem = useCallback(({ item, index }: { item: UserTotal; index: number }) => (
        <UserTotalRow u={item} isLast={index === userTotals.length - 1} />
    ), [userTotals.length]);

    const renderListHeader = useCallback(() => (
        <View style={styles.listHeaderPadding}>
            <Text style={styles.overviewTitle}>Financial Overview</Text>
            <View style={styles.summaryGrid}>
                <SummaryCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon="wallet-outline" color={C.green} sub="↑ Tickets + Orders" />
                <SummaryCard label="Ticket Revenue" value={`₹${totalTicketRevenue.toLocaleString()}`} icon="ticket-outline" color={C.primary} sub={`${payments.filter(p => (p.status||'').toLowerCase() === 'success').length} bookings`} />
                <SummaryCard label="Order Revenue" value={`₹${totalOrderRevenue.toLocaleString()}`} icon="restaurant-outline" color={C.amber} sub={`${orders.length} orders`} />
                <SummaryCard label="Pending Payout" value={`₹${(summary.pendingPayout || 0).toLocaleString()}`} icon="time-outline" color={C.rose} sub={pendingPayments > 0 ? `${pendingPayments} pending` : 'All settled'} />
                <TouchableOpacity onPress={() => setShowUserTotals(true)} activeOpacity={0.8} style={styles.userTotalCardWrap}>
                    <SummaryCard label="User Grand Total" value={`₹${userGrandTotal.toLocaleString()}`} icon="people-outline" color={C.blue} sub={`${userTotals.length} Users · Tap to view splits`} style={styles.userTotalCard} />
                </TouchableOpacity>
            </View>
            {summary.totalEarnings > 0 && (
                <View style={styles.earningsBar}>
                    <LinearGradient colors={['#10B98118', 'transparent']} style={StyleSheet.absoluteFillObject} />
                    <View style={styles.earningsBarRow}>
                        <View>
                            <Text style={styles.earningsBarLabel}>TOTAL EARNINGS</Text>
                            <Text style={styles.earningsBarValue}>₹{summary.totalEarnings.toLocaleString()}</Text>
                        </View>
                        <View style={styles.earnDivider} />
                        <View>
                            <Text style={styles.earningsBarLabel}>SETTLED</Text>
                            <Text style={[styles.earningsBarValue, { color: C.green }]}>₹{(summary.completedPayout || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.earnDivider} />
                        <View>
                            <Text style={styles.earningsBarLabel}>PENDING</Text>
                            <Text style={[styles.earningsBarValue, { color: C.amber }]}>₹{(summary.pendingPayout || 0).toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    ), [totalRevenue, totalTicketRevenue, totalOrderRevenue, summary, pendingPayments, userGrandTotal, userTotals.length, payments, orders, setShowUserTotals]);

    if (isLoading) return <LoadingSkeleton />;

    const sc = consolidatedReceipt ? statusColor(consolidatedReceipt.status) : C.amber;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Nav Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color="white" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Payments & Revenue</Text>
                    <Text style={styles.headerSub}>{dayjs().format('MMM YYYY')} · Live Data</Text>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
                    <Ionicons name="refresh" size={18} color={C.primary} />
                </TouchableOpacity>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item, index) => item._id || item.id || String(index)}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={renderListHeader}
                renderSectionHeader={renderSectionHeader}
                renderItem={renderItem}
                ListFooterComponent={<View style={styles.listFooter} />}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                windowSize={7}
                removeClippedSubviews={true}
                stickySectionHeadersEnabled={false}
            />

            {/* BILL RECEIPT MODAL */}
            <Modal visible={!!selectedBill} transparent animationType="slide" onRequestClose={() => setSelectedBill(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Point of Sale Receipt</Text>
                                <Text style={styles.modalSubTitle}>{dayjs().format('DD MMM YYYY, hh:mm A')}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedBill(null)}>
                                <Ionicons name="close-circle" size={28} color={C.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {consolidatedReceipt && (
                                <View style={styles.billInner}>
                                    <Text style={styles.billGuest}>Customer: {consolidatedReceipt.targetUser}</Text>
                                    {consolidatedReceipt.ticketAmt > 0 && <Text style={styles.billPlan}>Plan: {consolidatedReceipt.planText}</Text>}
                                    <View style={styles.billDivider} />

                                    {consolidatedReceipt.ticketAmt > 0 && (
                                        <View style={styles.billItemRow}>
                                            <Text style={[styles.billItemName, styles.bold]}>Entry Ticket</Text>
                                            <Text style={styles.billItemPrice}>₹{consolidatedReceipt.ticketAmt.toLocaleString()}</Text>
                                        </View>
                                    )}

                                    {consolidatedReceipt.totalFoodAmt > 0 && (
                                        <>
                                            <View style={styles.billItemRow}>
                                                <Text style={[styles.billItemName, styles.bold]}>Food & Drink Orders</Text>
                                                <Text style={styles.billItemPrice}>₹{consolidatedReceipt.totalFoodAmt.toLocaleString()}</Text>
                                            </View>
                                            {/* individual ordered items would appear from itemsHtml, shown in PDF only */}
                                        </>
                                    )}

                                    <View style={styles.billDivider} />
                                    <View style={[styles.billTotalRow, { marginBottom: 8 }]}>
                                        <Text style={styles.billTotalText}>Entry Status</Text>
                                        <View style={[styles.modalStatusPill, { backgroundColor: sc + '25' }]}>
                                            <Text style={[styles.modalStatusPillTxt, { color: sc }]}>
                                                {consolidatedReceipt.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.billTotalRow}>
                                        <Text style={styles.billTotalText}>Grand Total Billed</Text>
                                        <Text style={styles.billTotalAmount}>₹{consolidatedReceipt.grandTotal.toLocaleString()}</Text>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.btnAction, { backgroundColor: C.primary }]} onPress={handlePrintBill} activeOpacity={0.8}>
                                <Ionicons name="download-outline" size={20} color="#FFF" style={styles.actionBtnIcon} />
                                <Text style={styles.btnActionTxt}>Download Physical Bill</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btnAction, { backgroundColor: C.green }]} onPress={handleWhatsAppBill} activeOpacity={0.8}>
                                <Ionicons name="paper-plane-outline" size={20} color="#FFF" style={styles.actionBtnIcon} />
                                <Text style={styles.btnActionTxt}>Send to User</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* USER TOTALS MODAL */}
            <Modal visible={showUserTotals} transparent animationType="slide" onRequestClose={() => setShowUserTotals(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.userTotalsContainer}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>User Grand Total</Text>
                                <Text style={styles.modalSubTitle}>
                                    ₹{userGrandTotal.toLocaleString()} · {userTotals.length} Users
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowUserTotals(false)}>
                                <Ionicons name="close-circle" size={28} color={C.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={userTotals}
                            keyExtractor={(item, index) => `${item.name}-${index}`}
                            renderItem={renderUserTotalItem}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.userTotalsList}
                            initialNumToRender={10}
                            maxToRenderPerBatch={10}
                            windowSize={5}
                            removeClippedSubviews={true}
                            ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 14 },
    backBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
    headerSub: { color: C.primary, fontSize: 11, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
    refreshBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(108,99,255,0.1)', borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)', alignItems: 'center', justifyContent: 'center' },

    // List
    scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
    listHeaderPadding: { marginBottom: 12 },
    listFooter: { height: 60 },

    // Summary Cards
    overviewTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.2, marginBottom: 14 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    summaryCard: { width: (width - 52) / 2, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, padding: 18, overflow: 'hidden' },
    summaryCardBorderTransparent: { borderColor: 'rgba(255,255,255,0.05)' },
    summaryIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    summaryValue: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
    summaryLabel: { color: C.textSecondary, fontSize: 12, fontWeight: '700' },
    summarySub: { fontSize: 11, fontWeight: '700', marginTop: 4 },
    userTotalCardWrap: { width: '100%', marginTop: 8 },
    userTotalCard: { width: '100%' },

    // Earnings Bar
    earningsBar: { backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: C.green + '18', overflow: 'hidden' },
    earningsBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    earningsBarLabel: { color: C.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
    earningsBarValue: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
    earnDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },

    // Section
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 },
    sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
    countBadge: { backgroundColor: 'rgba(108,99,255,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    countText: { color: C.primary, fontSize: 12, fontWeight: '900' },

    // List Item Wrappers
    listItemWrapper: { backgroundColor: C.card, borderLeftWidth: 1, borderRightWidth: 1, borderLeftColor: C.cardBorder, borderRightColor: C.cardBorder },
    listItemFirst: { borderTopWidth: 1, borderTopColor: C.cardBorder, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    listItemLast: { borderBottomWidth: 1, borderBottomColor: C.cardBorder, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 24 },

    // Row
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', gap: 12 },
    rowLast: { borderBottomWidth: 0 },
    avatar: { width: 42, height: 42, borderRadius: 14 },
    avatarFallback: { backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    orderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    orderIconAmber: { backgroundColor: C.amber + '14' },
    orderIconGreen: { backgroundColor: C.green + '14' },
    rowInfo: { flex: 1 },
    rowName: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 3 },
    rowSub: { color: C.textSecondary, fontSize: 11, fontWeight: '500' },
    rowRight: { alignItems: 'flex-end', gap: 5 },
    rowAmount: { color: '#fff', fontSize: 15, fontWeight: '900' },
    statusPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },

    // Empty State
    emptyBox: { alignItems: 'center', paddingVertical: 36, gap: 10, marginBottom: 24, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder },
    emptyText: { color: C.textSecondary, fontSize: 14, fontWeight: '600', textAlign: 'center', padding: 20 },

    // Modal shared
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40, maxHeight: '80%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    modalTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    modalSubTitle: { color: C.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 4 },
    modalScroll: { marginBottom: 24 },

    // Bill receipt
    billInner: { backgroundColor: '#0a0a0a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
    billGuest: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    billPlan: { color: C.textSecondary, fontSize: 14, marginTop: 4, fontWeight: '500' },
    billDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16, borderStyle: 'dashed', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
    billItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    billItemName: { color: '#FFF', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12 },
    billItemPrice: { color: C.textSecondary, fontSize: 15, fontWeight: '700' },
    billTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billTotalText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    billTotalAmount: { color: C.green, fontSize: 22, fontWeight: '900' },
    bold: { fontWeight: '700' },

    // Modal actions
    modalActions: { gap: 12 },
    btnAction: { flexDirection: 'row', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    btnActionTxt: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    modalStatusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
    modalStatusPillTxt: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },

    // User Totals Modal
    userTotalsContainer: { backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 0, maxHeight: '88%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', flex: 0 },
    userTotalsList: { paddingBottom: 40 },
    userTotalRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingVertical: 16 },
    userTotalRowLast: { borderBottomWidth: 0 },
    userTotalTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    userTotalAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
    userTotalAvatarFallback: { backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    userTotalInfo: { flex: 1 },
    userTotalName: { color: '#fff', fontSize: 16, fontWeight: '800' },
    userTotalSub: { color: C.textSecondary, fontSize: 13, marginTop: 4 },
    userTotalAmount: { color: C.green, fontSize: 18, fontWeight: '900' },
    userTotalActions: { flexDirection: 'row', gap: 8 },
    actionBtnPurple: { flex: 1, backgroundColor: 'rgba(108,99,255,0.1)', height: 36, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    actionBtnGreen: { flex: 1, backgroundColor: 'rgba(16,185,129,0.1)', height: 36, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    actionBtnIcon: { marginRight: 6 },
    actionBtnTxt: { fontWeight: '600', fontSize: 13 },

    // Skeleton helpers
    skeletonMb4: { marginBottom: 4 },
    skeletonMb6: { marginBottom: 6 },
    skeletonMb8: { marginBottom: 8 },
    skeletonMb14: { marginBottom: 14 },
    skeletonMb24: { marginBottom: 24 },
});
