
export const userApi = {
    // 9. Get the user data
    getUser: async (id: number | string) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            id: id,
            name: 'Test User',
            email: 'test@example.com',
            mobileNumber: '0000000000',
            profilePicture: 'https://via.placeholder.com/150',
            // Add other fields as expected by the app
        };
    },

    // To update the user data
    updateUser: async (id: number | string, data: any) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            success: true,
            message: 'User updated successfully',
            data: { ...data, id }
        };
    }
};
