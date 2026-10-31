export interface Address {
    id: string; // Unique ID for list keys
    formattedAddress: string;
    latitude: number;
    longitude: number;
    saveAs: string; // Home, Work, etc.
    contactName: string;
    houseNo: string;
    area: string;
    directions?: string;
    phoneNumber?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface LocationAddressModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    formattedAddress: string;
    latitude: number;
    longitude: number;
    initialArea?: string;
    initialCity?: string;
    initialState?: string;
    initialPincode?: string;
    initialHouseNo?: string;
    initialPhoneNumber?: string;
    initialContactName?: string;
    initialSaveAs?: string;
}

export interface SavedAddressesListProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (address: Address) => void;
    currentAddressId?: string;
}

export interface AddressCardProps {
    address: Address;
    selected?: boolean;
    onPress?: () => void;
    onMenuPress?: () => void;
    showMenuOption?: boolean;
    isMenuOpen?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

export interface LocationSearchHeaderProps {
    onSearch: (query: string) => void;
}
