import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Copy, Check, Share2, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { invitesAPI } from '@/lib/api';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    meetingId: string;
    meetingTitle: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    meetingId,
    meetingTitle,
}) => {
    const [inviteUrl, setInviteUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    const generateInviteLink = async () => {
        try {
            setIsLoading(true);
            const data = await invitesAPI.generate(meetingId);
            setInviteUrl(data.inviteUrl);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to generate invite link',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setIsCopied(true);
            toast({
                title: 'Copied!',
                description: 'Invite link copied to clipboard',
            });
            setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to copy link',
                variant: 'destructive',
            });
        }
    };

    // Generate link when modal opens


    useEffect(() => {
        if (isOpen && !inviteUrl) {
            generateInviteLink();
        }
    }, [isOpen, inviteUrl]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-primary" />
                        Share "{meetingTitle}"
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                        Anyone with this link can join your session as a guest viewer.
                    </p>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : inviteUrl ? (
                        <div className="space-y-3">
                            {/* Invite URL */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={inviteUrl}
                                        readOnly
                                        className="pl-10 pr-4 font-mono text-sm"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                </div>
                                <Button
                                    onClick={handleCopy}
                                    variant={isCopied ? 'default' : 'outline'}
                                    size="icon"
                                    className="flex-shrink-0"
                                >
                                    {isCopied ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>

                            {/* Info */}
                            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                <div className="flex items-start gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                                    <span className="text-muted-foreground">
                                        Guests can view the canvas in real-time
                                    </span>
                                </div>
                                <div className="flex items-start gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5" />
                                    <span className="text-muted-foreground">
                                        Guests must log in to edit or use AI features
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleCopy}
                                    variant="hero"
                                    className="flex-1"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Link
                                </Button>
                                <Button
                                    onClick={generateInviteLink}
                                    variant="outline"
                                    disabled={isLoading}
                                >
                                    Regenerate
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={generateInviteLink}
                            variant="hero"
                            className="w-full"
                            disabled={isLoading}
                        >
                            Generate Invite Link
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShareModal;
