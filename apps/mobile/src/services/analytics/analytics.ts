import type { AnalyticsEventMap, AnalyticsEventName, AnalyticsProvider } from '@quizbyte/shared';

import { env } from '@/config/env';
import { logger } from '@/services/errors';

/** Development provider: logs events to the console. */
class ConsoleAnalyticsProvider implements AnalyticsProvider {
  track<Name extends AnalyticsEventName>(name: Name, properties: AnalyticsEventMap[Name]): void {
    logger.debug(`analytics ${name}`, properties);
  }
  identify(userId: string): void {
    logger.debug('analytics identify', userId);
  }
  reset(): void {
    logger.debug('analytics reset');
  }
}

/** Production placeholder until a real provider (PostHog, Firebase, …) is wired in. */
class NoopAnalyticsProvider implements AnalyticsProvider {
  track(): void {}
  identify(): void {}
  reset(): void {}
}

class Analytics implements AnalyticsProvider {
  private provider: AnalyticsProvider;

  constructor(provider: AnalyticsProvider) {
    this.provider = provider;
  }

  /** Swap the provider at runtime (e.g. after consent). */
  setProvider(provider: AnalyticsProvider): void {
    this.provider = provider;
  }

  track<Name extends AnalyticsEventName>(name: Name, properties: AnalyticsEventMap[Name]): void {
    try {
      this.provider.track(name, properties);
    } catch (error) {
      logger.warn('analytics track failed', error);
    }
  }

  identify(userId: string): void {
    this.provider.identify(userId);
  }

  reset(): void {
    this.provider.reset();
  }
}

export const analytics = new Analytics(
  env.appEnv === 'production' ? new NoopAnalyticsProvider() : new ConsoleAnalyticsProvider(),
);
