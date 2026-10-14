"use client";

import { useState } from "react";

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="gallery">
      <div className="main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={alt} />
      </div>
      <div className="thumbs">
        {images.map((src, idx) => (
          <button key={src} className={idx === i ? "active" : ""} onClick={() => setI(idx)} aria-label={`Image ${idx + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}
