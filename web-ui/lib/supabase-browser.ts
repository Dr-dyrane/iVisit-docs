import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    if (client) return client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // During build / static generation, env vars may not be available.
    // Return a placeholder URL so the library doesn't throw —
    // no real requests will be made at build time anyway.
    client = createBrowserClient(
        url || 'https://placeholder.supabase.co',
        key || 'placeholder-key'
    );

    return client;
}
