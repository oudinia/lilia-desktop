import { useEffect, useState } from "react";
import { onPresenceChanged, UserPresence } from "@/lib/presence";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/Tooltip";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-red-500",
  "bg-indigo-500",
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function PresenceBar() {
  const [users, setUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    const unsubscribe = onPresenceChanged(setUsers);
    return unsubscribe;
  }, []);

  if (users.length <= 1) return null; // Don't show if only the current user

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 px-2">
        <span className="text-xs text-muted-foreground mr-1">
          {users.length} online
        </span>
        <div className="flex -space-x-2">
          {users.slice(0, 5).map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <div
                  className={`relative inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-medium text-white ring-2 ring-background ${getColorForUser(user.userId)}`}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(user.displayName)
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{user.displayName}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {users.length > 5 && (
            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-medium text-muted-foreground bg-muted ring-2 ring-background">
              +{users.length - 5}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
