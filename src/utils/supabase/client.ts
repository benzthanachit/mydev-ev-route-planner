import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
    if (typeof window === 'undefined') {
        // Server side: always create a new client
        return createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { persistSession: false } }
        )
    }

    if (!supabaseInstance) {
        // Create a dummy lock manager that just executes the callback immediately.
        // This completely bypasses the Next.js Dev Mode deadlock where LockManager hangs for 10s.
        const dummyLock = async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
            return await fn();
        };

        supabaseInstance = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    lock: dummyLock,
                }
            }
        );
    }
    return supabaseInstance;
}
