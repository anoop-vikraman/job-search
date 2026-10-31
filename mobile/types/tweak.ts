export type SchedulingType = 'oneDay' | 'flexible' | 'fixed';
export type TimeSlot = 'anytime' | 'before6pm' | 'after6pm';

export type PricingType = 'fixed' | 'quantity' | 'duration';
export type DurationTab = 'hourly' | 'daily';

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
