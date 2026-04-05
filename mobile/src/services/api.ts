import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { DeviceEventEmitter } from 'react-native';

import { API_BASE_URL } from './apiClient';

export { API_BASE_URL };

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    async (config) => {
        try {
            const authStr = await AsyncStorage.getItem('auth');
            if (authStr) {
                const { token } = JSON.parse(authStr);
                if (token) config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {}
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await AsyncStorage.removeItem('auth');
            DeviceEventEmitter.emit('SESSION_EXPIRED');
        }
        return Promise.reject(error);
    }
);

export default api;
