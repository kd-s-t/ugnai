"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

export const easeOut = [0.22, 1, 0.36, 1] as const;

/**
 * True only after mount when motion is allowed.
 * SSR + first client paint stay static so hydration matches
 * (useReducedMotion is null on the server and can differ on the client).
 */
export function useMotionSafe() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return false;
  return !reduce;
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
};

/** Shorter travel / faster fade for citizen reporting flows. */
export const fadeUpLight: Variants = {
  hidden: { opacity: 0, y: 5 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.4, ease: easeOut },
  },
};

export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

export const staggerLight: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.035, delayChildren: 0.015 },
  },
};

type FadeProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  delay?: number;
  y?: number;
  /** Faster, shorter motion (reporting / forms). */
  light?: boolean;
};

/** Single fade/slide-in block. Honors prefers-reduced-motion. */
export function FadeIn({
  children,
  className,
  delay = 0,
  y,
  light = false,
  ...rest
}: FadeProps) {
  const safe = useMotionSafe();
  const travel = y ?? (light ? 5 : 12);
  const duration = light ? 0.2 : 0.45;
  if (!safe) {
    return (
      <div className={className} {...(rest as object)}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: travel }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: easeOut }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  light?: boolean;
};

/** Parent for staggered FadeItem children. */
export function Stagger({
  children,
  className,
  delay = 0,
  light = false,
}: StaggerProps) {
  const safe = useMotionSafe();
  if (!safe) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      variants={light ? staggerLight : stagger}
      initial="hidden"
      animate="show"
      transition={{ delayChildren: delay }}
    >
      {children}
    </motion.div>
  );
}

export function FadeItem({
  children,
  className,
  light = false,
}: {
  children: ReactNode;
  className?: string;
  light?: boolean;
}) {
  const safe = useMotionSafe();
  if (!safe) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      variants={light ? fadeUpLight : fadeUp}
    >
      {children}
    </motion.div>
  );
}
