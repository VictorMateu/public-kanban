"use client";

import Image from "next/image";
import { useState } from "react";

export function ProjectCoverImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  // Each request must reach the controlled image route for its visibility check.
  return <Image src={src} alt={alt} fill unoptimized className="object-cover object-top" onError={() => setFailed(true)} />;
}
