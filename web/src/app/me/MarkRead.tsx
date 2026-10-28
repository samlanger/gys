"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/app/actions";

export function MarkRead() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => {
      void markNotificationsRead().then(() => router.refresh());
    }, 2500);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}
