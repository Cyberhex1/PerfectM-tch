"use client";

import { useEffect, useState } from "react";

/** Renders a Blob stored on the device, releasing its object URL when done. */
export function BlobImage({ blob, alt, className }: { blob: Blob; alt: string; className?: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URLs must be created and revoked in step with the blob
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  // eslint-disable-next-line @next/next/no-img-element -- local blob, not a remote image
  return url ? <img src={url} alt={alt} className={className} draggable={false} /> : <span className={className} />;
}
