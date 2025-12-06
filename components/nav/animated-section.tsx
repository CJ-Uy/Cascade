"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface AnimatedSectionProps {
  title: string;
  titleClassName?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isNested?: boolean;
}

export function AnimatedSection({
  title,
  titleClassName = "",
  children,
  defaultOpen = true,
  isNested = false,
}: AnimatedSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={isNested ? "pl-0" : ""}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between ${isNested ? "hover:bg-accent rounded-md px-2 py-1.5 text-xs" : "py-2 text-sm"} font-medium ${titleClassName}`}
      >
        <span>{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronDown className={isNested ? "h-3 w-3" : "h-4 w-4"} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.87, 0, 0.13, 1] }}
            style={{ overflow: "hidden" }}
            className={isNested ? "pl-2" : ""}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
