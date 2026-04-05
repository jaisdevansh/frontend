import apiClient from './apiClient';

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        name: string;
        email: string;
        role: string;
        hostId?: string | null;
        profileImage: string;
        onboardingCompleted?: boolean;
        staffRole?: string;
        accessToken: string;
        refreshToken: string;
    }
}

export const authService = {
    sendOtp: async (identifier: string) => {
        const response = await apiClient.post('/auth/send-otp', { identifier });
        return response.data;
    },

    verifyOtp: async (identifier: string, otp: string): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>('/auth/verify-otp', { identifier, otp });
        return response.data;
    },

    completeOnboarding: async (data: { name: string, username: string, gender: string, profileImage?: string }) => {
        const response = await apiClient.post('/auth/onboarding', data);
        return response.data;
    },

    register: async (data: any) => {
        const response = await apiClient.post('/auth/register', data);
        return response.data;
    },

    logout: async () => {
        const response = await apiClient.post('/auth/logout');
        return response.data;
    },

    forgotPassword: async (email: string) => {
        const response = await apiClient.post('/auth/forgot-password', { email });
        return response.data;
    },

    googleLogin: async (accessToken: string): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>('/auth/google', { access_token: accessToken });
        return response.data;
    },
};

