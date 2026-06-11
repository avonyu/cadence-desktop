import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

interface SplashScreenProps {
  visible: boolean;
}

export function SplashScreen({ visible }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center gap-3 bg-background"
        >
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-2xl font-medium tracking-wide text-foreground"
          >
            Cadence
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
