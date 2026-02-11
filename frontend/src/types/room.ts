export interface Participant {
    socketId: string;
    userId?: string;
    guestId?: string;
    name: string;
    isOwner?: boolean;
    role?: 'owner' | 'editor' | 'guest';
}

export interface Room {
    _id: string;
    meetingId: string;
    roomId: string;
    owner: string;
    inviteToken: string;
    inviteEnabled: boolean;
    allowGuests: boolean;
    participants: Participant[];
    activeConnections: Participant[];
    createdAt: string;
    updatedAt: string;
}

export interface InviteLink {
    inviteToken: string;
    inviteUrl: string;
    roomId: string;
}

export interface JoinSessionData {
    meetingId: string;
    roomId: string;
    guestId?: string;
    guestName?: string;
    role: 'owner' | 'editor' | 'guest';
}
