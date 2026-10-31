import { Address } from './location';

export type SchedulingType = 'oneDay' | 'flexible' | 'fixed';
export type TimeSlot = 'anytime' | 'before6pm' | 'after6pm';

export type PricingType = 'fixed' | 'quantity' | 'duration';
export type DurationTab = 'hourly' | 'daily';

/** A picked image (local URI or remote URL) attached to a tweak. */
export interface TweakImage {
    uri: string;
    width?: number;
    height?: number;
    isThumbnail?: boolean;
}

/** A single start/end time window, optionally bound to a date. */
export interface ScheduleSlot {
    date?: string; // ISO date
    start: string; // "HH:mm"
    end: string; // "HH:mm"
    status?: 'default' | 'modified';
}

/**
 * Schedule payload for a tweak. Fields are populated per schedule preference
 * (one_day uses `timeSlots`, few_days uses `fewDaysSlots`, deadline uses
 * `deadlineSlots`/`closingDate`/`deadline`).
 */
export interface ScheduleData {
    preference?: string;
    slotType?: 'availability' | 'working_time';
    date?: string;
    time?: string;
    startDate?: string;
    endDate?: string;
    timeSlots?: ScheduleSlot[];
    fewDaysSlots?: ScheduleSlot[];
    deadlineSlots?: ScheduleSlot[];
    closingDate?: string;
    deadline?: string;
    totalHours?: number;
}

/**
 * Pricing payload for a tweak. Fields are populated per pricing model
 * (fixed/hourly use `price`, quantity uses `itemName`/`pricePerItem`/`quantity`/`totalPrice`).
 */
export interface PricingData {
    price?: number;
    ratePerHour?: number;
    estimatedHours?: number;
    itemName?: string;
    unitLabel?: string;
    unitPrice?: number;
    pricePerItem?: number;
    quantity?: number;
    totalPrice?: number;
}

/** The address shape used across the create flow and tweak records. */
export type TweakAddress = Address;

export interface CostSummary {
    partnerPayment: number;
    platformFee: number;
    totalAmount: number;
}

export interface CostSummaryCardProps {
    tweakCost: number;
    platformFee?: number;
    currencySymbol?: string;
}
