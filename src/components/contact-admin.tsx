"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { csWaLink } from "@/lib/contact";

export function ContactAdminButton({
  className,
  size = "sm",
  label,
  message,
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
  label?: string;
  message?: string;
}) {
  const t = useTranslation("contactAdmin");
  const href = csWaLink(message ?? t.waMessage);
  return (
    <Button variant="outline" size={size} className={className} asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        {label ?? t.label}
      </a>
    </Button>
  );
}
