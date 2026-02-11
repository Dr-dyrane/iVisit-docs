import { createClient } from '@/lib/supabase-browser';

// ─── Types ───────────────────────────────────────────────────
export interface Notification {
    id: string;
    user_id: string;
    type: string;
    action_type: string;
    target_id: string | null;
    title: string;
    message: string | null;
    icon: string | null;
    color: string;
    priority: string;
    read: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
}

// ─── API ─────────────────────────────────────────────────────

export async function getNotifications(
    userId: string,
    limit = 20,
    unreadOnly = false
): Promise<Notification[]> {
    const supabase = createClient();

    let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (unreadOnly) {
        query = query.eq('read', false);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
    return (data || []) as Notification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
    const supabase = createClient();
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

    if (error) return 0;
    return count || 0;
}

export async function markAsRead(notificationId: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

    return !error;
}

export async function markAllAsRead(userId: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

    return !error;
}

/**
 * Subscribe to real-time notifications.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
): () => void {
    const supabase = createClient();

    const channel = supabase
        .channel(`notifications:user=${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => callback(payload.new as Notification)
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
}
