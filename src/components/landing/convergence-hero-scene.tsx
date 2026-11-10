"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  side: "buyer" | "merchant";
  life: number;
}

export function ConvergenceHeroScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle pool: azure for buyer (left), teal for merchant (right)
    const particles: Particle[] = [];
    const maxParticles = 90;

    const spawnParticle = (side?: "buyer" | "merchant"): Particle => {
      const isBuyer = side ? side === "buyer" : Math.random() > 0.5;
      const startX = isBuyer ? Math.random() * (width * 0.35) : width * 0.65 + Math.random() * (width * 0.35);
      const startY = Math.random() * height;
      const targetX = width * 0.5;
      const targetY = height * 0.5;

      const angle = Math.atan2(targetY - startY, targetX - startX) + (Math.random() - 0.5) * 0.4;
      const speed = 0.8 + Math.random() * 1.2;

      return {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 2,
        color: isBuyer ? "#2B7BD6" : "#0C9A8A",
        side: isBuyer ? "buyer" : "merchant",
        life: 0,
      };
    };

    for (let i = 0; i < maxParticles; i++) {
      particles.push(spawnParticle());
    }

    // Cursor influence
    let mouseX = width / 2;
    let mouseY = height / 2;
    let isHovering = false;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      isHovering = true;
    };
    const onMouseLeave = () => {
      isHovering = false;
      mouseX = width / 2;
      mouseY = height / 2;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const targetX = isHovering ? mouseX : width / 2;
      const targetY = isHovering ? mouseY : height / 2;

      // Central convergence glow node
      const gradient = ctx.createRadialGradient(targetX, targetY, 4, targetX, targetY, 70);
      gradient.addColorStop(0, "rgba(67, 80, 229, 0.4)");
      gradient.addColorStop(0.5, "rgba(67, 80, 229, 0.1)");
      gradient.addColorStop(1, "rgba(67, 80, 229, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 70, 0, Math.PI * 2);
      ctx.fill();

      // Central core pill
      ctx.fillStyle = "#4350E5";
      ctx.beginPath();
      ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life += 1;

        // Attract toward central node
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 15) {
          p.vx += (dx / dist) * 0.04;
          p.vy += (dy / dist) * 0.04;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Draw connecting trails between close particles of different sides
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          if (p.side !== p2.side) {
            const pDist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (pDist < 55) {
              ctx.strokeStyle = `rgba(122, 90, 224, ${0.35 * (1 - pDist / 55)})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }

        // Draw particle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Respawn if too close to center or died
        if (dist < 12 || p.life > 320) {
          particles[i] = spawnParticle(p.side);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[380px] sm:h-[460px] rounded-2xl border border-line bg-surface overflow-hidden shadow-2xl">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Convergence Labels */}
      <div className="absolute top-4 left-4 rounded-md border border-[var(--buyer)]/30 bg-[color-mix(in_srgb,var(--buyer)_12%,transparent)] px-2.5 py-1 text-[11px] font-mono text-[var(--buyer)] font-semibold">
        Buyer Thread (#2B7BD6)
      </div>

      <div className="absolute top-4 right-4 rounded-md border border-[var(--merchant)]/30 bg-[color-mix(in_srgb,var(--merchant)_12%,transparent)] px-2.5 py-1 text-[11px] font-mono text-[var(--merchant)] font-semibold">
        Merchant Thread (#0C9A8A)
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[var(--accent)]/40 bg-surface/90 px-3.5 py-1 text-xs font-mono text-fg shadow-lg backdrop-blur">
        Convergence Axis • Consensus
      </div>
    </div>
  );
}
