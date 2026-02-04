import { motion } from "framer-motion";
import { User, getRoleBadge } from "@/types/canvas";

interface UserPresenceProps {
  users: User[];
  currentUserId: string;
  onClick?: () => void;
}

const UserPresence = ({ users, currentUserId, onClick }: UserPresenceProps) => {
  const onlineUsers = users.filter(u => u.isOnline);
  const maxVisible = 5;
  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const remainingCount = onlineUsers.length - maxVisible;

  return (
    <div
      className="relative flex items-center gap-1 cursor-pointer group hover:bg-muted/50 p-1 rounded-full border border-transparent hover:border-border transition-all"
      onClick={onClick}
    >
      {/* Group Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-elevated pointer-events-none">
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
