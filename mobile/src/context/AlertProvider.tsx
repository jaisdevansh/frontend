import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
import { CustomAlert, AlertButton } from '../components/CustomAlert';

interface AlertContextData {
    showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextData>({} as AlertContextData);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [config, setConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        buttons?: AlertButton[];
    }>({
        visible: false,
        title: '',
        message: '',
    });

    const showAlert = (title: string, message: string, buttons?: AlertButton[]) => {
        setConfig({
            visible: true,
            title,
            message,
            buttons,
        });
    };

    const hideAlert = () => {
        setConfig(prev => ({ ...prev, visible: false }));
    };

    // 🚀 Monkey-Patch Global Alert
    useEffect(() => {
        const originalAlert = Alert.alert;
        Alert.alert = (title: string, message?: string, buttons?: any[]) => {
            const parsedButtons = buttons?.map(b => ({
                text: b.text || 'OK',
                onPress: b.onPress,
                style: b.style
            }));
            showAlert(title, message || '', parsedButtons);
        };
        return () => {
            Alert.alert = originalAlert;
        };
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            <CustomAlert
                visible={config.visible}
                title={config.title}
                message={config.message}
                buttons={config.buttons}
                onClose={hideAlert}
            />
        </AlertContext.Provider>
    );
};

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};
