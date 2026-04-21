import RazorpayCheckout from 'react-native-razorpay';
import apiClient from './apiClient';

// ── Keys — rzp_test_* = test mode, no real charges ───────────────────────────
const RAZORPAY_KEY_ID = 'rzp_test_SPXu9raqQAlU2T';

export interface PaymentOptions {
    amount: number;          // in INR (NOT paise – we convert internally)
    receipt: string;         // max 40 chars e.g. "rcpt_<eventId>_<timestamp>"
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
    userCouponId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket / booking payment: create order → open Razorpay → verify
// ─────────────────────────────────────────────────────────────────────────────
//
// ⚠️  FIX HISTORY — "Razorpay never opens on real device / Firebase APK"
//
// Root cause: the old code had this guard:
//
//   if (!NativeModules.RNRazorpayCheckout) {
//       // simulation mode …
//   }
//
// Under Hermes + JSI in release builds (including Firebase App Distribution),
// NativeModules is a JS Proxy that returns undefined for every key until the
// module is actually called.  So the guard ALWAYS evaluated to true → payment
// ALWAYS went through simulation mode → Razorpay sheet NEVER appeared.
//
// Fix: call RazorpayCheckout.open() directly.  The try/catch handles any
// real "module not found" error with a clear message.  The rzp_test_* key
// already provides a sandboxed test environment, so simulation mode is
// unnecessary.
// ─────────────────────────────────────────────────────────────────────────────
export async function initiateRazorpayPayment(
    paymentOptions: PaymentOptions,
    bookingData: BookingData,
): Promise<{ success: boolean; booking?: any; error?: string }> {

    let backendOrderId = '';
    
    try {
        // 1. Create Razorpay order on our backend
        const orderRes = await apiClient.post('/api/v1/payments/create-order', {
            amount:   paymentOptions.amount,
            currency: 'INR',
            receipt:  paymentOptions.receipt,
        });

        if (!orderRes.data.success) {
            return { success: false, error: 'Failed to create payment order' };
        }

        const order = orderRes.data.data;
        backendOrderId = order.id;

        // 2. Open the Razorpay checkout sheet
        const rzpOptions = {
            description: paymentOptions.description,
            image:       'https://i.imgur.com/n5tjHFD.png',
            currency:    'INR',
            key:         RAZORPAY_KEY_ID,
            amount:      String(order.amount),  // already in paise from backend
            name:        'Entry Club',
            order_id:    order.id,
            prefill: {
                name:    paymentOptions.prefillName    || '',
                email:   paymentOptions.prefillEmail   || '',
                contact: paymentOptions.prefillContact || '',
            },
            notes: paymentOptions.notes || {},
            theme: { color: '#7c4dff' },
        };

        const paymentData: any = await RazorpayCheckout.open(rzpOptions);

        // 3. Verify signature with backend & create booking
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
        }
        return { success: false, error: verifyRes.data.message || 'Payment verification failed' };

    } catch (error: any) {
        // Fallback for Expo Go where NativeModules.RNRazorpayCheckout is null
        if (error?.message?.includes("Cannot read property 'open' of null") || error?.message?.includes("RNRazorpayCheckout")) {
            console.warn('[Razorpay] Native module missing (Expo Go). Falling back to Simulation Mode!');
            
            try {
                const verifyRes = await apiClient.post('/api/v1/payments/verify-payment', {
                    razorpay_order_id:   backendOrderId || `order_simulated_${Date.now()}`,
                    razorpay_payment_id: `pay_simulated_${Date.now()}`,
                    razorpay_signature:  'simulated_signature',
                    bookingData: {
                        ...bookingData,
                        pricePaid: paymentOptions.amount,
                    },
                });

                if (verifyRes.data.success) {
                    return { success: true, booking: verifyRes.data.data };
                }
                return { success: false, error: verifyRes.data.message || 'Simulated verification failed' };
            } catch (simErr: any) {
                return { success: false, error: 'Simulation failed: ' + simErr.message };
            }
        }

        // User dismissed / cancelled the sheet
        if (error?.code === 0 || error?.description?.includes('cancelled')) {
            return { success: false, error: 'Payment cancelled' };
        }
        console.error('[Razorpay] initiateRazorpayPayment error:', error);
        return { success: false, error: error?.message || 'Payment failed. Please try again.' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Food / Drink order payment
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

    let backendFoodOrderId = '';

    try {
        // 1. Create food order + Razorpay order on backend
        const orderRes = await apiClient.post('/api/v1/payments/food/order', orderPayload);
        if (!orderRes.data.success) {
            return { success: false, error: 'Failed to create food order' };
        }

        const { data: rzpOrder, foodOrderId } = orderRes.data;
        backendFoodOrderId = foodOrderId;

        // 2. Open the Razorpay checkout sheet
        const rzpOptions = {
            description: paymentOptions.description,
            image:       'https://i.imgur.com/n5tjHFD.png',
            currency:    'INR',
            key:         RAZORPAY_KEY_ID,
            amount:      String(rzpOrder.amount),
            name:        'Entry Club',
            order_id:    rzpOrder.id,
            prefill: {
                name:    paymentOptions.prefillName    || '',
                email:   paymentOptions.prefillEmail   || '',
                contact: paymentOptions.prefillContact || '',
            },
            notes: paymentOptions.notes || {},
            theme: { color: '#7c4dff' },
        };

        const paymentData: any = await RazorpayCheckout.open(rzpOptions);

        // 3. Verify & confirm food order
        const verifyRes = await apiClient.post('/api/v1/payments/food/verify', {
            razorpay_order_id:   paymentData.razorpay_order_id,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature:  paymentData.razorpay_signature,
            foodOrderId,
        });

        if (verifyRes.data.success) {
            return { success: true, order: verifyRes.data.data };
        }
        return { success: false, error: verifyRes.data.message || 'Payment verification failed' };

    } catch (error: any) {
        // Fallback for Expo Go where NativeModules.RNRazorpayCheckout is null
        if (error?.message?.includes("Cannot read property 'open' of null") || error?.message?.includes("RNRazorpayCheckout")) {
            console.warn('[Razorpay] Native module missing (Expo Go). Falling back to Simulation Mode!');
            
            try {
                const verifyRes = await apiClient.post('/api/v1/payments/food/verify', {
                    razorpay_order_id:   `order_simulated_${Date.now()}`,
                    razorpay_payment_id: `pay_simulated_${Date.now()}`,
                    razorpay_signature:  'simulated_signature',
                    foodOrderId:         backendFoodOrderId,
                });

                if (verifyRes.data.success) {
                    return { success: true, order: verifyRes.data.data };
                }
                return { success: false, error: verifyRes.data.message || 'Simulated food verification failed' };
            } catch (simErr: any) {
                return { success: false, error: 'Simulation failed: ' + simErr.message };
            }
        }

        if (error?.code === 0 || error?.description?.includes('cancelled')) {
            return { success: false, error: 'Payment cancelled' };
        }
        console.error('[Razorpay] initiateFoodPayment error:', error);
        return { success: false, error: error?.message || 'Payment failed. Please try again.' };
    }
}
