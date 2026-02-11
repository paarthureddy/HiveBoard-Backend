import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
}

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Are you sure?",
    message = "This action cannot be undone.",
    confirmText = "Confirm",
    cancelText = "Cancel"
}: ConfirmationModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 flex flex-col items-center text-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>

                                <h3 className="text-xl font-bold text-foreground font-display">{title}</h3>

                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {message}
                                </p>

                                <div className="flex gap-3 w-full mt-4">
                                    <Button variant="outline" className="flex-1" onClick={onClose}>
                                        {cancelText}
                                    </Button>
                                    <Button variant="destructive" className="flex-1" onClick={() => { onConfirm(); onClose(); }}>
                                        {confirmText}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
