// Mock data for profile and related features

export interface TweakStats {
    tweaksCreated: number;
    tweaksCompleted: number;
    rating: number;
    totalReviews: number;
}

export interface UserExperience {
    years: number;
    months: number;
}

export interface ProfileCompletion {
    percentage: number;
    nextStep: string;
}

export interface ReliabilityScore {
    score: number;
    positiveActs: { name: string; points: number }[];
    negativeActs: { name: string; points: number }[];
}

export interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
}

export interface Refund {
    id: string;
    tweakName: string;
    amount: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    dateRequested: string;
}

export interface PastTweak {
    id: string;
    title: string;
    status: string;
    date: string;
    amount: number;
    rating?: number;
}

export interface ReferralData {
    totalEarnings: number;
    friendsInvited: number;
    referralLink: string;
}

// Mock User Stats
export const mockTweakStats: TweakStats = {
    tweaksCreated: 12,
    tweaksCompleted: 28,
    rating: 4.8,
    totalReviews: 45,
};

// Mock Skills
export const mockSkills = ['Plumbing', 'Electrical Work', 'Carpentry', 'Painting'];

// Mock Experience
export const mockExperience: UserExperience = {
    years: 3,
    months: 6,
};

// Mock Profile Completion
export const mockProfileCompletion: ProfileCompletion = {
    percentage: 60,
    nextStep: 'Essential documents',
};

// Mock Reliability Score
export const mockReliabilityScore: ReliabilityScore = {
    score: 55,
    positiveActs: [
        { name: 'Completed shift', points: 1 },
        { name: 'Check in/out', points: 1 },
        { name: 'Shift confirmation', points: 1 },
        { name: 'Referral of a friend', points: 5 },
    ],
    negativeActs: [
        { name: 'Bad Attitude', points: -40 },
        { name: 'No-show', points: -25 },
        { name: 'Late cancellation', points: -10 },
        { name: 'No check in/out', points: -1 },
        { name: 'Not confirming a shift', points: -1 },
    ],
};

// Mock Wallet Balance
export const mockWalletBalance = 2450;

// Mock Transactions
export const mockTransactions: Transaction[] = [
    {
        id: '1',
        date: '2024-01-28',
        description: 'Tweak Payment - Electrical Repair',
        amount: 500,
        type: 'credit',
    },
    {
        id: '2',
        date: '2024-01-25',
        description: 'Withdrawal to Bank',
        amount: -1000,
        type: 'debit',
    },
    {
        id: '3',
        date: '2024-01-20',
        description: 'Tweak Payment - Plumbing Fix',
        amount: 750,
        type: 'credit',
    },
    {
        id: '4',
        date: '2024-01-15',
        description: 'Referral Bonus',
        amount: 100,
        type: 'credit',
    },
];

// Mock Refunds
export const mockRefunds: Refund[] = [
    {
        id: '1',
        tweakName: 'Carpentry Work - Kitchen Cabinet',
        amount: 300,
        status: 'Approved',
        dateRequested: '2024-01-20',
    },
    {
        id: '2',
        tweakName: 'Painting - Living Room',
        amount: 150,
        status: 'Pending',
        dateRequested: '2024-01-25',
    },
];

// Mock Past Tweaks - Created
export const mockCreatedTweaks: PastTweak[] = [
    {
        id: '1',
        title: 'Electrical Repair - Main Switch',
        status: 'Completed',
        date: '2024-01-28',
        amount: 500,
        rating: 5,
    },
    {
        id: '2',
        title: 'Plumbing - Kitchen Sink',
        status: 'In Progress',
        date: '2024-01-26',
        amount: 350,
    },
    {
        id: '3',
        title: 'Carpentry - Door Repair',
        status: 'Completed',
        date: '2024-01-20',
        amount: 450,
        rating: 4,
    },
];

// Mock Past Tweaks - Applied/Completed
export const mockCompletedTweaks: PastTweak[] = [
    {
        id: '1',
        title: 'Painting - Bedroom Walls',
        status: 'Completed',
        date: '2024-01-27',
        amount: 800,
        rating: 5,
    },
    {
        id: '2',
        title: 'AC Installation',
        status: 'Completed',
        date: '2024-01-22',
        amount: 1200,
        rating: 4,
    },
    {
        id: '3',
        title: 'Garden Maintenance',
        status: 'Completed',
        date: '2024-01-18',
        amount: 600,
        rating: 5,
    },
];

// Mock Referral Data
export const mockReferralData: ReferralData = {
    totalEarnings: 0,
    friendsInvited: 0,
    referralLink: 'https://tweak.app.link/referral_id=245868&sp',
};
