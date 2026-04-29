import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Dimensions, Animated } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/design-system';
import dayjs from 'dayjs';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PremiumDateTimePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    mode?: 'date' | 'time' | 'datetime';
    initialDate?: Date;
    title?: string;
    minDate?: Date;
    maxDate?: Date;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

// Height of a single time picker item
const ITEM_HEIGHT = 50; 

export const PremiumDateTimePicker: React.FC<PremiumDateTimePickerProps> = ({ 
    visible, 
    onClose, 
    onSelect, 
    mode = 'datetime',
    initialDate = new Date(),
    title = 'Select Date & Time',
    minDate,
    maxDate
}) => {
    const [currentStep, setCurrentStep] = useState(mode === 'time' ? 'time' : 'date');
    const [selectedDate, setSelectedDate] = useState<string>(dayjs(initialDate).format('YYYY-MM-DD'));
    
    const [selectedHour, setSelectedHour] = useState(dayjs(initialDate).format('HH'));
    const [selectedMinute, setSelectedMinute] = useState(dayjs(initialDate).format('mm'));

    const hourListRef = useRef<FlatList>(null);
    const minuteListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (visible) {
            setCurrentStep(mode === 'time' ? 'time' : 'date');
            setSelectedDate(dayjs(initialDate).format('YYYY-MM-DD'));
            setSelectedHour(dayjs(initialDate).format('HH'));
            setSelectedMinute(dayjs(initialDate).format('mm'));
            
            // Scroll to initial time positions after slight delay
            if (mode === 'time' || mode === 'datetime') {
                setTimeout(() => {
                    const hIndex = HOURS.indexOf(dayjs(initialDate).format('HH'));
                    const mIndex = MINUTES.indexOf(dayjs(initialDate).format('mm'));
                    
                    hourListRef.current?.scrollToOffset({ offset: hIndex * ITEM_HEIGHT, animated: false });
                    minuteListRef.current?.scrollToOffset({ offset: mIndex * ITEM_HEIGHT, animated: false });
                }, 300);
            }
        }
    }, [visible, initialDate, mode]);

    const handleConfirm = () => {
        const datePart = currentStep === 'time' && mode === 'time' 
            ? dayjs().format('YYYY-MM-DD') 
            : selectedDate;
            
        const hour24 = parseInt(selectedHour, 10);
        const finalDate = dayjs(`${datePart} ${hour24}:${selectedMinute}`, 'YYYY-MM-DD H:m').toDate();
        
        // If mode is datetime and we are on date step, move to time step
        if (mode === 'datetime' && currentStep === 'date') {
            setCurrentStep('time');
            // ensure scrolls are set
            setTimeout(() => {
                const hIndex = HOURS.indexOf(selectedHour);
                const mIndex = MINUTES.indexOf(selectedMinute);
                hourListRef.current?.scrollToOffset({ offset: hIndex * ITEM_HEIGHT, animated: false });
                minuteListRef.current?.scrollToOffset({ offset: mIndex * ITEM_HEIGHT, animated: false });
            }, 100);
            return;
        }

        onSelect(finalDate);
        onClose();
    };

    const renderTimeScroller = (data: string[], selectedValue: string, onSelect: (val: string) => void, ref: React.RefObject<any>) => {
        return (
            <View style={styles.scrollerCol}>
                <FlatList
                    ref={ref}
                    data={data}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
                    keyExtractor={(item) => item}
                    onMomentumScrollEnd={(e) => {
                        const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                        if (data[index]) {
                            onSelect(data[index]);
                        }
                    }}
                    renderItem={({ item }) => {
                        const isSelected = item === selectedValue;
                        return (
                            <View style={styles.scrollerItem}>
                                <Text style={[
                                    styles.scrollerText, 
                                    isSelected && styles.scrollerTextSelected
                                ]}>
                                    {item}
                                </Text>
                            </View>
                        );
                    }}
                />
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <BlurView intensity={70} tint="dark" style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                
                <Animated.View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Content area */}
                    <View style={styles.body}>
                        {currentStep === 'date' && (
                            <Calendar
                                style={styles.calendarTheme}
                                theme={{
                                    backgroundColor: '#0A0B10',
                                    calendarBackground: '#0A0B10',
                                    textSectionTitleColor: '#6366F1',
                                    selectedDayBackgroundColor: COLORS.primary,
                                    selectedDayTextColor: '#ffffff',
                                    todayTextColor: '#EC4899',
                                    dayTextColor: '#FFFFFF',
                                    textDisabledColor: '#333333',
                                    dotColor: COLORS.primary,
                                    selectedDotColor: '#ffffff',
                                    arrowColor: COLORS.primary,
                                    monthTextColor: '#FFFFFF',
                                    textDayFontWeight: '600',
                                    textMonthFontWeight: 'bold',
                                    textDayHeaderFontWeight: 'bold',
                                }}
                                current={selectedDate}
                                minDate={minDate ? dayjs(minDate).format('YYYY-MM-DD') : undefined}
                                maxDate={maxDate ? dayjs(maxDate).format('YYYY-MM-DD') : undefined}
                                onDayPress={(day: any) => setSelectedDate(day.dateString)}
                                markedDates={{
                                    [selectedDate]: { selected: true, disableTouchEvent: true, selectedColor: COLORS.primary }
                                }}
                            />
                        )}

                        {currentStep === 'time' && (
                            <View style={styles.timePickerContainer}>
                                <View style={styles.timePickerBox}>
                                    <View style={styles.masterSelectionHighlight} pointerEvents="none" />
                                    {renderTimeScroller(HOURS, selectedHour, setSelectedHour, hourListRef)}
                                    <Text style={styles.colon}>:</Text>
                                    {renderTimeScroller(MINUTES, selectedMinute, setSelectedMinute, minuteListRef)}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Footer buttons */}
                    <View style={styles.footer}>
                        {(mode === 'datetime' && currentStep === 'time') && (
                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep('date')}>
                                <Text style={styles.secondaryBtnText}>Back to Date</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirm}>
                            <Text style={styles.primaryBtnText}>
                                {mode === 'datetime' && currentStep === 'date' ? 'Next: Select Time' : 'Confirm'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        backgroundColor: '#0A0B10',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        padding: SPACING.xl,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        minHeight: 300,
        justifyContent: 'center',
    },
    calendarTheme: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    // Time Picker Styles
    timePickerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timePickerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: ITEM_HEIGHT * 5,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: BORDER_RADIUS.xl,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        width: '100%',
    },
    scrollerCol: {
        width: 60,
        height: '100%',
        alignItems: 'center',
    },
    masterSelectionHighlight: {
        position: 'absolute',
        top: ITEM_HEIGHT * 2,
        left: 10,
        right: 10,
        height: ITEM_HEIGHT,
        backgroundColor: 'rgba(124, 77, 255, 0.25)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(124, 77, 255, 0.5)',
        zIndex: 0,
    },
    scrollerItem: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    scrollerText: {
        fontSize: 20,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.4)',
    },
    scrollerTextSelected: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    colon: {
        fontSize: 28,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 6,
        marginHorizontal: 10,
    },
    footer: {
        marginTop: 30,
        flexDirection: 'row',
        gap: 12,
    },
    primaryBtn: {
        flex: 1,
        height: 56,
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
    },
    primaryBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
    secondaryBtn: {
        flex: 1,
        height: 56,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
