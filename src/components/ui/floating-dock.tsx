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
}: {
    items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void; disableMagnification?: boolean }[];
    desktopClassName?: string;
    mobileClassName?: string;
}) => {
    return (
        <>
            <FloatingDockDesktop items={items} className={desktopClassName} />
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
    const [open, setOpen] = useState(false);
    return (
        <div className={cn("relative block md:hidden", className)}>
            <AnimatePresence>
                {open && (
                    <motion.div
                        layoutId="nav"
                        className="absolute bottom-full mb-2 inset-x-0 flex flex-col gap-2"
                    >
                        {items.map((item, idx) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                }}
                                exit={{
                                    opacity: 0,
                                    y: 10,
                                    transition: {
                                        delay: idx * 0.05,
                                    },
                                }}
                                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
                            >
                                <div
                                    onClick={item.onClick}
                                    key={item.title}
                                    className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center"
                                >
                                    <div className="h-4 w-4">{item.icon}</div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            <button
                onClick={() => setOpen(!open)}
                className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center"
            >
                <IconLayoutNavbarCollapse className="h-5 w-5 text-muted-foreground" />
            </button>
        </div>
    );
};

const FloatingDockDesktop = ({
    items,
    className,
}: {
    items: { title: string; icon: React.ReactNode; href?: string; onClick?: () => void; disableMagnification?: boolean }[];
    className?: string;
}) => {
    const mouseX = useMotionValue(Infinity);
    return (
        <motion.div
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            className={cn(
                "mx-auto hidden md:flex h-14 gap-4 items-end rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 px-4 pb-2 shadow-elevated",
                className
            )}
        >
            {items.map((item) => (
                <IconContainer mouseX={mouseX} key={item.title} {...item} />
            ))}
        </motion.div>
    );
};

function IconContainer({
    mouseX,
    title,
    icon,
    href,
    onClick,
    disableMagnification,
}: {
    mouseX: MotionValue;
    title: string;
    icon: React.ReactNode;
    href?: string;
    onClick?: () => void;
    disableMagnification?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);

    const distance = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

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
