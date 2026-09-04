"use client";

import { use } from "react";
import { JourneyScreen } from "@/components/journey-screen";

export default function JourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <JourneyScreen journeyId={id} />;
}
