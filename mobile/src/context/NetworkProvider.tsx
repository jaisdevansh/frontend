import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import OfflineScreen from '../components/OfflineScreen';

interface NetworkContextType {
    isConnected: boolean;
    isInternetReachable: boolean;
    checkConnection: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState<boolean>(true);
    const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);
    const [showOffline, setShowOffline] = useState<boolean>(false);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = !!state.isConnected;
            const reachable = !!state.isInternetReachable;
            
            setIsConnected(connected);
            setIsInternetReachable(reachable);
            
            // Show offline screen if NO CONNECTION or NO INTERNET REACHABLE
            // Using a slight delay to avoid flicker on quick switches
            if (!connected || (state.isInternetReachable === false)) {
                setShowOffline(true);
            } else {
                setShowOffline(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const checkConnection = async () => {
        const state = await NetInfo.refresh();
        const connected = !!state.isConnected;
        const reachable = !!state.isInternetReachable;
        
        setIsConnected(connected);
        setIsInternetReachable(reachable);
        
        if (connected && reachable) {
            setShowOffline(false);
        } else {
            setShowOffline(true);
        }
    };

    return (
        <NetworkContext.Provider value={{ isConnected, isInternetReachable, checkConnection }}>
            {children}
            <OfflineScreen 
                isVisible={showOffline} 
                onRetry={checkConnection} 
            />
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
};
