import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    checkConnection: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
    isConnected: true, // Assume connected initially
    isInternetReachable: true,

    checkConnection: () => {
        NetInfo.fetch().then(state => {
            set({
                isConnected: state.isConnected,
                isInternetReachable: state.isInternetReachable
            });
        });
    }
}));

// Initialize Listener
NetInfo.addEventListener(state => {
    useNetworkStore.setState({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable
    });
});
