import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/title/$type/$slug")({
  loader: () => {
    // Redireciona para home já que agora usamos links diretos da M3U
    throw notFound();
  },
  component: () => null
});
