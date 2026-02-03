import { useRef, useEffect, useState } from 'react';
import type { StickyNote, TextItem, CroquisItem } from '@/types/canvas';

interface Point {
    x: number;
    y: number;
}

interface Stroke {
    id: string;
    points: Point[];
    color: string;
    width: number;
}

interface CanvasData {
    strokes: Stroke[];
    stickyNotes?: StickyNote[];
    textItems?: TextItem[];
    croquis?: CroquisItem[];
}

interface MeetingRendererProps {
    data: CanvasData;
    onReady: () => void;
}

const MeetingRenderer = ({ data, onReady }: MeetingRendererProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [imagesLoaded, setImagesLoaded] = useState(false);

    // Draw strokes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Helper
        const paintStroke = (points: Point[], color: string, width: number) => {
            if (points.length < 2) return;
            ctx.beginPath();

            const isEraser = color === '#F8F6F3';
            if (isEraser) {
                // Eraser simulation on white background is just white paint
                ctx.strokeStyle = '#ffffff';
            } else {
                ctx.strokeStyle = color;
            }

            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            if (points.length > 1) {
                ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            }
            ctx.stroke();
        };

        // Render strokes
        data.strokes?.forEach(s => paintStroke(s.points, s.color, s.width));

    }, [data.strokes]);

    // Check images loading
    useEffect(() => {
        if (!data.croquis || data.croquis.length === 0) {
            setImagesLoaded(true);
            return;
        }

        const images = Array.from(containerRef.current?.querySelectorAll('img') || []);
        let loadedCount = 0;

        if (images.length === 0) {
            setImagesLoaded(true);
            return;
        }

        const checkAllLoaded = () => {
            loadedCount++;
            if (loadedCount >= images.length) {
                setImagesLoaded(true);
            }
        };

        images.forEach(img => {
            if (img.complete) {
                checkAllLoaded();
            } else {
                img.onload = checkAllLoaded;
                img.onerror = checkAllLoaded;
            }
        });
    }, [data.croquis]);

    // Signal ready
    useEffect(() => {
        if (imagesLoaded) {
            // Small delay to ensure rendering and DOM layout
            const timer = setTimeout(() => {
                onReady();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [imagesLoaded, onReady]);

    // We'll fix the view to a large enough area for now or just 1920x1080 default
    // Ideally we would calculate bounds, but for "download it" simple fix, 
    // we'll assume a standard large-ish workspace.
    // Let's go with a 2000x2000 canvas starting at -500, -500 to catch some negative space content
    // Actually, stick to 0,0 top-left for simplicity unless we want to do complex transforms.
    // Canvas.tsx has origin at 0,0 visually (offsetRef initialized to 0,0).
    // So elements are at logical X, Y.

    return (
        <div ref={containerRef} className="relative bg-white overflow-hidden" style={{ width: 1920, height: 1080 }}>
            <canvas
                ref={canvasRef}
                width={1920}
                height={1080}
                className="absolute inset-0 pointer-events-none"
            />

            {/* Stickies */}
            {data.stickyNotes?.map(note => (
                <div key={note.id} className="absolute p-4 flex flex-col items-center justify-center text-center shadow-lg rounded-lg"
                    style={{ left: note.x, top: note.y, width: note.width || 200, height: note.height || 200, backgroundColor: note.color }}>
                    <div className="w-full h-full bg-transparent font-handwriting text-lg text-gray-800 overflow-hidden whitespace-pre-wrap break-words" style={{ fontFamily: '"Kalam", cursive' }}>
                        {note.text}
                    </div>
                </div>
            ))}

            {/* Text Items */}
            {data.textItems?.map(item => (
                <div key={item.id} className="absolute whitespace-pre" style={{ left: item.x, top: item.y }}>
                    <div className="font-sans text-2xl font-medium leading-tight text-foreground bg-transparent px-2 py-1"
                        style={{ color: item.color }}>
                        {item.text}
                    </div>
                </div>
            ))}

            {/* Croquis */}
            {data.croquis?.map(item => (
                <div key={item.id} className="absolute" style={{ left: item.x, top: item.y, width: item.width, height: item.height, opacity: item.opacity, transform: `scaleX(${item.isFlipped ? -1 : 1})` }}>
                    <img src={item.src} className="w-full h-full object-contain" alt="Croquis" />
                </div>
            ))}
        </div>
    );
};

export default MeetingRenderer;
