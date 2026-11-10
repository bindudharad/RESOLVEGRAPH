"use client";

import React, { useRef, useState, useCallback, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface TiltCard3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  maxTilt?: number;
  depth?: number;
  disabled?: boolean;
}

/**
 * 3D Interactive Tilt Card
 * Transferred from modern 3D Web & React Bits patterns:
 * - Dynamic 3D perspective rotation tracking mouse pointer
 * - Calibrated spring physics for smooth return to rest
 * - Gliding specular sheen reflection tracking cursor coordinate
 * - Preserves full child DOM and accessibility
 */
export function TiltCard3D({
  children,
  className,
  glowColor = "rgba(99, 112, 245, 0.18)",
  maxTilt = 10,
  depth = 24,
  disabled = false,
  style,
  ...props
}: TiltCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Raw mouse coordinates relative to card center [-0.5, 0.5]
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring configuration
  const springConfig = { damping: 20, stiffness: 220, mass: 0.5 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // 3D Rotations
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [maxTilt, -maxTilt]);

  // Specular sheen coordinate percentage [0%, 100%]
  const sheenX = useTransform(smoothMouseX, [-0.5, 0.5], [0, 100]);
  const sheenY = useTransform(smoothMouseY, [-0.5, 0.5], [0, 100]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    },
    [disabled, mouseX, mouseY]
  );

  const handleMouseEnter = () => {
    if (!disabled) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("relative [perspective:1200px]", className)}
      style={style}
      {...props}
    >
      <motion.div
        style={{
          rotateX: disabled ? 0 : rotateX,
          rotateY: disabled ? 0 : rotateY,
          transformStyle: "preserve-3d",
          transform: isHovered && !disabled ? `translateZ(${depth}px)` : "translateZ(0px)",
        }}
        className="relative h-full w-full rounded-[inherit] transition-shadow duration-300"
      >
        {/* Children content layer */}
        <div className="relative h-full w-full rounded-[inherit]">
          {children}
        </div>

        {/* Specular Sheen Overlay */}
        {!disabled && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(circle 280px at ${sheenX.get()}% ${sheenY.get()}%, ${glowColor}, transparent 70%)`,
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
