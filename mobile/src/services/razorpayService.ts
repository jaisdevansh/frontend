import { NativeModules } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import apiClient from './apiClient';

// ── Keys (test mode) ──────────────────────────────────────────────────────────
const RAZORPAY_KEY_ID = 'rzp_test_SPXu9raqQAlU2T';

export interface PaymentOptions {
    amount: number;          // in INR (NOT paise – we convert internally)
    receipt: string;         // unique receipt id e.g. "rcpt_<eventId>_<Date.now()>"
    description: string;
    prefillName?: string;
    prefillEmail?: string;
    prefillContact?: string;
    notes?: Record<string, string>;
}

export interface BookingData {
    eventId: string;
    hostId?: string;
    ticketType: string;
    tableId?: string;
    pricePaid: number;
    seatIds?: string[];
    zone?: string;
    guestCount?: number;
    userCouponId?: string; // optional: passed so backend can mark coupon as used after payment
}

// ─────────────────────────────────────────────────────────────────────────────
// Main function: create order → open Razorpay → verify with backend
// ─────────────────────────────────────────────────────────────────────────────
export async function initiateRazorpayPayment(
    paymentOptions: PaymentOptions,
    bookingData: BookingData,
): Promise<{ success: boolean; booking?: any; error?: string }> {

    // ── Check if Native Module exists (Expo Go Check) ──────────────────────────
    if (!NativeModules.RNRazorpayCheckout) {
        false && console.warn(
            '[Razorpay] Native module "RNRazorpayCheckout" is missing.\n' +
            'This usually means you are running in Expo Go. Razorpay requires a Development Build (npx expo run:android).\n' +
            'Falling back to SIMULATION MODE for testing...'
        );

        // Simulation Flow (only for testing)
        return new Promise(async (resolve) => {
            try {
                // Still create the order so we have a valid order_id even in simulation
                const orderRes = await apiClient.post('/api/v1/payments/create-order', {
                    amount: paymentOptions.amount,
                    currency: 'INR',
                    receipt: paymentOptions.receipt,
                });

                if (!orderRes.data.success) {
                    return resolve({ success: false, error: 'Simulation: Failed to create order' });
                }

                const order = orderRes.data.data;

                // Simulated verification
                const verifyRes = await apiClient.post('/api/v1/payments/verify-payment', {
                    razorpay_order_id:   order.id,
                    razorpay_payment_id: 'pay_simulated_' + Date.now(),
                    razorpay_signature:  'simulated_signature', // backend handles this in non-prod
                    bookingData: {
                        ...bookingData,
                        pricePaid: paymentOptions.amount,
                    },
                });

                if (verifyRes.data.success) {
                    resolve({ success: true, booking: verifyRes.data.data });
                } else {
                    resolve({ success: false, error: 'Simulation verify failed' });
                }
            } catch (err: any) {
                resolve({ success: false, error: 'Simulation error: ' + err.message });
            }
        });
    }

    try {
        // 1. Create Razorpay order from backend
        const orderRes = await apiClient.post('/api/v1/payments/create-order', {
            amount: paymentOptions.amount,
            currency: 'INR',
            receipt: paymentOptions.receipt,
        });

        if (!orderRes.data.success) {
            return { success: false, error: 'Failed to create payment order' };
        }

        const order = orderRes.data.data;

        // 2. Open Razorpay checkout SDK
        const rzpOptions = {
            description: paymentOptions.description,
            image: 'https://i.imgur.com/n5tjHFD.png', // logo
            currency: 'INR',
            key: RAZORPAY_KEY_ID,
            amount: String(order.amount),    // already in paise from backend
            name: 'Stitch',
            order_id: order.id,
            prefill: {
                name:    paymentOptions.prefillName    || '',
                email:   paymentOptions.prefillEmail   || '',
                contact: paymentOptions.prefillContact || '',
            },
            notes: paymentOptions.notes || {},
            theme: { color: '#7c4dff' },
        };

        const paymentData: any = await RazorpayCheckout.open(rzpOptions);

        // 3. Verify payment signature with backend & create booking
        const verifyRes = await apiClient.post('/api/v1/payments/verify-payment', {
            razorpay_order_id:   paymentData.razorpay_order_id,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature:  paymentData.razorpay_signature,
            bookingData: {
                ...bookingData,
                pricePaid: paymentOptions.amount,
            },
        });

        if (verifyRes.data.success) {
            return { success: true, booking: verifyRes.data.data };
        } else {
            return { success: false, error: verifyRes.data.message || 'Payment verification failed' };
        }

    } catch (error: any) {
        // User cancelled Razorpay checkout (code 0)
        if (error?.code === 0 || error?.description?.includes('cancelled')) {
            return { success: false, error: 'Payment cancelled' };
        }
        false && console.error('[Razorpay Error]', error);
        return { success: false, error: error?.message || 'Payment failed. Please try again.' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Food / Drink specific payment initiator
// Uses /payment/food/order  +  /payment/food/verify endpoints
// ─────────────────────────────────────────────────────────────────────────────
export async function initiateFoodPayment(
    paymentOptions: PaymentOptions,
    orderPayload: {
        eventId?: string;
        hostId?: string;
        tableId?: string;
        items: { _id: string; name: string; price: number; qty: number }[];
        subtotal: number;
        serviceFee: number;
        tipAmount: number;
        zone?: string;
    }
): Promise<{ success: boolean; order?: any; error?: string }> {

    // Simulation fallback (Expo Go)
    if (!NativeModules.RNRazorpayCheckout) {
        false && console.log('[RAZORPAY DEBUG] Running in SIMULATION MODE (Expo Go or lacking native module)');
        return new Promise(async (resolve) => {
            try {
                false && console.log('[RAZORPAY DEBUG] Creating food order (Simulation)...');
                const orderRes = await apiClient.post('/api/v1/payments/food/order', orderPayload);
                false && console.log('[RAZORPAY DEBUG] Order creation response:', orderRes.data.success ? 'SUCCESS' : 'FAILED');
                if (!orderRes.data.success) {
                    return resolve({ success: false, error: 'Simulation: Failed to create food order' });
                }
                const { data: rzpOrder, foodOrderId } = orderRes.data;
                const verifyRes = await apiClient.post('/api/v1/payments/food/verify', {
                    razorpay_order_id: rzpOrder.id,
                    razorpay_payment_id: 'pay_simulated_' + Date.now(),
                    razorpay_signature: 'simulated_signature',
                    foodOrderId,
                });
                if (verifyRes.data.success) {
                    resolve({ success: true, order: verifyRes.data.data });
                } else {
                    resolve({ success: false, error: 'Simulation verify failed' });
                }
            } catch (err: any) {
                resolve({ success: false, error: 'Simulation error: ' + err.message });
            }
        });
    }

    try {
        false && console.log('[RAZORPAY DEBUG] Starting REAL payment flow...');
        const orderRes = await apiClient.post('/api/v1/payments/food/order', orderPayload);
        false && console.log('[RAZORPAY DEBUG] Order Response:', JSON.stringify(orderRes.data, null, 2));
        if (!orderRes.data.success) return { success: false, error: 'Failed to create food order' };
        const { data: rzpOrder, foodOrderId } = orderRes.data;

        const rzpOptions = {
            description: paymentOptions.description,
            image: 'https://i.imgur.com/n5tjHFD.png',
            currency: 'INR',
            key: RAZORPAY_KEY_ID,
            amount: String(rzpOrder.amount),
            name: 'Stitch Drinks',
            order_id: rzpOrder.id,
            prefill: {
                name:    paymentOptions.prefillName    || '',
                email:   paymentOptions.prefillEmail   || '',
                contact: paymentOptions.prefillContact || '',
            },
            notes: paymentOptions.notes || {},
            theme: { color: '#7c4dff' },
        };

        false && console.log('[RAZORPAY DEBUG] Opening Razorpay UI with options:', JSON.stringify(rzpOptions, null, 2));
        const paymentData: any = await RazorpayCheckout.open(rzpOptions);
        false && console.log('[RAZORPAY DEBUG] Razorpay opened successfully. Payment Data:', JSON.stringify(paymentData, null, 2));

        false && console.log('[RAZORPAY DEBUG] Verifying food payment...');
        const verifyRes = await apiClient.post('/api/v1/payments/food/verify', {
            razorpay_order_id:   paymentData.razorpay_order_id,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature:  paymentData.razorpay_signature,
            foodOrderId,
        });

        if (verifyRes.data.success) {
            return { success: true, order: verifyRes.data.data };
        } else {
            return { success: false, error: verifyRes.data.message || 'Payment verification failed' };
        }
    } catch (error: any) {
        if (error?.code === 0 || error?.description?.includes('cancelled')) {
            return { success: false, error: 'Payment cancelled' };
        }
        false && console.error('[Razorpay Food Error]', error);
        return { success: false, error: error?.message || 'Payment failed. Please try again.' };
    }
}
