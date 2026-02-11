import { motion } from "framer-motion";
import { User, getRoleBadge } from "@/types/canvas";
import { cn } from "@/lib/utils";

interface UserPresenceProps {
  users: User[];
  currentUserId: string;
  onClick?: () => void;
  vertical?: boolean;
  maxVisible?: number;
}

/**
 * User Presence Indicator
 * 
 * Displays a stack of avatars for currently online users.
 * Features:
 * - Shows online/offline status dots.
 * - Handles overflow (e.g., "+3 others").
 * - Displays role badges (optional).
 */
const UserPresence = ({ users, currentUserId, onClick, vertical = false, maxVisible = 4 }: UserPresenceProps) => {
  const onlineUsers = users.filter(u => u.isOnline);
  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const remainingCount = onlineUsers.length - maxVisible;

  return (
    <div
      className={cn(
        "relative flex items-center cursor-pointer group hover:bg-muted/50 p-1 rounded-full border border-transparent hover:border-border transition-all",
        vertical ? "flex-col gap-[-4px]" : "gap-1" // Negative margin for stacking overlap if vertical? Or just gap-1. User said "stack under bottom". Let's stick to gap-1 for clearly separated circles first or -space-y-2 for overlap. Let's use standard gap-2 for vertical.
      )}
      style={{ gap: vertical ? '0.5rem' : '0.25rem' }}
      onClick={onClick}
    >
      {/* Group Tooltip */}
      <div
        className={cn(
          "absolute px-3 py-1.5 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-elevated pointer-events-none",
          vertical ? "right-full top-0 mr-2" : "top-full left-1/2 -translate-x-1/2 mt-2"
        )}
      >
        View Participants
      </div>

      {visibleUsers.map((user, index) => (
        <motion.div
          key={user.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ delay: index * 0.05 }}
          className="relative"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 shadow-soft"
            style={{
              backgroundColor: user.color + '20',
              borderColor: user.color,
              color: user.color
            }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Online indicator */}
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
            style={{ backgroundColor: user.isOnline ? '#4CAF50' : '#9E9E9E' }}
          />
        </motion.div>
      ))}

      {remainingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border border-border"
        >
          +{remainingCount}
        </motion.div>
      )}
    </div>
  );
};

export default UserPresence;
