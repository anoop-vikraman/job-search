// Money is stored on the backend as integer minor units (e.g. paise for INR).
// The UI works in major units (rupees). Centralize the conversion so the ×100
// / ÷100 factor lives in exactly one place.

const MINOR_PER_MAJOR = 100;

/** Convert integer minor units to major units (rupees). */
export const minorToMajor = (amountMinor: number): number => amountMinor / MINOR_PER_MAJOR;

/** Convert a major-unit amount (rupees) to integer minor units. */
export const toMinor = (amountMajor: number): number => Math.round(amountMajor * MINOR_PER_MAJOR);

/**
 * Format integer minor units for display, e.g. 150000 -> "₹1,500".
 * Pass `withSymbol: false` to omit the currency symbol.
 */
export const formatMinor = (
    amountMinor: number,
    currency = 'INR',
    withSymbol = true
): string => {
    const symbol = withSymbol && currency === 'INR' ? '₹' : '';
    return `${symbol}${minorToMajor(amountMinor).toLocaleString()}`;
};
