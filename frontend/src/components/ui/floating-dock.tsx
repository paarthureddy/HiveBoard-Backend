import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
    AnimatePresence,
    MotionValue,
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from "framer-motion";
import { useRef, useState } from "react";

export const FloatingDock = ({
    items,
    desktopClassName,
    mobileClassName,
    orientation = "horizontal",
}: {
    items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void; disableMagnification?: boolean }[];
    desktopClassName?: string;
    mobileClassName?: string;
    orientation?: "horizontal" | "vertical";
}) => {
    return (
        <>
            <FloatingDockDesktop items={items} className={desktopClassName} orientation={orientation} />
            <FloatingDockMobile items={items} className={mobileClassName} />
        </>
    );
};

const FloatingDockMobile = ({
    items,
    className,
}: {
    items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void; disableMagnification?: boolean }[];
    className?: string;
}) => {
    return (
        <div className={cn("fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-4 md:hidden", className)}>
            <motion.div
                className="flex flex-row gap-3 items-center rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-elevated px-4 py-3 max-w-[90vw] overflow-x-auto no-scrollbar"
            >
                {items.map((item) => (
                    <div key={item.title} onClick={item.onClick} className="relative group">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary/50 border border-border/50">
                            {item.icon}
                        </div>
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

const FloatingDockDesktop = ({
    items,
    className,
    orientation,
}: {
    items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void; disableMagnification?: boolean }[];
    className?: string;
    orientation?: "horizontal" | "vertical";
}) => {
    const mousePos = useMotionValue(Infinity);
    return (
        <motion.div
            onMouseMove={(e) => mousePos.set(orientation === "vertical" ? e.pageY : e.pageX)}
            onMouseLeave={() => mousePos.set(Infinity)}
            className={cn(
                "hidden md:flex mx-auto gap-4 items-center rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-elevated",
                orientation === "vertical"
                    ? "flex-col w-16 h-auto py-4 overflow-visible" // Vertical styles: allow popups to extend out
                    : "flex-row h-16 px-4 max-w-[95vw] overflow-x-auto overflow-y-hidden", // Horizontal styles: scroll if needed
                className
            )}
        >
            {items.map((item) => (
                <IconContainer mousePos={mousePos} key={item.title} {...item} orientation={orientation} />
            ))}
        </motion.div>
    );
};

function IconContainer({
    mousePos,
    title,
    icon,
    href,
    onClick,
    disableMagnification,
    orientation,
}: {
    mousePos: MotionValue;
    title: string;
    icon: React.ReactNode;
    href?: string;
    onClick?: () => void;
    disableMagnification?: boolean;
    orientation?: "horizontal" | "vertical";
}) {
    const ref = useRef<HTMLDivElement>(null);

    const distance = useTransform(mousePos, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0, y: 0, height: 0 };
        if (orientation === "vertical") {
            return val - bounds.y - bounds.height / 2;
        }
        return val - bounds.x - bounds.width / 2;
    });

    const widthTransform = useTransform(distance, [-120, 0, 120], disableMagnification ? [40, 40, 40] : [35, 70, 35]);
    const heightTransform = useTransform(distance, [-120, 0, 120], disableMagnification ? [40, 40, 40] : [35, 70, 35]);

    const width = useSpring(widthTransform, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });
    const height = useSpring(heightTransform, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });

    const iconScale = useTransform(distance, [-120, 0, 120], disableMagnification ? [1, 1, 1] : [1, 1.4, 1]);
    const scale = useSpring(iconScale, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });

    const [hovered, setHovered] = useState(false);

    return (
        <div onClick={onClick} className="cursor-pointer">
            <motion.div
                ref={ref}
                style={{ width, height }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className="aspect-square rounded-full bg-secondary/50 border border-border/50 flex items-center justify-center relative hover:bg-secondary transition-colors"
            >
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, x: "-50%" }}
                            animate={{ opacity: 1, y: 0, x: "-50%" }}
                            exit={{ opacity: 0, y: 2, x: "-50%" }}
                            className="px-2 py-0.5 whitespace-pre rounded-md bg-popover border border-border text-popover-foreground absolute left-1/2 -translate-x-1/2 -top-8 w-fit text-xs z-50 pointer-events-none"
                        >
                            {title}
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.div
                    style={{ scale }}
                    className="flex items-center justify-center h-full w-full"
                >
                    {icon}
                </motion.div>
            </motion.div>
        </div>
    );
}
