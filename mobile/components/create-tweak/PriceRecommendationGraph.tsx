import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { themeColors } from '../../themes/colors';

const { width } = Dimensions.get('window');

interface PriceRecommendationGraphProps {
    currentPrice: number;
    recommendedPrice?: number;
    currencySymbol?: string;
    isGoodPrice?: boolean;
}

export default function PriceRecommendationGraph({
    currentPrice,
    recommendedPrice = 350,
    currencySymbol = '₹',
    isGoodPrice = false
}: PriceRecommendationGraphProps) {
    const graphWidth = width - 80;
    const graphHeight = 100;

    // Simple Bell Curve Path
    // Starts low, peaks at recommended price, goes low again
    // M=Move to, C=Cubic Bezier Curve
    const path = `
        M 0 ${graphHeight} 
        C ${graphWidth * 0.2} ${graphHeight}, 
          ${graphWidth * 0.3} ${graphHeight * 0.8}, 
          ${graphWidth * 0.4} ${graphHeight * 0.4}
        C ${graphWidth * 0.5} 0, 
          ${graphWidth * 0.6} 0, 
          ${graphWidth * 0.7} ${graphHeight * 0.4}
        C ${graphWidth * 0.8} ${graphHeight * 0.8}, 
          ${graphWidth * 0.9} ${graphHeight}, 
          ${graphWidth} ${graphHeight}
    `;

    // Calculate position for the "Current Price" marker
    // This is a simplified linear interpolation for visual feedback
    // Clamping position so it stays within graph bounds
    const maxPrice = recommendedPrice * 1.5;
    const minPrice = recommendedPrice * 0.5;

    const progress = Math.min(Math.max((currentPrice - minPrice) / (maxPrice - minPrice), 0), 1);

    // Map progress to the x-position on the graph (roughly aligning with the curve visual)
    const markerX = progress * (graphWidth * 0.6) + (graphWidth * 0.2);

    // Calculate Y based on X to stick to the curve (approximate for visual flair)
    // For now, we'll just pin it to a fixed relative height or bottom for simplicity
    // A full path interpolation is complex without a library like 'd3-shape' or 'react-native-redash'
    // So we will use a visual approximation: high at center (0.5), low at edges
    const markerY = graphHeight - (Math.sin(progress * Math.PI) * graphHeight * 0.9);

    const activeColor = isGoodPrice ? '#22c55e' : themeColors.primary; // Green if good, Orange/Primary if not

    return (
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 items-center">

            <Text className="text-gray-800 font-bold text-lg mb-6">
                Recommended Price your Tweak
            </Text>

            <Text className="text-3xl font-extrabold text-[#96c41e] mb-4">
                {currencySymbol}{recommendedPrice}
            </Text>

            <View style={{ width: graphWidth, height: graphHeight + 40 }} className="relative">
                {/* Current Price Marker Label logic could go here */}
                {currentPrice > 0 && (
                    <View
                        className="absolute z-20 items-center"
                        style={{
                            left: markerX - 25, // Center the label
                            top: markerY - 40   // Position above the marker point
                        }}
                    >
                        <Text className="text-yellow-600 font-bold text-lg">
                            {currencySymbol}{currentPrice}
                        </Text>
                    </View>
                )}

                <Svg height={graphHeight} width={graphWidth} style={{ overflow: 'visible' }}>
                    <Defs>
                        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor="#dbeafe" stopOpacity="0.3" />
                            <Stop offset="0.5" stopColor="#96c41e" stopOpacity="0.8" />
                            <Stop offset="1" stopColor="#dbeafe" stopOpacity="0.3" />
                        </LinearGradient>
                    </Defs>

                    {/* The Main Curve */}
                    <Path
                        d={path}
                        fill="url(#grad)"
                        stroke="#96c41e"
                        strokeWidth="2"
                    />

                    {/* Vertical Marker Line */}
                    {currentPrice > 0 && (
                        <Path
                            d={`M ${markerX} ${markerY} L ${markerX} ${graphHeight}`}
                            stroke={activeColor}
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                    )}

                    {/* Arrow Head on Marker */}
                    {currentPrice > 0 && (
                        <Path
                            d={`M ${markerX - 6} ${markerY + 10} L ${markerX} ${markerY} L ${markerX + 6} ${markerY + 10}`}
                            fill={activeColor}
                        />
                    )}

                </Svg>

                {/* X-Axis Labels (Tick Marks) */}
                <View className="flex-row justify-between w-full mt-2 opacity-50">
                    {[150, 250, 300, 400, 450, 500].map((val, idx) => (
                        <View key={idx} className="items-center" style={{ width: 20 }}>
                            <View className="h-2 w-[1px] bg-gray-400 mb-1" />
                            <Text className="text-[8px] text-gray-500">{val}</Text>
                        </View>
                    ))}
                </View>

                {/* Visual vertical bars background for 'histogram' effect */}
                <View className="absolute bottom-0 left-0 right-0 h-8 flex-row justify-between items-end -z-10 opacity-20">
                    {Array.from({ length: 30 }).map((_, i) => (
                        <View
                            key={i}
                            className="w-[2px] bg-black rounded-t-sm"
                            style={{ height: Math.random() * 20 + 5 }}
                        />
                    ))}
                </View>
            </View>

            <Text className="text-center text-xs text-gray-500 mt-6 px-4">
                Our analytics show that similar Tweaks near your area have better chance of getting filled at
                <Text className="font-bold text-[#22c55e]"> {currencySymbol}{recommendedPrice}</Text>
            </Text>

            {/* "Use Recommended Price" Button */}
            {!isGoodPrice && (
                <View className="mt-4 w-full px-4">
                    <View className="bg-[#10b981] rounded-full py-2 items-center">
                        <Text className="text-white font-bold text-sm">Use Recommended Price</Text>
                    </View>
                </View>
            )}
        </View>
    );
}
