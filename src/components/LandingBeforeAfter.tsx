"use client";

import BeforeAfterSlider from "./BeforeAfterSlider";

export default function LandingBeforeAfter() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-navy/10">
      <BeforeAfterSlider
        beforeSrc="/demo-before.jpg"
        afterSrc="/styles/quiet_luxury.png"
        beforeLabel="Empty Room"
        afterLabel="Quiet Luxury"
        className="aspect-[4/3]"
      />
    </div>
  );
}
