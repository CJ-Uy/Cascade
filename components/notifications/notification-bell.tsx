"use client";

import { Bell, Check, ExternalLink } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  created_at: string;
  message: string;
  is_read: boolean;
  link_url: string | null;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_my_notifications", {
      p_limit: 10,
    });

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (
    notificationId: string,
    linkUrl: string | null,
  ) => {
    setMarkingRead(notificationId);

    // Update locally first for immediate feedback
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Update in database
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      // Revert on error
      fetchNotifications();
    }

    setMarkingRead(null);

    // Navigate if there's a link
    if (linkUrl) {
      setIsOpen(false);
      router.push(linkUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Update locally first
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    // Update in database
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (error) {
      console.error("Error marking all as read:", error);
      fetchNotifications();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 border-b p-4 transition-colors last:border-0 ${
                  !notification.is_read
                    ? "bg-blue-50 dark:bg-blue-950/20"
                    : "hover:bg-muted/50"
                }`}
              >
                <div
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                    !notification.is_read ? "bg-blue-500" : "bg-transparent"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm leading-snug ${
                      !notification.is_read ? "font-medium" : ""
                    }`}
                  >
                    {notification.message}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {notification.link_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          handleMarkAsRead(
                            notification.id,
                            notification.link_url,
                          )
                        }
                        disabled={markingRead === notification.id}
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    )}
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleMarkAsRead(notification.id, null)}
                        disabled={markingRead === notification.id}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No notifications yet
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Link href="/notifications" passHref>
              <Button
                variant="ghost"
                className="w-full text-xs"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
