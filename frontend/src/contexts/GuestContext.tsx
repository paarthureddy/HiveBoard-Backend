/**
 * Guest Context
 * 
 * This context manages temporary access for non-registered users (Guests).
 * It allows users to join sessions via a link without creating an account.
 * Key responsibilities:
 * - Storing guest identity (Name, ID) in SessionStorage (cleared on browser close).
 * - tracking if the current user is a guest (isGuest).
 * - Setting read-only permissions for guests by default.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

interface GuestUser {
    guestId: string;
    guestName: string;
    meetingId: string;
    roomId: string;
    role: 'guest';
}

interface GuestContextType {
    isGuest: boolean;
    guestUser: GuestUser | null;
    setGuestUser: (user: GuestUser | null) => void;
    clearGuest: () => void;
    isReadOnly: boolean;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [guestUser, setGuestUserState] = useState<GuestUser | null>(null);

    // Load guest data from sessionStorage on mount
    useEffect(() => {
        const savedGuest = sessionStorage.getItem('guestUser');
        if (savedGuest) {
            try {
                setGuestUserState(JSON.parse(savedGuest));
            } catch (error) {
                console.error('Error parsing guest user:', error);
                sessionStorage.removeItem('guestUser');
            }
        }
    }, []);

    const setGuestUser = (user: GuestUser | null) => {
        setGuestUserState(user);
        if (user) {
            sessionStorage.setItem('guestUser', JSON.stringify(user));
        } else {
            sessionStorage.removeItem('guestUser');
        }
    };

    const clearGuest = () => {
        setGuestUserState(null);
        sessionStorage.removeItem('guestUser');
    };

    return (
        <GuestContext.Provider
            value={{
                isGuest: !!guestUser,
                guestUser,
                setGuestUser,
                clearGuest,
                isReadOnly: !!guestUser, // Guests are read-only by default
            }}
        >
            {children}
        </GuestContext.Provider>
    );
};

export const useGuest = () => {
    const context = useContext(GuestContext);
    if (context === undefined) {
        throw new Error('useGuest must be used within a GuestProvider');
    }
    return context;
};
