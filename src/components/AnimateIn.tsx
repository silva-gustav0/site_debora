"use client";

import { useEffect, useRef } from "react";

type Props = {
  animation?: "up" | "fade" | "left" | "right" | "scale";
  delay?: number;
  className?: string;
  children: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  /** Topo da página: anima já no primeiro desenho, sem esperar o JavaScript carregar. */
  immediate?: boolean;
};

export default function AnimateIn({
  animation = "up",
  delay,
  className = "",
  children,
  as: Tag = "div",
  immediate = false,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || immediate) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  const Element = Tag as React.ElementType;
  return (
    <Element
      ref={ref}
      data-animate={animation}
      data-delay={delay}
      className={immediate ? `${className} visible` : className}
    >
      {children}
    </Element>
  );
}
