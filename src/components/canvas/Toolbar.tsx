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
  Shirt,
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
import mannequinIcon from "@/assets/mannequin_icon.png";

const CROQUIS_ASSETS = {
  female: [f1, f2, f3, f4, f5],
  male: [m1, m2, m3, m4, m5],
  mannequin: [mannequin]
};
import { useRef, useState, useEffect } from "react";

interface ToolbarProps {
  tool: 'brush' | 'eraser' | 'select' | 'sticky' | 'text';
  setTool: (tool: 'brush' | 'eraser' | 'select' | 'sticky' | 'text') => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  stickyColor?: string;
  setStickyColor?: (color: string) => void;
  onAddCroquis: (src: string) => void;
  onUndo: () => void;
  onClear: () => void;
}

// Helper for slider inside floating dock item
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
  return (
    <div className="relative group flex items-center justify-center w-full h-full">
      {/* Slider Popup */}
      <div
        className="absolute bottom-6 flex flex-col items-center pb-8 hidden group-hover:flex z-50 pointer-events-none"
      >
        <div
          className="p-3 bg-popover/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-elevated animate-in fade-in slide-in-from-bottom-2 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-28 w-4 flex items-center justify-center pb-1">
            <Slider
              defaultValue={[value]}
              value={[value]}
              max={max}
              min={1}
              step={1}
              orientation="vertical"
              onValueChange={(vals) => onChange(vals[0])}
              className="h-24 w-4"
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground w-max mt-2">{value}px</span>
        </div>
      </div>

      <Icon className={cn(
        "w-5 h-5 transition-colors",
        isActive ? "text-primary fill-primary/20" : "text-foreground"
      )} />
    </div>
  );
};

// Helper for color picker inside floating dock item
const ColorPickerIcon = ({
  currentColor,
  onColorSelect
}: {
  currentColor: string,
  onColorSelect: (color: string) => void
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleInteraction = (e: React.MouseEvent) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;

    // Calculate angle in degrees (0-360)
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    let degrees = angle + 90; // Adjust for CSS 0deg at top
    if (degrees < 0) degrees += 360;

    // Set color using HSL
    onColorSelect(`hsl(${Math.round(degrees)}, 100%, 50%)`);
  };

  const GRAYSCALE = ['#000000', '#4A4A4A', '#808080', '#D3D3D3', '#FFFFFF'];

  return (
    <div className="relative group flex items-center justify-center w-full h-full">
      {/* Color Grid Popup */}
      <div
        className="absolute bottom-6 flex flex-col items-center pb-8 hidden group-hover:flex z-50 pointer-events-none"
      >
        <div
          className="flex flex-col items-center gap-4 p-4 bg-popover/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-elevated animate-in fade-in slide-in-from-bottom-2 w-max pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Color Wheel */}
          <div
            ref={wheelRef}
            className="w-32 h-32 rounded-full cursor-crosshair shadow-sm active:scale-95 transition-transform"
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

          {/* Grayscale & Current */}
          <div className="flex items-center gap-2">
            {GRAYSCALE.map(color => (
              <button
                key={color}
                className={cn(
                  "w-5 h-5 rounded-full border border-border shadow-sm hover:scale-110 transition-transform",
                  currentColor === color && "ring-2 ring-primary ring-offset-2"
                )}
                style={{ backgroundColor: color }}
                onClick={() => onColorSelect(color)}
              />
            ))}
          </div>
        </div>
      </div>

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

const CroquisPickerIcon = ({ onSelect }: { onSelect: (src: string) => void }) => {
  const [category, setCategory] = useState<'female' | 'male' | 'mannequin'>('female');

  return (
    <div className="relative group flex items-center justify-center w-full h-full">
      <div className="absolute bottom-6 flex flex-col items-center pb-8 hidden group-hover:flex z-50 pointer-events-none">
        <div
          className="bg-popover/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-elevated animate-in fade-in slide-in-from-bottom-2 pointer-events-auto w-64 p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1 mb-3 justify-center bg-muted/50 p-1 rounded-lg">
            {(['female', 'male', 'mannequin'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "flex-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-1.5 rounded-md transition-all",
                  category === cat ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {CROQUIS_ASSETS[category].map((src, i) => (
              <button
                key={i}
                onClick={() => onSelect(src)}
                className="relative aspect-[3/5] border border-border/50 rounded-md overflow-hidden bg-white/50 hover:border-primary/50 hover:shadow-sm transition-all group/item"
              >
                <img src={src} alt="croquis" className="w-full h-full object-contain p-1" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <img src={mannequinIcon} alt="Croquis" className="w-full h-full object-contain p-1 invert dark:invert-0 opacity-80 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const StickyPickerIcon = ({
  isActive,
  currentColor,
  onColorSelect,
}: {
  isActive: boolean,
  currentColor?: string,
  onColorSelect?: (color: string) => void
}) => {
  const PASTELS = [
    '#fef3c7', // Yellow (amber-100)
    '#fce7f3', // Pink (pink-100)
    '#dbeafe', // Blue (blue-100)
    '#dcfce7', // Green (green-100)
  ];

  return (
    <div className="relative group flex items-center justify-center w-full h-full">
      {/* Sticky Color Popup */}
      <div
        className="absolute bottom-6 flex flex-col items-center pb-8 hidden group-hover:flex z-50 pointer-events-none"
      >
        <div
          className="p-3 bg-popover/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-elevated animate-in fade-in slide-in-from-bottom-2 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-2">
            {PASTELS.map(color => (
              <button
                key={color}
                className={cn(
                  "w-6 h-6 rounded-md border border-border/50 shadow-sm hover:scale-110 transition-transform",
                  currentColor === color && "ring-2 ring-primary ring-offset-2"
                )}
                style={{ backgroundColor: color }}
                onClick={() => onColorSelect?.(color)}
              />
            ))}
          </div>
        </div>
      </div>

      <StickyNote className={cn(
        "w-5 h-5 transition-colors",
        isActive ? "text-primary fill-primary/20" : "text-foreground"
      )} />
      {/* Show tiny dot of current sticky color */}
      {currentColor && (
        <div
          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-sm border border-card shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"
          style={{ backgroundColor: currentColor }}
        />
      )}
    </div>
  );
};

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
}: ToolbarProps) => {

  const items = [
    {
      title: "Croquis",
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
      onClick: () => setTool('sticky')
    },
    {
      title: "Color",
      icon: (
        <ColorPickerIcon
          currentColor={brushColor}
          onColorSelect={setBrushColor}
        />
      ),
      onClick: () => { }, // Handled by inner buttons
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
    },
    {
      title: "Undo",
      icon: <Undo2 className="w-5 h-5 text-foreground" />,
      onClick: onUndo,
    },
    {
      title: "Clear",
      icon: <Trash2 className="w-5 h-5 text-destructive" />,
      onClick: onClear,
    },
  ];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-40 max-w-full">
      {/* Main Dock */}
      <FloatingDock
        items={items}
        desktopClassName="bg-card/90 backdrop-blur-xl border-border/50 shadow-2xl"
      />
    </div>
  );
};

export default Toolbar;
