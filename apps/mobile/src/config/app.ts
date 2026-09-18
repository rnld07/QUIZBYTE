import Constants from 'expo-constants';

import { APP_NAME } from '@quizbyte/shared';

export const appInfo = {
  name: APP_NAME,
  version: Constants.expoConfig?.version ?? '0.0.0',
  supportEmail: 'support@quizbyte.app',
  /** URL scheme used for deep links (see app.json). */
  scheme: 'quizbyte',
  /** The account behind the app – linked from "Mehr". */
  tiktok: { handle: 'Informatik.Quiz', url: 'https://www.tiktok.com/@informatik.quiz' },
} as const;
