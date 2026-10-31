import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import LocationAddressModal from '../../components/Location/LocationAddressModal';
import LocationConfirmSheet from '../../components/Location/LocationConfirmSheet';
import LocationCurrentButton from '../../components/Location/LocationCurrentButton';
import LocationSearchHeader from '../../components/Location/LocationSearchHeader';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { themeColors } from '../../themes/colors';

const { width, height } = Dimensions.get('window');

import { useAppStore } from '../../store/useAppStore';

export default function SelectLocation() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { addAddress, updateAddress } = useAppStore(); // Verify store usage

    // Check if we are editing
    const editAddressStr = params.editAddress as string;
    const editAddress = editAddressStr ? JSON.parse(editAddressStr) : null;
    const mapRef = React.useRef<MapView>(null);
    const [region] = useState(() => {
        if (editAddress) {
            return {
                latitude: editAddress.latitude,
                longitude: editAddress.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
        }
        return {
            latitude: 12.9716, // Default Bangalore or similar
            longitude: 77.5946,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    });
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [location, setLocation] = useState<any>(editAddress ? { latitude: editAddress.latitude, longitude: editAddress.longitude } : null);
    const [formattedAddress, setFormattedAddress] = useState(editAddress?.formattedAddress || '');
    const [area, setArea] = useState(editAddress?.area || '');
    const [city, setCity] = useState(editAddress?.city || '');
    const [state, setState] = useState(editAddress?.state || '');
    const [pincode, setPincode] = useState(editAddress?.pincode || '');
    const [houseNo, setHouseNo] = useState(editAddress?.houseNo || '');
    const [phoneNumber, setPhoneNumber] = useState(editAddress?.phoneNumber || '');
    const [contactName, setContactName] = useState(editAddress?.contactName || '');
    const [saveAs, setSaveAs] = useState(editAddress?.saveAs || 'Home');
    const [mapType, setMapType] = useState<'standard' | 'muted'>('muted'); // Default to muted (minimal)

    // Example Minimal Style based on standard JSON styles (often SnazzyMaps style)
    // Adjust colors to match app theme (Primary: #YourPrimaryColor)
    const minimalistStyle = [
        {
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#f5f5f5"
                }
            ]
        },
        {
            "elementType": "labels.icon",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#1c16d3"
                }
            ]
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [
                {
                    "color": "#f5f5f5"
                }
            ]
        },
        {
            "featureType": "administrative.land_parcel",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#bdbdbd"
                }
            ]
        },
        {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#eeeeee"
                }
            ]
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#757575"
                }
            ]
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#e5e5e5"
                }
            ]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#9e9e9e"
                }
            ]
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#ffffff"
                }
            ]
        },
        {
            "featureType": "road.arterial",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#757575"
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#dadada"
                }
            ]
        },
        {
            "featureType": "road.local",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#9e9e9e"
                }
            ]
        },
        {
            "featureType": "transit.line",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#e5e5e5"
                }
            ]
        },
        {
            "featureType": "transit.station",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#eeeeee"
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#c9c9c9"
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#9e9e9e"
                }
            ]
        }
    ];

    const toggleMapType = () => {
        setMapType(prev => prev === 'standard' ? 'muted' : 'standard');
    };

    const fetchAddress = async (lat: number, lon: number) => {
        // if (showAddressModal) return; // Allow fetching in background or if moved
        try {
            const result = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lon
            });
            if (result.length > 0) {
                const addr = result[0];

                // Remove Plus Codes (e.g., FWVX+4RW) and redundant names
                const isPlusCode = (str: string | null) => str && /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}/.test(str);

                const cleanName = isPlusCode(addr.name) ? null : addr.name;

                const parts = [
                    cleanName,
                    addr.street,
                    addr.district || addr.subregion,
                    addr.city,
                    addr.region,
                    addr.postalCode
                ].filter(Boolean);

                // Deduplicate parts to avoid "Road Name, Road Name"
                const uniqueParts: string[] = [];
                const seen = new Set();
                parts.forEach(p => {
                    const normalized = p?.toLowerCase().trim();
                    if (normalized && !seen.has(normalized)) {
                        uniqueParts.push(p!.trim());
                        seen.add(normalized);
                    }
                });

                const fullAddress = uniqueParts.join(', ');

                if (fullAddress === formattedAddress) return;
                setFormattedAddress(fullAddress);

                // Extract specific fields
                setArea(addr.district || addr.subregion || cleanName || '');
                setCity(addr.city || addr.subregion || '');
                setState(addr.region || '');
                setPincode(addr.postalCode || '');
            }
        } catch (error) {
            console.warn("Reverse Geocode failed", error);
        }
    };

    const handleSearch = async (query: string) => {
        if (!query.trim()) return;
        try {
            const results = await Location.geocodeAsync(query);
            if (results.length > 0) {
                const { latitude, longitude } = results[0];
                const newRegion = {
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                mapRef.current?.animateToRegion(newRegion, 1000);
                setLocation({ latitude, longitude });
                fetchAddress(latitude, longitude);
            }
        } catch (error) {
            console.warn("Search failed", error);
        }
    };

    useEffect(() => {
        (async () => {
            // Already handled by getCurrentLocation called logic or initial check
            // We want to force current location on open unless editing
            if (!params.editAddress) {
                getCurrentLocation();
            }
        })();
    }, []);

    useEffect(() => {
        if (editAddress && mapRef.current) {
            // Only animate if the address changed from what we currently have
            // This avoids double-jump on mount
            const region = {
                latitude: editAddress.latitude,
                longitude: editAddress.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
            mapRef.current.animateToRegion(region, 1000);

            // Sync all fields (in case they weren't caught by initial state)
            setLocation({ latitude: editAddress.latitude, longitude: editAddress.longitude });
            setFormattedAddress(editAddress.formattedAddress);
            setArea(editAddress.area || '');
            setCity(editAddress.city || '');
            setState(editAddress.state || '');
            setPincode(editAddress.pincode || '');
            setHouseNo(editAddress.houseNo || '');
            setPhoneNumber(editAddress.phoneNumber || '');
            setContactName(editAddress.contactName || '');
            setSaveAs(editAddress.saveAs || 'Home');
        }
    }, [editAddressStr]);


    const handleSaveAddress = (data: any) => {
        if (editAddress) {
            const updated = { ...editAddress, ...data };
            updateAddress(editAddress.id, updated);
        } else {
            const newAddress = {
                id: Date.now().toString(),
                ...data,
            };
            addAddress(newAddress);
        }

        router.back();
    };

    const getCurrentLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Try to get cached location first for speed
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && !editAddress) {
            const snapRegion = {
                latitude: lastKnown.coords.latitude,
                longitude: lastKnown.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
            mapRef.current?.animateToRegion(snapRegion, 1000);
            setLocation(lastKnown.coords);
            fetchAddress(lastKnown.coords.latitude, lastKnown.coords.longitude);
        }

        try {
            let currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const newRegion = {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
            mapRef.current?.animateToRegion(newRegion, 1000);
            setLocation(currentLocation.coords);
            fetchAddress(currentLocation.coords.latitude, currentLocation.coords.longitude);
        } catch (error) {
            console.warn("Fresh location fetch failed", error);
        }
    };

    return (
        <ScreenWrapper scrollable={false} edges={['left', 'right']}>
            <View className="flex-1 bg-white">
                <LocationSearchHeader onSearch={handleSearch} />

                <MapView
                    ref={mapRef}
                    style={{ width: width, height: height }}
                    initialRegion={region}
                    customMapStyle={mapType === 'muted' ? minimalistStyle : []}
                    provider={PROVIDER_DEFAULT}
                    onRegionChangeComplete={(r) => {
                        setLocation({ latitude: r.latitude, longitude: r.longitude });
                        fetchAddress(r.latitude, r.longitude);
                    }}
                />

                {/* Modern Precision Crosshair for Exact Selection */}
                <View
                    pointerEvents="none"
                    className="absolute items-center justify-center"
                    style={{
                        top: height / 2 - 25,
                        left: width / 2 - 25,
                        width: 50,
                        height: 50,
                        zIndex: 20
                    }}
                >
                    {/* The Target Ring */}
                    <View className="w-8 h-8 rounded-full border-2 border-primary/40 items-center justify-center">
                        <View className="w-1.5 h-1.5 bg-primary rounded-full" />
                    </View>

                    {/* The Crosshair Lines */}
                    <View className="absolute w-6 h-[1.5px] bg-primary/60" />
                    <View className="absolute w-[1.5px] h-6 bg-primary/60" />

                    {/* Shadow pulse for depth */}
                    <View className="w-1 h-1 bg-black/10 rounded-full mt-[2px]" />
                </View>

                {/* Map Type Toggle */}
                <View className="absolute top-[120px] right-4 z-10">
                    <TouchableOpacity
                        onPress={toggleMapType}
                        className="bg-white p-2 rounded-xl shadow-md border border-gray-100 items-center justify-center min-w-[50px]"
                    >
                        <Ionicons
                            name={mapType === 'standard' ? 'map' : 'contrast'}
                            size={22}
                            color={themeColors.primary}
                        />
                        <Text className="text-[8px] font-bold text-primary uppercase mt-1">
                            {mapType === 'muted' ? 'Minimal' : 'Normal'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <LocationCurrentButton
                    onPress={getCurrentLocation}
                    visible={!showAddressModal}
                    bottomOffset={280} // Lowered slightly, still above the shelf
                />

                <LocationConfirmSheet
                    visible={!showAddressModal}
                    formattedAddress={formattedAddress}
                    latitude={location?.latitude || region.latitude}
                    longitude={location?.longitude || region.longitude}
                    onConfirm={() => setShowAddressModal(true)}
                />

                <LocationAddressModal
                    visible={showAddressModal}
                    onClose={() => setShowAddressModal(false)}
                    onSave={handleSaveAddress}
                    formattedAddress={formattedAddress}
                    latitude={location?.latitude || region.latitude}
                    longitude={location?.longitude || region.longitude}
                    initialArea={area}
                    initialCity={city}
                    initialState={state}
                    initialPincode={pincode}
                    initialHouseNo={houseNo}
                    initialPhoneNumber={phoneNumber}
                    initialContactName={contactName}
                    initialSaveAs={saveAs}
                />
            </View>
        </ScreenWrapper>
    );
}
