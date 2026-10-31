import api from '../utils/api';
import type { KycIdType, KycStatusResponse, KycSubmission } from '../types/api';

export interface KycSubmitInput {
    fullName: string;
    idType: KycIdType;
    idNumber: string;
    upiId: string;
    /** Local image URIs (front/back of the ID). Sent straight to the private KYC store. */
    documents: { uri: string; name: string; type: string }[];
}

export const kycApi = {
    status: async (): Promise<KycStatusResponse> => {
        const res = await api.get('/api/v1/kyc');
        return res.data;
    },
    submit: async (input: KycSubmitInput): Promise<KycSubmission> => {
        const form = new FormData();
        form.append('full_name', input.fullName);
        form.append('id_type', input.idType);
        form.append('id_number', input.idNumber);
        form.append('upi_id', input.upiId);
        for (const doc of input.documents) {
            // React Native FormData file part; cast through unknown for the DOM typings.
            form.append('documents', doc as unknown as Blob);
        }
        const res = await api.post('/api/v1/kyc', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },
};
