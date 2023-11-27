import * as amplitude from '@amplitude/analytics-node';
import { getAddress } from './arweaveHelper';

const AMPLITUDE_TRACKING_ID = '92a463755ed8c8b96f0f2353a37b7b2';
const PLATFORM = '@protocol.land/sync';

let isInitialized = false;

const initializeAmplitudeAnalytics = async () => {
    if (isInitialized) return;

    await amplitude.init(AMPLITUDE_TRACKING_ID).promise;
    isInitialized = true;
};

export const trackAmplitudeAnalyticsEvent = async (
    category: string,
    action: string,
    label: string,
    data?: Record<any, any>
) => {
    try {
        await initializeAmplitudeAnalytics();

        const userAddress = await getAddress();

        await amplitude.track(
            category,
            {
                action,
                label,
                platform: PLATFORM,
                ...data,
            },
            {
                user_id: userAddress,
            }
        ).promise;
    } catch (error) {
        // console.error('Amplitude Analytics Error:', error);
    }
};
