import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  Pencil,
  Eraser,
  MousePointer2,
  Undo2,
  Trash2,
  Palette,
  StickyNote,
  Type,
  PaintBucket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import m1 from "@/assets/Croquis Library/m1.png";
import m2 from "@/assets/Croquis Library/m2.png";
import m3 from "@/assets/Croquis Library/m3.png";
import m4 from "@/assets/Croquis Library/m4.png";
import m5 from "@/assets/Croquis Library/m5.png";
import f1 from "@/assets/Croquis Library/f1.png";
import f2 from "@/assets/Croquis Library/f2.png";
import f3 from "@/assets/Croquis Library/f3.png";
import f4 from "@/assets/Croquis Library/f4.png";
import f5 from "@/assets/Croquis Library/f5.png";
import mannequin from "@/assets/Croquis Library/mannequin.png";
import mannequinIcon from "@/assets/mannequin_icon.svg";

const CROQUIS_ASSETS = {
  female: [f1, f2, f3, f4, f5],
  male: [m1, m2, m3, m4, m5],
  mannequin: [mannequin]
};
import { useRef, useState } from "react";

interface ToolbarProps {
  tool: 'brush' | 'eraser' | 'select' | 'sticky' | 'text' | 'fill';
  setTool: (tool: 'brush' | 'eraser' | 'select' | 'sticky' | 'text' | 'fill') => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  stickyColor?: string;
  setStickyColor?: (color: string) => void;
  fillColor?: string;
  setFillColor?: (color: string) => void;
  onAddCroquis: (src: string) => void;
  onUndo: () => void;
  onClear: () => void;
}

// Slider Component for Pencil/Eraser thickness
const ToolIconWithSlider = ({
  icon: Icon,
  isActive,
  value,
  onChange,
  max = 20
}: {
  icon: any,
  isActive: boolean,
  value: number,
  onChange: (val: number) => void,
  max?: number
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsHovered(false), 300);
  };

  return (
    <div
      className="relative flex items-center justify-center w-full h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered && (
        <div className="absolute left-[calc(100%+24px)] top-1/2 -translate-y-1/2 z-[100]">
          <div
            className="p-3 bg-popover/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl animate-in fade-in slide-in-from-left-2 pointer-events-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-1">
              <Slider
                value={[value]}
                max={max}
                min={1}
                step={1}
                onValueChange={(vals) => onChange(vals[0])}
                className="w-32"
              />
              <span className="text-sm font-semibold text-foreground min-w-[45px]">{value}px</span>
            </div>
          </div>
        </div>
      )}

      <Icon className={cn(
        "w-5 h-5 transition-colors",
        isActive ? "text-primary fill-primary/20" : "text-foreground"
      )} />
    </div>
  );
};

// Color Picker Component for Brush
const ColorPickerIcon = ({
  currentColor,
  onColorSelect
}: {
  currentColor: string,
  onColorSelect: (color: string) => void
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsHovered(false), 300);
  };

  const handleInteraction = (e: React.MouseEvent) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;

    const angle = Math.atan2(y, x) * (180 / Math.PI);
    let degrees = angle + 90;
    if (degrees < 0) degrees += 360;

    onColorSelect(`hsl(${Math.round(degrees)}, 100%, 50%)`);
  };

  const GRAYSCALE = ['#000000', '#4A4A4A', '#808080', '#D3D3D3', '#FFFFFF'];

  return (
    <div
      className="relative flex items-center justify-center w-full h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered && (
        <div className="absolute left-[calc(100%+24px)] top-1/2 -translate-y-1/2 z-[100]">
          <div
            className="flex flex-col items-center gap-4 p-4 bg-popover/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl animate-in fade-in slide-in-from-left-2 pointer-events-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase">Brush Color</span>

            <div
              ref={wheelRef}
              className="w-36 h-36 rounded-full cursor-crosshair shadow-md active:scale-95 transition-transform"
              style={{
                background: `conic-gradient(
                  #FF0000 0deg 30deg,
                  #FF8000 30deg 60deg,
                  #FFFF00 60deg 90deg,
                  #80FF00 90deg 120deg,
                  #00FF00 120deg 150deg,
                  #00FF80 150deg 180deg,
                  #00FFFF 180deg 210deg,
                  #0080FF 210deg 240deg,
                  #0000FF 240deg 270deg,
                  #8000FF 270deg 300deg,
                  #FF00FF 300deg 330deg,
                  #FF0080 330deg 360deg
                )`
              }}
              onClick={handleInteraction}
              onMouseMove={(e) => {
                if (e.buttons === 1) handleInteraction(e)
              }}
            />

            <div className="flex items-center gap-2">
              {GRAYSCALE.map(color => (
                <button
                  key={color}
                  className={cn(
                    "w-6 h-6 rounded-full border border-border shadow-sm hover:scale-110 transition-transform",
                    currentColor === color && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorSelect(color)}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
              <div
                className="w-8 h-8 rounded-md border-2 border-border shadow-sm"
                style={{ backgroundColor: currentColor }}
              />
              <span className="text-xs font-mono">{currentColor}</span>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <Palette className="w-5 h-5 text-foreground" />
        <div
          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-card shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"
          style={{ backgroundColor: currentColor }}
        />
      </div>
    </div>
  );
};

// Croquis Library Component
const CroquisPickerIcon = ({ onSelect }: { onSelect: (src: string) => void }) => {
  const [category, setCategory] = useState<'female' | 'male' | 'mannequin'>('female');
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsHovered(false), 300);
  };

  return (
    <div
      className="relative flex items-center justify-center w-full h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered && (
        <div className="absolute left-[calc(100%+24px)] top-1/2 -translate-y-1/2 z-[100]">
          <div
            className="bg-popover/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl p-4 w-72 animate-in fade-in slide-in-from-left-2 pointer-events-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 text-center">
              Croquis Library
            </h3>

            <div className="flex gap-1 mb-3 bg-muted/50 p-1 rounded-lg">
              {(['female', 'male', 'mannequin'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "flex-1 text-[11px] uppercase tracking-wider font-semibold px-3 py-2 rounded-md transition-all",
                    category === cat
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-2">
              {CROQUIS_ASSETS[category].map((src, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(src)}
                  className="relative aspect-[3/5] border-2 border-border/50 rounded-lg overflow-hidden bg-white/50 hover:border-primary hover:shadow-md transition-all hover:scale-105"
                >
                  <img src={src} alt={`${category} ${i + 1}`} className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <img
        src={mannequinIcon}
        alt="Croquis"
        className="w-7 h-7 object-contain invert dark:invert-0 opacity-80 hover:opacity-100 transition-opacity"
      />
    </div>
  );
};

// Sticky Note Color Picker
const StickyPickerIcon = ({
  isActive,
  currentColor,
  onColorSelect,
}: {
  isActive: boolean,
  currentColor?: string,
  onColorSelect?: (color: string) => void
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const PASTELS = [
    { color: '#fef3c7', name: 'Yellow' },
    { color: '#fce7f3', name: 'Pink' },
    { color: '#dbeafe', name: 'Blue' },
    { color: '#dcfce7', name: 'Green' },
  ];

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsHovered(false), 300);
  };

  return (
    <div
      className="relative flex items-center justify-center w-full h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered && (
        <div className="absolute left-[calc(100%+24px)] top-1/2 -translate-y-1/2 z-[100]">
          <div
            className="p-4 bg-popover/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl animate-in fade-in slide-in-from-left-2 pointer-events-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase mb-3 block text-center">
              Sticky Color
            </span>
            <div className="flex flex-col gap-2">
              {PASTELS.map(({ color, name }) => (
                <button
                  key={color}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 hover:border-primary transition-all",
                    currentColor === color && "ring-2 ring-primary bg-primary/5"
                  )}
                  onClick={() => onColorSelect?.(color)}
                >
                  <div
                    className="w-8 h-8 rounded-md border border-border shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium">{name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <StickyNote className={cn(
        "w-5 h-5 transition-colors",
        isActive ? "text-primary fill-primary/20" : "text-foreground"
      )} />

      {currentColor && (
        <div
          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-sm border border-card shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"
          style={{ backgroundColor: currentColor }}
        />
      )}
    </div>
  );
};

// Fill Tool Color Picker
const FillPickerIcon = ({
  isActive,
  currentColor,
  onColorSelect,
}: {
  isActive: boolean,
  currentColor: string,
  onColorSelect: (color: string) => void
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsHovered(false), 300);
  };

  const FILL_COLORS = [
    '#FF0000', '#FF8000', '#FFFF00', '#00FF00',
    '#00FFFF', '#0000FF', '#FF00FF', '#FF0080',
    '#000000', '#4A4A4A', '#808080', '#D3D3D3',
    '#FFFFFF', '#8B4513', '#FFB6C1', '#E6E6FA',
  ];

  return (
    <div
      className="relative flex items-center justify-center w-full h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered && (
        <div className="absolute left-[calc(100%+24px)] top-1/2 -translate-y-1/2 z-[100]">
          <div
            className="p-4 bg-popover/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl animate-in fade-in slide-in-from-left-2 pointer-events-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase mb-3 block text-center">
              Fill Color
            </span>
            <div className="grid grid-cols-4 gap-2">
              {FILL_COLORS.map(color => (
                <button
                  key={color}
                  className={cn(
                    "w-8 h-8 rounded-lg border-2 border-border hover:scale-110 transition-transform shadow-sm",
                    currentColor === color && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <PaintBucket className={cn(
          "w-5 h-5 transition-colors",
          isActive ? "text-primary fill-primary/20" : "text-foreground"
        )} />
        <div
          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-card shadow-sm"
          style={{ backgroundColor: currentColor }}
        />
      </div>
    </div>
  );
};

/**
 * Floating Toolbar
 * 
 * The main control center for the whiteboard, created using `FloatingDock`.
 * Tools:
 * - Croquis Library: Drag and drop fashion templates.
 * - Brushes/Erasers: With slider-based size/color controls.
 * - Objects: Sticky Notes, Text.
 * - Canvas Actions: Undo, Clear, Fill.
 */
const Toolbar = ({
  tool,
  setTool,
  brushColor,
  setBrushColor,
  brushWidth,
  setBrushWidth,
  stickyColor,
  setStickyColor,
  onAddCroquis,
  onUndo,
  onClear,
  fillColor = '#000000',
  setFillColor,
}: ToolbarProps) => {

  const items = [
    {
      title: "Croquis Library",
      icon: <CroquisPickerIcon onSelect={onAddCroquis} />,
      onClick: () => { },
      disableMagnification: true,
    },
    {
      title: "Select",
      icon: <MousePointer2 className={cn("w-5 h-5", tool === 'select' ? "text-primary fill-primary/20" : "text-foreground")} />,
      onClick: () => setTool('select'),
    },
    {
      title: "Text",
      icon: <Type className={cn("w-5 h-5", tool === 'text' ? "text-primary fill-primary/20" : "text-foreground")} />,
      onClick: () => setTool('text'),
    },
    {
      title: "Sticky Note",
      icon: (
        <StickyPickerIcon
          isActive={tool === 'sticky'}
          currentColor={stickyColor}
          onColorSelect={(color) => {
            setStickyColor?.(color);
            setTool('sticky');
          }}
        />
      ),
      onClick: () => setTool('sticky'),
      disableMagnification: true,
    },
    {
      title: "Brush Color",
      icon: (
        <ColorPickerIcon
          currentColor={brushColor}
          onColorSelect={setBrushColor}
        />
      ),
      onClick: () => { },
      disableMagnification: true,
    },
    {
      title: "Pencil",
      icon: (
        <ToolIconWithSlider
          icon={Pencil}
          isActive={tool === 'brush'}
          value={brushWidth}
          onChange={setBrushWidth}
          max={40}
        />
      ),
      onClick: () => setTool('brush'),
      disableMagnification: true,
    },
    {
      title: "Eraser",
      icon: (
        <ToolIconWithSlider
          icon={Eraser}
          isActive={tool === 'eraser'}
          value={brushWidth}
          onChange={setBrushWidth}
          max={60}
        />
      ),
      onClick: () => setTool('eraser'),
      disableMagnification: true,
    },
    {
      title: "Fill Tool",
      icon: (
        <FillPickerIcon
          isActive={tool === 'fill'}
          currentColor={fillColor}
          onColorSelect={(color) => {
            setFillColor?.(color);
            setTool('fill');
          }}
        />
      ),
      onClick: () => setTool('fill'),
      disableMagnification: true,
    },
    {
      title: "Undo",
      icon: <Undo2 className="w-5 h-5 text-foreground" />,
      onClick: onUndo,
    },
    {
      title: "Clear Canvas",
      icon: <Trash2 className="w-5 h-5 text-destructive" />,
      onClick: onClear,
    },
  ];

  return (
    <FloatingDock
      items={items}
      orientation="vertical"
      desktopClassName="fixed left-4 top-[55%] -translate-y-1/2 z-40"
      mobileClassName="fixed left-4 top-[55%] -translate-y-1/2 z-40"
    />
  );
};

export default Toolbar;
