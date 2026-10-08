"use client";

import { Children, isValidElement, useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Titel-Welle wie auf der CSP-Solutions-Website: Jeder Buchstabe erscheint von unsichtbar über CSP-Blau
 * zur normalen Farbe, diagonal von links oben nach rechts unten, sobald der Titel ins Bild kommt.
 * Texte werden als Buchstaben-Spans gerendert (kein nachträgliches DOM-Umbauen, React-sicher).
 */

function splitText(text: string, key: string): ReactNode[] {
  return text.split(/(\s+)/).map((part, i) =>
    /^\s+$/.test(part) || !part ? (
      part
    ) : (
      <span key={`${key}-${i}`} className="cw-w">
        {Array.from(part).map((c, j) => (
          <span key={j} className="ch">
            {c}
          </span>
        ))}
      </span>
    )
  );
}

/** Wandelt Strings (auch verschachtelt in einfachen Elementen) in Buchstaben-Spans um. */
function wave(node: ReactNode, key = "w"): ReactNode {
  if (typeof node === "string") return splitText(node, key);
  if (typeof node === "number") return splitText(String(node), key);
  if (Array.isArray(node)) return node.map((n, i) => wave(n, `${key}-${i}`));
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
    const El = node.type as ElementType;
    const { children, ...rest } = node.props as { children?: ReactNode } & Record<string, unknown>;
    return (
      <El key={node.key ?? key} {...rest}>
        {Children.map(children, (c, i) => wave(c, `${key}-${i}`))}
      </El>
    );
  }
  return node;
}

export function WaveHeading({
  as: Tag = "h1",
  className = "",
  children,
}: {
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const go = () => {
      const r = el.getBoundingClientRect();
      const chs = Array.from(el.querySelectorAll<HTMLElement>(".ch"));
      const ds = chs.map((c) => {
        const b = c.getBoundingClientRect();
        return b.left + b.width / 2 - r.left + (b.top + b.height / 2 - r.top) * 1.6;
      });
      const max = Math.max(1, ...ds);
      chs.forEach((c, k) => c.style.setProperty("--d", `${((ds[k] / max) * 0.85).toFixed(3)}s`));
      el.classList.add("cw-go");
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      el.classList.add("cw-go", "cw-still");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          go();
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`cw ${className}`}>
      {wave(children)}
    </Tag>
  );
}
