import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Users, Eye, Loader2, ArrowRight } from 'lucide-react';
import { invitesAPI } from '@/lib/api';
import { useGuest } from '@/contexts/GuestContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Join Session Page
 * 
 * This page handles users entering a whiteboard session via a shared link (invite token).
 * Workflow:
 * 1. Validates the invite token with the backend.
 * 2. Displays meeting details (title, host, participant count).
 * 3. Allows users to:
 *    - Join as an authenticated user (if logged in).
 *    - Join as a Guest (read-only) by providing a name.
 *    - Login/Register to upgrade their access.
 */
const JoinSession = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { setGuestUser } = useGuest();
    const { isAuthenticated } = useAuth();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [meetingData, setMeetingData] = useState<any>(null);
    const [guestName, setGuestName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        validateInvite();
    }, [token]);

    const validateInvite = async () => {
        try {
            setIsLoading(true);
            if (!token) {
                setError('Invalid invite link');
                return;
            }

            const data = await invitesAPI.validate(token);
            setMeetingData(data);
        } catch (error: any) {
            setError(error.response?.data?.message || 'Invalid or expired invite link');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinAsGuest = async () => {
        if (!guestName.trim()) {
            toast({
                title: 'Name required',
                description: 'Please enter your name to join',
                variant: 'destructive',
            });
            return;
        }

        try {
            setIsJoining(true);
            const data = await invitesAPI.join(token!, guestName);

            // Set guest user data
            setGuestUser({
                guestId: data.guestId,
                guestName: data.guestName,
                meetingId: data.meetingId,
                roomId: data.roomId,
                role: 'guest',
            });

            // Navigate to canvas
            navigate(`/canvas?meetingId=${data.meetingId}&roomId=${data.roomId}&guest=true`);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to join session',
                variant: 'destructive',
            });
        } finally {
            setIsJoining(false);
        }
    };

    const handleJoinAuthenticated = () => {
        if (meetingData) {
            navigate(`/canvas?meetingId=${meetingData.meeting._id}&roomId=${meetingData.room?.roomId}`);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Validating invite...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card border border-border rounded-2xl shadow-elevated p-8 max-w-md w-full text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                        <Palette className="w-8 h-8 text-destructive" />
                    </div>
                    <h1 className="font-display text-2xl font-semibold mb-2">Invalid Invite</h1>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => navigate('/')} variant="hero">
                        Go to Home
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
                    className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-primary/5 via-transparent to-transparent"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl shadow-elevated p-8 max-w-md w-full relative z-10"
            >
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-rose flex items-center justify-center mx-auto mb-4">
                        <Palette className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="font-display text-2xl font-semibold mb-2">
                        Join Session
                    </h1>
                    <p className="text-muted-foreground">
                        You've been invited to collaborate
                    </p>
                </div>

                {/* Meeting Info */}
                {meetingData && (
                    <div className="bg-muted/50 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold mb-1">{meetingData.meeting.title}</h3>
                        <p className="text-sm text-muted-foreground">
                            by {meetingData.meeting.createdBy.name}
                        </p>
                        {meetingData.room && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <Users className="w-4 h-4" />
                                <span>
                                    {meetingData.room.participantCount}{' '}
                                    {meetingData.room.participantCount === 1 ? 'participant' : 'participants'} online
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Join Options */}
                {isAuthenticated ? (
                    <div className="space-y-4">
                        <Button
                            onClick={handleJoinAuthenticated}
                            variant="hero"
                            className="w-full"
                            size="lg"
                        >
                            Join Session
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Guest Join */}
                        <div className="space-y-3">
                            <Label htmlFor="guestName">Your Name</Label>
                            <Input
                                id="guestName"
                                type="text"
                                placeholder="Enter your name"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleJoinAsGuest()}
                            />
                            <Button
                                onClick={handleJoinAsGuest}
                                variant="hero"
                                className="w-full"
                                size="lg"
                                disabled={isJoining}
                            >
                                {isJoining ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Join as Guest (View Only)
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                Guests can view but not edit. Login to unlock full features.
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-sm text-muted-foreground">or</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* Login */}
                        <Button
                            onClick={() => navigate('/auth')}
                            variant="outline"
                            className="w-full"
                            size="lg"
                        >
                            Login to Edit
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default JoinSession;
