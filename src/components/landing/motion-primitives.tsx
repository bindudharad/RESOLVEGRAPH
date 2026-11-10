"use client";

import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useScroll,
  useInView,
  animate,
  type Variants,
} from "framer-motion";
import {
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   1. FadeIn
   --------------------------------------------------------------------------- */

type FadeDirection = "up" | "down" | "left" | "right";

interface FadeInProps {
  children: ReactNode;
  direction?: FadeDirection;
  delay?: number;
  duration?: number;
  className?: string;
}

const directionOffset: Record<FadeDirection, { x: number; y: number }> = {
  up: { x: 0, y: 40 },
  down: { x: 0, y: -40 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 },
};

export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  className,
}: FadeInProps) {
  const offset = directionOffset[direction];

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
   2. StaggerContainer
   --------------------------------------------------------------------------- */

interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

const staggerContainerVariants = (
  staggerDelay: number,
): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className,
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainerVariants(staggerDelay)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
   3. StaggerItem
   --------------------------------------------------------------------------- */

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  },
};

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
   4. CountUp
   --------------------------------------------------------------------------- */

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  end,
  duration = 1.2,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const isInView = useInView(ref, { once: true, margin: "0px" });
  const [display, setDisplay] = useState(end);

  useEffect(() => {
    if (!isInView) return;

    motionVal.set(0);
    const controls = animate(motionVal, end, {
      duration,
      ease: [0.25, 0.4, 0.25, 1],
    });

    const unsubscribe = rounded.on("change", (v) => {
      setDisplay(v);
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [isInView, end, duration, motionVal, rounded]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   5. ParallaxSection
   --------------------------------------------------------------------------- */

interface ParallaxSectionProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export function ParallaxSection({
  children,
  speed = 0.5,
  className,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [speed * -100, speed * 100]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.div style={{ y: smoothY }}>{children}</motion.div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   6. GlowCard
   --------------------------------------------------------------------------- */

interface GlowCardProps {
  children: ReactNode;
  className?: string;
}

export function GlowCard({ children, className }: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), {
    stiffness: 200,
    damping: 20,
  });

  function handleMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
      }}
      className={cn(
        "group relative rounded-2xl p-px",
        className,
      )}
    >
      {/* Animated gradient glow border */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl opacity-40 blur-sm transition-opacity duration-500",
          "bg-[conic-gradient(from_var(--glow-angle),var(--color-brand)_0%,var(--color-brand-light,#60a5fa)_25%,var(--color-brand)_50%,var(--color-brand-light,#60a5fa)_75%,var(--color-brand)_100%)]",
          "group-hover:opacity-80",
        )}
        style={
          {
            "--glow-angle": "0deg",
            animation: "glow-spin 4s linear infinite",
          } as React.CSSProperties
        }
      />

      {/* Inner glassmorphic surface */}
      <div
        className={cn(
          "relative z-10 rounded-2xl",
          "bg-[var(--color-surface,#0f172a)]/80 backdrop-blur-xl",
          "border border-white/5",
        )}
      >
        {children}
      </div>

      {/* Inject keyframes */}
      <style>{`
        @keyframes glow-spin {
          from { --glow-angle: 0deg; }
          to   { --glow-angle: 360deg; }
        }
        @property --glow-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
      `}</style>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
   7. AnimatedText
   --------------------------------------------------------------------------- */

interface AnimatedTextProps {
  text: string;
  mode?: "word" | "char";
  className?: string;
  delay?: number;
}

export function AnimatedText({
  text,
  mode = "word",
  className,
  delay = 0,
}: AnimatedTextProps) {
  const tokens =
    mode === "word"
      ? text.split(/(\s+)/)       // keeps spaces as tokens
      : text.split("");

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: mode === "word" ? 0.08 : 0.03,
        delayChildren: delay,
      },
    },
  };

  const tokenVariants: Variants = {
    hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] },
    },
  };

  return (
    <motion.span
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className={cn("inline-flex flex-wrap", className)}
      aria-label={text}
    >
      {tokens.map((token, i) => {
        // Preserve whitespace tokens as literal spaces
        if (/^\s+$/.test(token)) {
          return (
            <span key={`ws-${i}`} className="whitespace-pre">
              {token}
            </span>
          );
        }

        return (
          <motion.span
            key={`${token}-${i}`}
            variants={tokenVariants}
            className="inline-block"
          >
            {token === " " ? "\u00A0" : token}
          </motion.span>
        );
      })}
    </motion.span>
  );
}

/* ---------------------------------------------------------------------------
   8. MagneticButton
   --------------------------------------------------------------------------- */

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

export function MagneticButton({
  children,
  className,
  strength = 0.3,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 200, damping: 20 });
  const smoothY = useSpring(y, { stiffness: 200, damping: 20 });

  function handleMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx * strength);
    y.set(dy * strength);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: smoothX, y: smoothY }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}
