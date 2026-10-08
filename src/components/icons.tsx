import type { LucideIcon, LucideProps } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  LogOut,
  Shield,
  Sparkles,
  X,
} from "lucide-react";

/**
 * Lucide-Icons im CSP-Solutions-Stil: feine Linie (Strich 1.6), runde Enden, einfarbig (currentColor).
 * Dieselbe Bibliothek wie auf der Website und in den CSP-Slides.
 */
function csp(Icon: LucideIcon) {
  function CspIcon({ size = 16, strokeWidth = 1.6, ...props }: LucideProps) {
    return <Icon size={size} strokeWidth={strokeWidth} aria-hidden {...props} />;
  }
  return CspIcon;
}

export const IconArrowLeft = csp(ArrowLeft);
export const IconArrowRight = csp(ArrowRight);
export const IconArrowUpRight = csp(ArrowUpRight);
export const IconChevronDown = csp(ChevronDown);
export const IconChevronRight = csp(ChevronRight);
export const IconCheck = csp(CircleCheck);
export const IconLogout = csp(LogOut);
export const IconShield = csp(Shield);
export const IconSparkles = csp(Sparkles);
export const IconClose = csp(X);
