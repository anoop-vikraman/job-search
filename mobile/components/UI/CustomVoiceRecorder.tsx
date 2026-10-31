import { Entypo, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
    Platform,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useConfirmationStore } from '../../store/useConfirmationStore';
import { themeColors } from '../../themes/colors';

interface Props {
    uri: string | null;
    onRecordingComplete: (uri: string | null) => void;
    label?: string;
}

export default function CustomVoiceRecorder({ uri, onRecordingComplete, label = 'Tap and hold to record' }: Props) {
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(recorder, 100);
    const confirm = useConfirmationStore(state => state.confirm);

    const player = useAudioPlayer(uri);
    const playerStatus = useAudioPlayerStatus(player);

    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording_held' | 'recording_locked' | 'recorded' | 'playing' | 'paused'>('idle');
    const recordingStatusRef = useRef<'idle' | 'recording_held' | 'recording_locked' | 'recorded' | 'playing' | 'paused'>('idle');
    const [durationStr, setDurationStr] = useState('00:00');
    const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
    const isInteractionActive = useRef(false);
    const hasRecorderStarted = useRef(false);
    const wasCancelled = useRef(false);
    const recordingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const updateStatus = (status: typeof recordingStatus) => {
        setRecordingStatus(status);
        recordingStatusRef.current = status;
    };

    // Shared Values for Gestures
    const micScale = useSharedValue(1);
    const micTransY = useSharedValue(0);
    const lockOpacity = useSharedValue(0);
    const lockTransY = useSharedValue(50);
    const cancelProgress = useSharedValue(0); // 0 to 1 for cancel animation
    const deleteIconScale = useSharedValue(0);
    const isLocked = useSharedValue(0);

    // Sync internal status
    useEffect(() => {
        if (!uri && !['recording_held', 'recording_locked'].includes(recordingStatus)) {
            updateStatus('idle');
            setMeteringData([]);
        } else if (uri && recordingStatus === 'idle') {
            updateStatus('recorded');
        }
    }, [uri]);

    // --- Recording Logic ---

    const startRecording = async () => {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
            confirm({
                title: 'Permission Required',
                message: 'Microphone permission is needed to record audio.',
                variant: 'danger',
                confirmLabel: 'OK'
            });
            return;
        }

        try {
            await recorder.prepareToRecordAsync();
        } catch (e) {
            // ignore if already prepared
        }

        setMeteringData([]);
        recorder.record();
        hasRecorderStarted.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handlePressStart = () => {
        hasRecorderStarted.current = false;
        wasCancelled.current = false;

        // Delay recording start to ensure it's not just a tap
        recordingTimeout.current = setTimeout(() => {
            if (!wasCancelled.current) {
                updateStatus('recording_held');
                setRecordingStartTime(Date.now());
                startRecording();
                recordingTimeout.current = null;
            }
        }, 500);
    };

    const handleGestureEnd = (shouldKeepRecording: boolean) => {
        // If we locked it, keep recording
        if (shouldKeepRecording) return;

        // If we already cancelled (e.g. valid slide to cancel), do nothing
        if (wasCancelled.current) return;

        if (recordingTimeout.current) {
            // If timeout still exists, it means we didn't hold long enough (Tap)
            cancelRecording();
        } else {
            // Recording actually started
            const duration = recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : 0;
            if (duration < 1) {
                cancelRecording();
                showShortRecordingToast();
            } else {
                stopRecording();
            }
        }
    };

    const stopRecording = async () => {
        // Wait briefly for recorder to start if needed
        let waitCount = 0;
        while (!hasRecorderStarted.current && waitCount < 10) {
            await new Promise(resolve => setTimeout(resolve, 50));
            waitCount++;
        }

        try {
            if (recorder.isRecording) {
                await recorder.stop();

                if (recorder.uri) {
                    onRecordingComplete(recorder.uri);
                    updateStatus('recorded');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    // No URI means recording failed
                    onRecordingComplete(null);
                    updateStatus('idle');
                }
            } else {
                // Recorder wasn't recording, cancel
                onRecordingComplete(null);
                updateStatus('idle');
            }

            setRecordingStartTime(null);
            hasRecorderStarted.current = false;
            wasCancelled.current = false;

            // Reset all animation values
            micScale.value = withSpring(1);
            micTransY.value = withSpring(0);
            lockOpacity.value = withTiming(0);
            lockTransY.value = withSpring(50);
            cancelProgress.value = withTiming(0);
            deleteIconScale.value = withTiming(0);
            isLocked.value = 0;
        } catch (err) {
            console.error('Failed to stop recording:', err);
            onRecordingComplete(null);
            updateStatus('idle');
            setRecordingStartTime(null);
            hasRecorderStarted.current = false;
            wasCancelled.current = false;
        }
    };

    const cancelRecording = async () => {
        wasCancelled.current = true;

        // Clear the recording timeout if it hasn't started yet
        if (recordingTimeout.current) {
            clearTimeout(recordingTimeout.current);
            recordingTimeout.current = null;
        }

        try {
            if (recorder.isRecording) {
                await recorder.stop();
            }
            onRecordingComplete(null);
            updateStatus('idle');
            setMeteringData([]);
            setRecordingStartTime(null);
            hasRecorderStarted.current = false;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

            // Reset all animation values
            micScale.value = withSpring(1);
            micTransY.value = withSpring(0);
            lockOpacity.value = withTiming(0);
            lockTransY.value = withSpring(50);
            cancelProgress.value = withTiming(0);
            deleteIconScale.value = withTiming(0);
            isLocked.value = 0;
        } catch (err) {
            console.error('Failed to cancel recording:', err);
            updateStatus('idle');
            setRecordingStartTime(null);
            hasRecorderStarted.current = false;
        }
    };

    const lockRecording = () => {
        // If locking happens before the delay, start recording immediately
        if (recordingTimeout.current) {
            clearTimeout(recordingTimeout.current);
            recordingTimeout.current = null;
            if (!hasRecorderStarted.current) {
                setRecordingStartTime(Date.now());
                startRecording();
            }
        }
        updateStatus('recording_locked');
        isLocked.value = 1;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

    const showShortRecordingToast = () => {
        if (Platform.OS === 'android') {
            ToastAndroid.show('Recording must be at least 1 second', ToastAndroid.SHORT);
        } else {
            confirm({
                title: 'Recording Too Short',
                message: 'Recording must be at least 1 second.',
                variant: 'warning',
                confirmLabel: 'OK'
            });
        }
    };

    // --- Gesture Handling ---

    const gesture = Gesture.Pan()
        .minDistance(0)
        .onBegin(() => {
            isLocked.value = 0; // Reset lock state
            runOnJS(handlePressStart)();
            micScale.value = withSpring(1.3, { damping: 15 });
            lockOpacity.value = withTiming(1, { duration: 200 });
            lockTransY.value = withSpring(0, { damping: 15 });
        })
        .onUpdate((e) => {
            // Only allow vertical movement for locking
            if (e.translationY < 0) {
                micTransY.value = Math.max(-120, e.translationY);
            }

            // Calculate cancel progress based on horizontal drag
            const cancelThreshold = -120;
            if (e.translationX < 0 && isLocked.value === 0) {
                cancelProgress.value = Math.min(1, Math.abs(e.translationX) / Math.abs(cancelThreshold));
                deleteIconScale.value = interpolate(
                    cancelProgress.value,
                    [0, 0.5, 1],
                    [0, 1.2, 1],
                    Extrapolation.CLAMP
                );
            }

            // Cancel threshold (slide left)
            if (e.translationX < cancelThreshold && isLocked.value === 0) {
                runOnJS(cancelRecording)();
            }

            // Lock threshold (slide up)
            if (e.translationY < -80 && isLocked.value === 0) {
                runOnJS(lockRecording)();
            }
        })
        .onEnd(() => {
            // Logic moved to onFinalize to ensure it runs even for Taps
        })
        .onFinalize(() => {
            const locked = isLocked.value === 1;
            runOnJS(handleGestureEnd)(locked);

            micScale.value = withSpring(1);
            micTransY.value = withSpring(0);
            lockOpacity.value = withTiming(0);
            lockTransY.value = withSpring(50);
            cancelProgress.value = withTiming(0);
            deleteIconScale.value = withTiming(0);
            if (isLocked.value === 1) {
                isLocked.value = 0;
            }
        });

    // Animated Styles
    const micAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: micScale.value },
            { translateY: micTransY.value }
        ]
    }));

    const lockAnimatedStyle = useAnimatedStyle(() => ({
        opacity: lockOpacity.value,
        transform: [{ translateY: lockTransY.value }]
    }));

    const cancelAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            cancelProgress.value,
            [0, 1],
            [1, 0],
            Extrapolation.CLAMP
        )
    }));

    const containerAnimatedStyle = useAnimatedStyle(() => {
        const progress = cancelProgress.value;
        const alpha = interpolate(progress, [0, 1], [0, 0.2], Extrapolation.CLAMP);

        return {
            backgroundColor: `rgba(239, 68, 68, ${alpha})`
        };
    });

    const deleteIconAnimatedStyle = useAnimatedStyle(() => ({
        opacity: cancelProgress.value,
        transform: [{ scale: deleteIconScale.value }]
    }));

    // --- Other Functionality (Timer, Playback) ---

    // Metering
    const [meteringData, setMeteringData] = useState<number[]>([]);
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (recordingStatus === 'recording_held' || recordingStatus === 'recording_locked') {
            interval = setInterval(() => {
                setMeteringData((prev) => {
                    const newLevel = Math.random() * 0.8 + 0.2;
                    const newHistory = [...prev, newLevel];
                    if (newHistory.length > 40) newHistory.shift();
                    return newHistory;
                });
            }, 80);
        } else if (recordingStatus === 'idle') {
            setMeteringData([]);
        }
        return () => clearInterval(interval);
    }, [recordingStatus]);

    // Timer Text
    useEffect(() => {
        const updateTimer = () => {
            let seconds = 0;
            if (recordingStatus === 'recording_held' || recordingStatus === 'recording_locked') {
                // Use recorder duration if available, otherwise calculate from start time
                if (recorderState.durationMillis > 0) {
                    seconds = Math.floor(recorderState.durationMillis / 1000);
                } else if (recordingStartTime) {
                    seconds = Math.floor((Date.now() - recordingStartTime) / 1000);
                }
            } else if (['playing', 'paused', 'recorded'].includes(recordingStatus)) {
                seconds = Math.floor((recordingStatus === 'playing' || recordingStatus === 'paused' ? playerStatus.currentTime : playerStatus.duration));
            }
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            setDurationStr(`${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`);
        };

        updateTimer(); // Initial update

        // Update timer continuously during recording
        let interval: ReturnType<typeof setInterval> | undefined;
        if (recordingStatus === 'recording_held' || recordingStatus === 'recording_locked') {
            interval = setInterval(updateTimer, 100);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [recorderState.durationMillis, playerStatus.currentTime, recordingStatus, recordingStartTime]);

    // Playback Finish
    useEffect(() => {
        if (playerStatus.didJustFinish && recordingStatus === 'playing') {
            player.pause();
            updateStatus('recorded');
            player.seekTo(0);
        }
    }, [playerStatus.didJustFinish, recordingStatus]);

    const togglePlayback = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (playerStatus.playing) {
            player.pause();
            updateStatus('paused');
        } else {
            player.play();
            updateStatus('playing');
        }
    };

    const confirmDelete = () => {
        confirm({
            title: 'Delete Recording?',
            message: 'Are you sure you want to delete this voice note?',
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onRecordingComplete(null);
                updateStatus('idle');
            }
        });
    };

    // Render Helpers
    const renderWaveform = (activeColor: string, inactiveColor: string, isRecording: boolean = false) => {
        let displayData = meteringData.length > 0 ? meteringData : new Array(40).fill(0.2);
        const progressPercent = (playerStatus.duration > 0) ? (playerStatus.currentTime / playerStatus.duration) : 0;
        const activeIndex = Math.floor(progressPercent * displayData.length);

        return (
            <View className="flex-row items-center h-6 gap-[2px] flex-1">
                {displayData.map((level, index) => (
                    <View
                        key={index}
                        style={{
                            width: 2,
                            height: Math.max(4, level * 24),
                            borderRadius: 1,
                            backgroundColor: isRecording || index <= activeIndex ? activeColor : inactiveColor,
                        }}
                    />
                ))}
            </View>
        );
    };

    const blinkAnim = useSharedValue(1);
    useEffect(() => {
        if (recordingStatus === 'recording_held' || recordingStatus === 'recording_locked') {
            blinkAnim.value = withRepeat(
                withSequence(
                    withTiming(0.3, { duration: 600 }),
                    withTiming(1, { duration: 600 })
                ),
                -1,
                true
            );
        } else {
            blinkAnim.value = 1;
        }
    }, [recordingStatus]);
    const blinkStyle = useAnimatedStyle(() => ({ opacity: blinkAnim.value }));

    // --- UI Renders ---

    const isRecorded = recordingStatus === 'recorded' || recordingStatus === 'playing' || recordingStatus === 'paused';
    const isRecordingHeld = recordingStatus === 'recording_held';
    const isRecordingLocked = recordingStatus === 'recording_locked';
    const isRecording = isRecordingHeld || isRecordingLocked;

    // Recorded State
    if (isRecorded) {
        return (
            <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-2 py-2 gap-2 min-h-[56px]">
                {/* Delete Button */}
                <TouchableOpacity onPress={confirmDelete} className="p-2" accessibilityRole="button" accessibilityLabel="Delete recording">
                    <MaterialCommunityIcons name="delete-outline" size={24} color="#6B7280" />
                </TouchableOpacity>

                {/* Playback Controls */}
                <TouchableOpacity onPress={togglePlayback} className="p-2" accessibilityRole="button" accessibilityLabel={playerStatus.playing ? "Pause audio" : "Play audio"}>
                    <Ionicons
                        name={playerStatus.playing ? "pause" : "play"}
                        size={20}
                        color={themeColors.primary}
                    />
                </TouchableOpacity>

                {/* Waveform */}
                <View className="flex-1">
                    {renderWaveform(themeColors.primary, '#D1D5DB', false)}
                </View>

                {/* Timer */}
                <Text className="text-xs text-gray-500 font-mono mr-2">{durationStr}</Text>


            </View>
        );
    }

    // Recording Locked State
    if (isRecordingLocked) {
        return (
            <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-2 py-2 gap-2 min-h-[56px]">
                {/* Red Mic Icon */}
                <View className="w-10 h-10 bg-red-100 rounded-full justify-center items-center">
                    <Animated.View style={blinkStyle}>
                        <Ionicons name="mic" size={20} color="#EF4444" />
                    </Animated.View>
                </View>

                {/* Timer */}
                <Text className="text-sm text-gray-900 font-mono font-bold">{durationStr}</Text>

                {/* Waveform */}
                <View className="flex-1 mx-2">
                    {renderWaveform('#EF4444', '#FCA5A5', true)}
                </View>

                {/* Delete Button */}
                <TouchableOpacity onPress={cancelRecording} className="p-2" accessibilityRole="button" accessibilityLabel="Delete recording">
                    <MaterialCommunityIcons name="delete-outline" size={24} color="#EF4444" />
                </TouchableOpacity>

                {/* Stop Button */}
                <TouchableOpacity
                    onPress={stopRecording}
                    className="w-12 h-12 rounded-full justify-center items-center"
                    style={{ backgroundColor: themeColors.primary }}
                    accessibilityRole="button"
                    accessibilityLabel="Stop recording"
                >
                    <FontAwesome5 name="stop" size={16} color="white" />
                </TouchableOpacity>
            </View>
        );
    }

    // Idle or Recording Held State (Unified to preserve gesture)
    return (
        <View className="relative">
            <Animated.View
                style={[containerAnimatedStyle]}
                className="flex-row items-center border border-gray-200 rounded-2xl px-3 py-2 min-h-[56px]"
            >
                {/* Left Side - Timer when recording, placeholder when idle */}
                {isRecordingHeld ? (
                    <View className="flex-row items-center gap-2">
                        <Animated.View
                            style={[blinkStyle, {
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: '#EF4444'
                            }]}
                        />
                        <Text className="text-sm text-gray-900 font-mono font-bold">{durationStr}</Text>
                    </View>
                ) : null}

                {/* Center - Slide to cancel text and delete icon */}
                {isRecordingHeld && (
                    <View className="flex-1 flex-row items-center justify-center">
                        <Animated.View
                            style={[cancelAnimatedStyle]}
                            className="flex-row items-center gap-1"
                        >
                            <Entypo name="chevron-left" size={20} color="#9CA3AF" />
                            <Text className="text-gray-400 text-sm">Slide to cancel</Text>
                        </Animated.View>

                        {/* Delete Icon appears as user slides */}
                        <Animated.View
                            style={[deleteIconAnimatedStyle, { position: 'absolute' }]}
                        >
                            <MaterialCommunityIcons name="delete" size={28} color="#EF4444" />
                        </Animated.View>
                    </View>
                )}

                {/* Placeholder text when idle */}
                {!isRecordingHeld && (
                    <Text className="text-gray-400 text-sm flex-1 ml-2">
                        Press and hold to record
                    </Text>
                )}

                {/* Right Side - Mic Button with Gesture */}
                <GestureDetector gesture={gesture}>
                    <Animated.View
                        style={[micAnimatedStyle]}
                        className="w-12 h-12 rounded-full justify-center items-center"
                        pointerEvents="box-only"
                    >
                        <View
                            className="w-full h-full rounded-full justify-center items-center"
                            style={{ backgroundColor: themeColors.primary }}
                        >
                            <Ionicons name="mic" size={20} color="white" />
                        </View>
                    </Animated.View>
                </GestureDetector>
            </Animated.View>

            {/* Lock Indicator - Positioned above mic button */}
            {isRecordingHeld && (
                <Animated.View
                    style={[
                        lockAnimatedStyle,
                        {
                            position: 'absolute',
                            right: 16,
                            bottom: 60,
                            alignItems: 'center',
                            zIndex: 10
                        }
                    ]}
                    pointerEvents="none"
                >
                    <View className="bg-white p-2 rounded-full shadow-lg border border-gray-200 mb-1">
                        <MaterialCommunityIcons name="lock-open-outline" size={20} color="#374151" />
                    </View>
                    <Entypo name="chevron-up" size={18} color="#9CA3AF" />
                </Animated.View>
            )}
        </View>
    );
}
