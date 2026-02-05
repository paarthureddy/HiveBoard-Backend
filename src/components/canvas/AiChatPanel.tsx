import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { ChatMessage } from "@/types/canvas";

interface AiChatPanelProps {
    isOpen: boolean;
    onToggle: () => void;
}

const INITIAL_MESSAGE: ChatMessage = {
    id: 'welcome',
    userId: 'ai',
    userName: 'HiveMind',
    content: 'Hello! I am HiveMind. I can help you with your design. What would you like to create?',
    timestamp: new Date()
};

const AiChatPanel = ({
    isOpen,
    onToggle,
}: AiChatPanelProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSendMessage = async (content: string) => {
        // Add user message
        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            userId: 'user',
            userName: 'You',
            content,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setIsTyping(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: content }),
            });

            let data;
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse response as JSON:', text);
                throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
            }

            if (response.ok) {
                const aiResponse: ChatMessage = {
                    id: crypto.randomUUID(),
                    userId: 'ai',
                    userName: 'HiveMind',
                    content: data.response,
                    imageUrl: data.image,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, aiResponse]);
            } else {
                throw new Error(data.message || 'Failed to get response');
            }
        } catch (error: any) {
            console.error('AI chat error:', error);
            const errorResponse: ChatMessage = {
                id: crypto.randomUUID(),
                userId: 'ai',
                userName: 'HiveMind',
                content: error.message && !error.message.includes('object Object')
                    ? `⚠️ ${error.message}`
                    : "I'm sorry, I'm having a bit of trouble answering right now. Please try again in a moment.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            handleSendMessage(inputValue.trim());
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={onToggle}
                className="fixed bottom-6 left-24 w-14 h-14 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-elevated hover:shadow-glow transition-all hover:scale-105 z-40"
            >
                {isOpen ? (
                    <X className="w-5 h-5" />
                ) : (
                    <Bot className="w-6 h-6" />
                )}
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -300 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-24 bottom-24 w-80 h-[500px] bg-card border border-border rounded-2xl shadow-elevated flex flex-col overflow-hidden z-30"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-violet-50 dark:bg-violet-900/10">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                    <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="font-display font-semibold">HiveMind</h3>
                                    <p className="text-xs text-muted-foreground">Always active</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-elegant">
                            {messages.map((message) => {
                                const isAi = message.userId === 'ai';

                                return (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex gap-3 ${!isAi ? 'flex-row-reverse' : ''}`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium ${isAi ? 'bg-violet-100 text-violet-600' : 'bg-primary/10 text-primary'
                                                }`}
                                        >
                                            {isAi ? <Bot className="w-4 h-4" /> : 'Y'}
                                        </div>
                                        <div className={`max-w-[75%] ${!isAi ? 'text-right' : ''}`}>
                                            <div className="flex items-baseline gap-2 mb-1 justify-between">
                                                <span className="text-xs font-medium">{message.userName}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(message.timestamp).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <div
                                                className={`px-3 py-2 rounded-xl text-sm ${!isAi
                                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                    : 'bg-muted rounded-bl-sm'
                                                    }`}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    {message.content && <span>{message.content}</span>}
                                                    {message.imageUrl && (
                                                        <div className="relative group mt-1">
                                                            <img
                                                                src={message.imageUrl}
                                                                alt="AI Generated"
                                                                className="rounded-lg w-full h-auto shadow-sm hover:scale-[1.02] transition-transform bg-background/50 min-h-[100px]"
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/6d28d9/ffffff?text=Image+Generating...';
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3"
                                >
                                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex-shrink-0 flex items-center justify-center">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-1 h-9">
                                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"></span>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmit} className="p-3 border-t border-border">
                            <div className="flex gap-2">
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask something..."
                                    className="flex-1 bg-muted border-0 focus-visible:ring-1"
                                />
                                <Button type="submit" size="icon" disabled={!inputValue.trim()} className="bg-violet-600 hover:bg-violet-700">
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

export default AiChatPanel;
