import React, { createContext, useState, useContext, ReactNode } from 'react';
import PremiumToast, { ToastRef } from '../components/PremiumToast';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface ToastContextData {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const toastRef = React.useRef<ToastRef>(null);

    const showToast = React.useCallback((message: string, type: ToastType = 'info', duration?: number) => {
        toastRef.current?.show({
            title: type === 'error' ? 'SYSTEM CHECK' : type.toUpperCase(),
            message,
            type,
            duration
        });
    }, []);

    const value = React.useMemo(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <PremiumToast ref={toastRef} />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
