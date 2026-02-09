import { motion, AnimatePresence } from 'framer-motion';
import type { Participant } from '@/types/room';
import { Users, Crown, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

interface ParticipantsListProps {
    participants: Participant[];
    currentUserId?: string;
    currentGuestId?: string;
    isOpen: boolean;
    onClose: () => void;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({
    participants,
    currentUserId,
    currentGuestId,
    isOpen,
    onClose,
}) => {

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getAvatarColor = (id: string) => {
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-yellow-500',
            'bg-indigo-500',
            'bg-red-500',
            'bg-teal-500',
        ];
        const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    const isCurrentUser = (participant: Participant) => {
        return (
            (currentUserId && participant.userId === currentUserId) ||
            (currentGuestId && participant.guestId === currentGuestId)
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-background/20 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full sm:w-80 bg-card border-l border-border shadow-elevated z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                <h2 className="font-semibold text-lg">Participants</h2>
                                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                                    {participants.length}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon-sm" onClick={onClose}>
                                <div className="i-lucide-x w-4 h-4">✕</div>
                            </Button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {participants.map((participant) => (
                                <motion.div
                                    key={participant.socketId}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isCurrentUser(participant)
                                        ? 'bg-primary/5 border border-primary/20'
                                        : 'hover:bg-muted/50 border border-transparent hover:border-border'
                                        }`}
                                >
                                    {/* Avatar */}
                                    <div className="relative">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm ${getAvatarColor(
                                                participant.userId || participant.guestId || participant.socketId
                                            )}`}
                                        >
                                            {getInitials(participant.name)}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-medium truncate text-sm">
                                                {participant.name}
                                            </span>
                                            {isCurrentUser(participant) && (
                                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium">You</span>
                                            )}
                                            {participant.isOwner && (
                                                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {participant.userId ? (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <UserCircle className="w-3 h-3" />
                                                    <span>Registered User</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <div className="w-3 h-3 rounded-full border border-current opacity-50" />
                                                    <span>Guest</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {participants.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                                    <Users className="w-8 h-8 opacity-20" />
                                    <p>No participants yet</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ParticipantsList;
