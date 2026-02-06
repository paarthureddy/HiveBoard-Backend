import { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import MeetingRenderer from '@/components/MeetingRenderer';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { meetingsAPI } from '@/lib/api';
import type { Meeting } from '@/types/meeting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ShareModal from '@/components/ShareModal';
import UserReportModal from '@/components/UserReportModal';
import {
    Plus,
    LogOut,
    Calendar,
    Clock,
    Palette,
    Activity, // Added Activity icon import

    Loader2,
    Share2,
    Download,
    Trash2,
    Edit2,
    Check,
    X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import logo from '@/assets/hive-logo.jpg';

const Home = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false); // Added report modal state
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [downloadingMeeting, setDownloadingMeeting] = useState<Meeting | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            setIsLoading(true);
            const data = await meetingsAPI.getAll();
            setMeetings(data);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to fetch meetings',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateMeeting = async () => {
        try {
            // Get next project number
            const projectNumber = meetings.length + 1;
            const newMeeting = await meetingsAPI.create({
                title: `Project${projectNumber}`,
            });
            navigate(`/canvas?meetingId=${newMeeting._id}`);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to create meeting',
                variant: 'destructive',
            });
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const handleOpenMeeting = (meetingId: string) => {
        navigate(`/canvas?meetingId=${meetingId}`);
    };

    const handleShare = (e: React.MouseEvent, meeting: Meeting) => {
        e.stopPropagation();
        setSelectedMeeting(meeting);
        setShareModalOpen(true);
    };

    const handleDelete = async (e: React.MouseEvent, meetingId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this meeting?')) return;

        try {
            await meetingsAPI.delete(meetingId);
            setMeetings(meetings.filter(m => m._id !== meetingId));
            toast({
                title: 'Deleted',
                description: 'Meeting deleted successfully',
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete meeting',
                variant: 'destructive',
            });
        }
    };

    const handleDownload = async (e: React.MouseEvent, meeting: Meeting) => {
        e.stopPropagation();

        if (meeting.thumbnail) {
            try {
                const link = document.createElement('a');
                link.href = meeting.thumbnail;
                link.download = `${meeting.title.replace(/\s+/g, '-').toLowerCase()}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                toast({
                    title: 'Downloaded',
                    description: 'Meeting preview downloaded successfully',
                });
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to download image',
                    variant: 'destructive',
                });
            }
        } else {
            // Fallback: Generate image on demand
            try {
                setIsGeneratingImage(true);
                toast({ title: "Generating Image", description: "Please wait..." });

                // Fetch full meeting to ensure we have canvasData
                let fullMeeting = meeting;
                if (!meeting.canvasData) {
                    try {
                        fullMeeting = await meetingsAPI.getById(meeting._id);
                    } catch (err) {
                        // ignore, try with current data
                    }
                }

                setDownloadingMeeting(fullMeeting);
                // The MeetingRenderer will trigger onReady, which handles the download
            } catch (error) {
                setIsGeneratingImage(false);
                toast({
                    title: 'Error',
                    description: 'Failed to access meeting data',
                    variant: 'destructive',
                });
            }
        }
    };

    const handleImageReady = useCallback(async (container: HTMLDivElement) => {
        if (!downloadingMeeting) return;

        try {
            const canvas = await html2canvas(container, {
                scale: 1, // Already 1920x1080
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const link = document.createElement('a');
            link.download = `${downloadingMeeting.title.replace(/\s+/g, '-').toLowerCase()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();

            toast({
                title: 'Downloaded',
                description: 'Image generated and downloaded',
            });
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error',
                description: 'Failed to generate image',
                variant: 'destructive',
            });
        } finally {
            setDownloadingMeeting(null);
            setIsGeneratingImage(false);
        }
    }, [downloadingMeeting, toast]);

    const startEditing = (e: React.MouseEvent, meeting: Meeting) => {
        e.stopPropagation();
        setEditingId(meeting._id);
        setEditingTitle(meeting.title);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingTitle('');
    };

    const saveTitle = async (meetingId: string) => {
        if (!editingTitle.trim()) {
            cancelEditing();
            return;
        }

        try {
            await meetingsAPI.update(meetingId, { title: editingTitle });
            setMeetings(meetings.map(m =>
                m._id === meetingId ? { ...m, title: editingTitle } : m
            ));
            toast({
                title: 'Updated',
                description: 'Meeting title updated successfully',
            });
            cancelEditing();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update title',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="home-theme min-h-screen relative" style={{ backgroundColor: 'rgb(245, 244, 235)' }}>

            {/* Content Container */}
            <div className="relative z-10 min-h-screen flex flex-col">

                {/* Header */}
                <header
                    className="relative z-10 border-b border-[rgb(95,74,139)] backdrop-blur-md"
                    style={{ backgroundColor: 'rgba(95, 74, 139, 0.75)' }}
                >
                    <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border-2 border-black/20">
                                <img src={logo} alt="HiveBoard Logo" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h1 className="font-display text-xl font-semibold text-[rgb(255,212,29)]">HiveBoard</h1>
                                <p className="text-sm text-[rgb(245,244,235)]">Welcome back, {user?.name}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={() => setReportModalOpen(true)} className="bg-[rgb(255,162,64)] text-white hover:bg-[rgb(255,182,84)] border-none">
                                <Activity className="w-4 h-4 mr-2" />
                                My Report
                            </Button>
                            <Button variant="outline" onClick={handleLogout} className="border-border text-[rgb(95,74,139)] hover:bg-secondary/40">
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="relative z-10 container mx-auto px-6 py-12">
                    {/* Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-12 text-center"
                    >
                        <h2 className="font-display text-4xl md:text-6xl font-bold mb-4 tracking-tight text-[rgb(95,74,139)]">
                            Your Creative Sessions
                        </h2>
                        <p className="text-[rgb(95,74,139)] text-lg mb-8">
                            Continue where you left off or start a new design session
                        </p>

                        <Button
                            size="lg"
                            onClick={handleCreateMeeting}
                            className="bg-primary text-primary-foreground hover:opacity-90 shadow-glow group"
                        >
                            <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                            Create New Meeting
                        </Button>
                    </motion.div>

                    {/* Meetings Grid */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : meetings.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="text-center py-20"
                        >
                            <div className="w-24 h-24 rounded-full bg-gradient-rose/10 flex items-center justify-center mx-auto mb-6">
                                <Calendar className="w-12 h-12 text-primary" />
                            </div>
                            <h3 className="font-display text-2xl font-semibold mb-2 text-[rgb(95,74,139)]">No meetings yet</h3>
                            <p className="text-[rgb(95,74,139)] mb-6">
                                Create your first meeting to start designing
                            </p>
                            <Button
                                size="lg"
                                onClick={handleCreateMeeting}
                                className="bg-primary text-primary-foreground hover:opacity-90 shadow-glow"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Your First Meeting
                            </Button>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {meetings.map((meeting, index) => (
                                <motion.div
                                    key={meeting._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    onClick={() => handleOpenMeeting(meeting._id)}
                                    className="group cursor-pointer"
                                >
                                    <div
                                        className="backdrop-blur-md border-2 border-[rgb(255,162,64)] rounded-2xl p-6 shadow-elevated hover:shadow-glow transition-all duration-300 hover:-translate-y-1"
                                        style={{ backgroundColor: 'rgba(255, 162, 64, 0.28)' }}
                                    >
                                        {/* Thumbnail */}
                                        <div className="w-full h-48 rounded-xl bg-background mb-4 flex items-center justify-center overflow-hidden">
                                            {meeting.thumbnail ? (
                                                <img
                                                    src={meeting.thumbnail}
                                                    alt={meeting.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Palette className="w-16 h-16 text-[rgb(255,212,29)]" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="mb-2">
                                            {editingId === meeting._id ? (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Input
                                                        ref={inputRef}
                                                        value={editingTitle}
                                                        onChange={(e) => setEditingTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveTitle(meeting._id);
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex-1"
                                                    />
                                                    <Button
                                                        onClick={(e) => { e.stopPropagation(); saveTitle(meeting._id); }}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="flex-shrink-0"
                                                    >
                                                        <Check className="w-4 h-4 text-green-500" />
                                                    </Button>
                                                    <Button
                                                        onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="flex-shrink-0"
                                                    >
                                                        <X className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-start justify-between mb-2">
                                                    <h3 className="font-display text-xl font-semibold text-[rgb(95,74,139)] group-hover:text-primary transition-colors flex-1">
                                                        {meeting.title}
                                                    </h3>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            onClick={(e) => startEditing(e, meeting)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="flex-shrink-0 h-8 w-8"
                                                            title="Rename"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => handleDownload(e, meeting)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="flex-shrink-0 h-8 w-8"
                                                            title="Download"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => handleShare(e, meeting)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="flex-shrink-0 h-8 w-8"
                                                            title="Share"
                                                        >
                                                            <Share2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => handleDelete(e, meeting._id)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="flex-shrink-0 h-8 w-8 text-[rgb(215,53,53)] hover:text-[rgb(255,70,70)]"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-[rgb(95,74,139)]">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(meeting.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                <span>{formatDistanceToNow(new Date(meeting.updatedAt), { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Share Modal */}
                {selectedMeeting && (
                    <ShareModal
                        isOpen={shareModalOpen}
                        onClose={() => setShareModalOpen(false)}
                        meetingId={selectedMeeting._id}
                        meetingTitle={selectedMeeting.title}
                    />
                )}

                {/* User Report Modal */}
                <UserReportModal
                    isOpen={reportModalOpen}
                    onClose={() => setReportModalOpen(false)}
                />

                {/* Hidden Renderer */}
                {downloadingMeeting && downloadingMeeting.canvasData && (
                    <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', visibility: 'hidden' }}>
                        <div id="hidden-renderer-container">
                            <MeetingRenderer
                                data={downloadingMeeting.canvasData}
                                onReady={() => {
                                    const el = document.getElementById('hidden-renderer-container');
                                    if (el) handleImageReady(el as HTMLDivElement);
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
