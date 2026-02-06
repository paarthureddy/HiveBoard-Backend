import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { userAPI } from '@/lib/api';
import {
    Activity,
    Link as LinkIcon,
    PenTool,
    Clock,
    CalendarDays
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Button } from './ui/button';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

interface UserReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ReportData {
    totalMeetings: number;
    totalLinkShares: number;
    totalStrokes: number;
    estimatedTimeSpentMinutes: number;
    memberSince: string;
}

const UserReportModal = ({ isOpen, onClose }: UserReportModalProps) => {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            userAPI.getReport()
                .then(setData)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const barData = {
        labels: ['Meetings', 'Shares'],
        datasets: [
            {
                label: 'Activity Count',
                data: data ? [data.totalMeetings, data.totalLinkShares] : [0, 0],
                backgroundColor: 'rgba(95, 74, 139, 0.7)',
                borderColor: 'rgba(95, 74, 139, 1)',
                borderWidth: 1,
            },
        ],
    };

    const doughnutData = {
        labels: ['Drawing', 'Planning'], // Mock breakdown based on strokes vs meetings
        datasets: [
            {
                data: data ? [data.totalStrokes, data.totalMeetings * 10] : [0, 0], // giving weight to meetings
                backgroundColor: [
                    'rgba(255, 162, 64, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                ],
                borderColor: [
                    'rgba(255, 162, 64, 1)',
                    'rgba(75, 192, 192, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[rgb(245,244,235)] border border-[rgb(95,74,139)]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display text-[rgb(95,74,139)]">User Activity Report</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : data ? (
                    <div className="grid gap-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-white/50 backdrop-blur border-none shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Meetings</CardTitle>
                                    <CalendarDays className="h-4 w-4 text-[rgb(95,74,139)]" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[rgb(95,74,139)]">{data.totalMeetings}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/50 backdrop-blur border-none shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Approx. Time</CardTitle>
                                    <Clock className="h-4 w-4 text-[rgb(95,74,139)]" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[rgb(95,74,139)]">{data.estimatedTimeSpentMinutes}m</div>
                                    <p className="text-xs text-muted-foreground">Estimated drawing time</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/50 backdrop-blur border-none shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Strokes</CardTitle>
                                    <PenTool className="h-4 w-4 text-[rgb(95,74,139)]" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[rgb(95,74,139)]">{data.totalStrokes}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/50 backdrop-blur border-none shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Shared Links</CardTitle>
                                    <LinkIcon className="h-4 w-4 text-[rgb(95,74,139)]" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[rgb(95,74,139)]">{data.totalLinkShares}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <Card className="bg-white/80 border-none shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-[rgb(95,74,139)]">Activity Overview</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                                </CardContent>
                            </Card>
                            <Card className="bg-white/80 border-none shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-[rgb(95,74,139)]">Usage Distribution</CardTitle>
                                </CardHeader>
                                <CardContent className="flex justify-center">
                                    <div className="w-64">
                                        <Doughnut data={doughnutData} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-8 text-red-500">Failed to load report data.</div>
                )}

                <div className="flex justify-end mt-4">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UserReportModal;
