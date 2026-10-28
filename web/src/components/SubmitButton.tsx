"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingText,
  name,
  value,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} className={className} disabled={pending || disabled} onClick={onClick} aria-busy={pending}>
      {pending ? (pendingText ?? "One moment…") : children}
    </button>
  );
}
