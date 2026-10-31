import api from '../utils/api';

export interface UserProfile {
    id: string;
    first_name: string;
    last_name?: string;
    email?: string;
    phone_number: string;
    country_code: string;
    date_of_birth?: string;
    gender?: string;
    bio?: string;
    profile_picture_url?: string;
    skills: string[];
    completed_categories: string[];
    rating_avg: number;
    rating_count: number;
}

export interface UpdateUserRequest {
    first_name?: string;
    last_name?: string;
    email?: string;
    date_of_birth?: string;
    gender?: string;
    bio?: string;
    profile_picture_url?: string;
    skills?: string[];
}

export const userApi = {
    getMe: async (): Promise<UserProfile> => {
        const res = await api.get('/api/v1/users/me');
        return res.data;
    },

    updateMe: async (data: UpdateUserRequest): Promise<UserProfile> => {
        const res = await api.patch('/api/v1/users/me', data);
        return res.data;
    },
};
