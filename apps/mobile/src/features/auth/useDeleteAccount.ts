import { useMutation } from '@tanstack/react-query';

import { deleteAccount, reauthenticate } from '@/services/api/accountApi';
import { forgetAttemptsOfUser } from '@/services/outbox/attemptOutbox';
import { supabase } from '@/services/supabase/client';
import { useAuthStore } from '@/state/authStore';

import { resetLocalUserState } from './resetLocalUserState';

/**
 * Deletes the account, for good.
 *
 * Three steps, in this order and no other: prove the password, delete on the
 * server, then throw away everything the app was holding. Signing out first
 * would take the session the delete needs; clearing the cache first would leave
 * a half-empty app standing if the delete failed.
 *
 * The password is asked for again because the session alone is not proof that
 * the person in front of the phone is the one who owns the account – a phone
 * stays signed in for months.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const userId = useAuthStore.getState().userId;
      await reauthenticate(email, password);
      await deleteAccount();

      // The user row is gone; the local session is a key to nothing. `scope:
      // 'local'` because the server has no session left to revoke.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      resetLocalUserState();
      // Die Warteschlange gehoert zu einem Konto, das es nicht mehr gibt.
      // Ueberall sonst bleibt sie liegen – hier waere sie ein Versand ins Nichts.
      if (userId) await forgetAttemptsOfUser(userId);
    },
  });
}
