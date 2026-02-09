import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send } from "lucide-react";
import { ChatMessage, User } from "@/types/canvas";

interface ChatPanelProps {
  messages: ChatMessage[];
  users: User[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ChatPanel = ({
  messages,
  users,
  currentUserId,
  onSendMessage,
  isOpen,
  onToggle,
}: ChatPanelProps) => {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const getUserById = (userId: string) => users.find(u => u.id === userId);

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onToggle}
        className="fixed bottom-6 right-24 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-elevated hover:shadow-glow transition-all hover:scale-105 z-40"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <MessageCircle className="w-5 h-5" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-medium rounded-full flex items-center justify-center">
                {messages.length > 9 ? '9+' : messages.length}
              </span>
            )}
          </>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed md:right-24 md:bottom-24 md:w-80 md:h-[500px] md:rounded-2xl inset-0 w-full h-full md:inset-auto bg-card border border-border flex flex-col overflow-hidden z-[60]"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold">Team Chat</h3>
                <p className="text-xs text-muted-foreground">
                  {users.filter(u => u.isOnline).length} online
                </p>
              </div>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggle}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-elegant">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => {
                  const user = getUserById(message.userId);
                  // Check if this message is from the current user
                  // Compare both userId and guestId to handle all scenarios:
                  // 1. Authenticated user (message.userId === currentUserId)
                  // 2. Guest user (message.userId === currentUserId, where userId is actually guestId)
                  // 3. Authenticated user with guestId (message.guestId === currentUserId)
                  const isCurrentUser =
                    message.userId === currentUserId ||
                    message.guestId === currentUserId ||
                    String(message.userId) === String(currentUserId) ||
                    String(message.guestId) === String(currentUserId);

                  // Debug logging
                  console.log('Chat Message Debug:', {
                    messageUserId: message.userId,
                    messageGuestId: message.guestId,
                    currentUserId: currentUserId,
                    isCurrentUser: isCurrentUser,
                    userName: message.userName
                  });

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium"
                        style={{
                          backgroundColor: (user?.color || '#9BA68B') + '20',
                          color: user?.color || '#9BA68B',
                        }}
                      >
                        {message.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className={`max-w-[75%] ${isCurrentUser ? 'text-right' : ''}`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-medium">{message.userName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div
                          className={`px-3 py-2 rounded-xl text-sm ${isCurrentUser
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted rounded-bl-sm'
                            }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-muted border-0 focus-visible:ring-1"
                />
                <Button type="submit" size="icon" disabled={!inputValue.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatPanel;
