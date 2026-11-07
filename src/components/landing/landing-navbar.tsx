"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X, ArrowRight, Sparkles } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
] as const;

const SCROLL_THRESHOLD = 100;
const HIDE_DELTA = 8;

/* -------------------------------------------------------------------------- */
/*  Announcement Banner                                                        */
/* -------------------------------------------------------------------------- */

function AnnouncementBanner({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "relative flex items-center justify-center gap-2 px-4 py-2",
              "text-[13px] font-medium text-white/90",
              "bg-gradient-to-r from-[#7c5cff]/80 via-[#6d4df7]/80 to-[#38bdf8]/80",
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>
              🚀 v2.0 — AI-Powered Resolution Engine is live
            </span>
            <Link
              href="#"
              className={cn(
                "ml-1 inline-flex items-center gap-1 rounded-full",
                "bg-white/15 px-2.5 py-0.5 text-[12px] font-semibold text-white",
                "transition-colors hover:bg-white/25",
              )}
            >
              Learn more
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*  Magnetic NavLink                                                           */
/* -------------------------------------------------------------------------- */

function NavLink({ href, label }: { href: string; label: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      ref={ref}
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative px-3 py-2"
    >
      <motion.span
        animate={{
          scale: hovered ? 1.05 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative z-10 text-sm font-medium text-muted transition-colors group-hover:text-fg"
      >
        {label}
      </motion.span>
      {/* Glow pill behind text on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            layoutId="nav-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className={cn(
              "absolute inset-0 -z-0 rounded-lg",
              "bg-white/[0.06]",
              "shadow-[0_0_12px_rgba(124,92,255,0.15)]",
            )}
          />
        )}
      </AnimatePresence>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mobile Menu Overlay                                                        */
/* -------------------------------------------------------------------------- */

function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.15 },
    },
    exit: {
      opacity: 0,
      transition: { staggerChildren: 0.03, staggerDirection: -1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.4, ease: "easeOut" as const },
    },
    exit: {
      opacity: 0,
      y: -12,
      filter: "blur(4px)",
      transition: { duration: 0.2 },
    },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed inset-0 z-[90] flex flex-col",
            "bg-app/95 backdrop-blur-2xl",
          )}
        >
          {/* Close button */}
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-2.5">
              <Logo />
              <span className="text-lg font-bold tracking-tight">
                <span className="text-white">RESOLVE</span>
                <span className="text-brand">GRAPH</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                "border border-line bg-surface/60 text-muted",
                "transition-colors hover:bg-surface-2 hover:text-fg",
              )}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Links */}
          <motion.nav
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-1 flex-col items-center justify-center gap-2"
          >
            {NAV_LINKS.map((link) => (
              <motion.div key={link.label} variants={itemVariants}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "block px-6 py-3 text-center text-2xl font-semibold",
                    "text-muted transition-colors hover:text-fg",
                  )}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}

            {/* CTA buttons */}
            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-col items-center gap-3"
            >
              <Link
                href="/sign-in"
                onClick={onClose}
                className={cn(
                  "rounded-full border border-line px-8 py-3 text-sm font-medium text-muted",
                  "transition-colors hover:border-line-2 hover:text-fg",
                )}
              >
                Sign In
              </Link>
              <Link
                href="/get-started"
                onClick={onClose}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full px-8 py-3",
                  "bg-gradient-to-r from-brand to-[#38bdf8] text-sm font-semibold text-white",
                  "shadow-[0_0_24px_rgba(124,92,255,0.35)]",
                  "transition-shadow hover:shadow-[0_0_32px_rgba(124,92,255,0.5)]",
                )}
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*  LandingNavbar                                                              */
/* -------------------------------------------------------------------------- */

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);

  /* --- Smart auto-hide logic --- */
  useMotionValueEvent(scrollY, "change", (latest) => {
    const delta = latest - lastScrollY.current;

    // Scrolling down past a threshold → hide
    if (delta > HIDE_DELTA && latest > 80) {
      setHidden(true);
    }
    // Scrolling up → show
    if (delta < -HIDE_DELTA) {
      setHidden(false);
    }

    // Past hero → opaque background
    setScrolled(latest > SCROLL_THRESHOLD);

    lastScrollY.current = latest;
  });

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      {/* Announcement Banner — only when not scrolled */}
      <AnnouncementBanner visible={!scrolled} />

      {/* Navbar */}
      <motion.header
        animate={{
          y: hidden ? -100 : 0,
          opacity: hidden ? 0 : 1,
        }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 right-0 left-0 z-50 flex justify-center px-4 pt-3"
        style={{ pointerEvents: hidden ? "none" : "auto" }}
      >
        <nav
          className={cn(
            /* Pill shape */
            "relative flex w-full max-w-5xl items-center justify-between",
            "rounded-2xl px-4 py-2.5 lg:px-6",
            /* Glassmorphism */
            "backdrop-blur-xl backdrop-saturate-150",
            "border border-white/[0.08]",
            "transition-all duration-500 ease-[var(--ease-out-soft)]",
            /* Gradient border glow (inner pseudo via shadow) */
            "shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.4)]",
            /* Background states */
            scrolled
              ? "bg-surface/80 border-white/[0.10] shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.10),0_12px_40px_rgba(0,0,0,0.5)]"
              : "bg-white/[0.04]",
          )}
        >
          {/* ---- Left: Logo ---- */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Logo />
            <span className="text-[15px] font-bold tracking-tight select-none">
              <span className="text-white">RESOLVE</span>
              <span className="text-brand">GRAPH</span>
            </span>
          </Link>

          {/* ---- Center: Nav Links (desktop) ---- */}
          <div className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.label} href={link.href} label={link.label} />
            ))}
          </div>

          {/* ---- Right: CTA (desktop) ---- */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/sign-in"
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium",
                "text-muted transition-colors",
                "hover:text-fg hover:bg-white/[0.06]",
              )}
            >
              Sign In
            </Link>
            <Link
              href="/get-started"
              className={cn(
                "group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full",
                "px-5 py-2 text-sm font-semibold text-white",
                "bg-gradient-to-r from-brand via-brand-solid to-[#38bdf8]",
                "shadow-[0_0_20px_rgba(124,92,255,0.3)]",
                "transition-shadow hover:shadow-[0_0_28px_rgba(124,92,255,0.45)]",
              )}
            >
              {/* Shine sweep on hover */}
              <span
                className={cn(
                  "absolute inset-0 -translate-x-full bg-gradient-to-r",
                  "from-transparent via-white/20 to-transparent",
                  "transition-transform duration-500 group-hover:translate-x-full",
                )}
              />
              <span className="relative z-10">Get Started</span>
              <ArrowRight className="relative z-10 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* ---- Hamburger (mobile) ---- */}
          <button
            onClick={() => setMobileOpen(true)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg md:hidden",
              "text-muted transition-colors hover:bg-white/[0.08] hover:text-fg",
            )}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* ---- Subtle gradient border edge (bottom glow) ---- */}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 -bottom-px h-px",
              "bg-gradient-to-r from-transparent via-brand/30 to-transparent",
              "opacity-0 transition-opacity duration-500",
              { "opacity-100": scrolled },
            )}
          />
        </nav>
      </motion.header>

      {/* Mobile menu overlay */}
      <MobileMenu open={mobileOpen} onClose={closeMobile} />
    </>
  );
}
