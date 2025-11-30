"use client";

import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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

  useEffect(() => {
    const fetchNotifications = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_my_notifications", {
        p_limit: 5,
      });

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex translate-x-1/2 -translate-y-1/2 transform items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs leading-none font-bold text-red-100">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">Notifications</h4>
            <p className="text-muted-foreground text-sm">
              You have {unreadCount} unread messages.
            </p>
          </div>
          <div className="grid gap-2">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"
                >
                  <span
                    className={`flex h-2 w-2 translate-y-1 rounded-full ${!notification.is_read ? "bg-sky-500" : "bg-muted"}`}
                  />
                  <div className="space-y-1">
                    <p className="text-sm leading-none font-medium">
                      {notification.message}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                    {notification.link_url && (
                      <Link href={notification.link_url} passHref>
                        <Button variant="link" className="h-auto p-0 text-xs">
                          View Details
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No new notifications.
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
