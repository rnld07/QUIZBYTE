import Constants from 'expo-constants';

import { APP_NAME } from '@quizbyte/shared';

export const appInfo = {
  name: APP_NAME,
  version: Constants.expoConfig?.version ?? '0.0.0',
  supportEmail: 'support@quizbyte.app',
  /** URL scheme used for deep links (see app.json). */
  scheme: 'quizbyte',
} as const;
