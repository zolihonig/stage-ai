import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    credits: "5 photos",
    features: [
      "Single style per listing",
      "MLS export format",
      "Before/after comparison",
      "Auto room detection",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    credits: "100 photos/mo",
    features: [
      "All 10 designer styles",
      "All export formats",
      "Batch processing",
      "Image enhancement filters",
      "Custom style instructions",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "$149",
    period: "/mo",
    credits: "500 photos/mo",
    features: [
      "Everything in Pro",
      "Priority AI processing",
      "Custom brand styles",
      "API access",
      "Team sharing (coming soon)",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-ivory-light">
      <nav className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold rounded-sm flex items-center justify-center">
              <span className="font-serif text-navy font-bold text-sm">S</span>
            </div>
            <span className="font-serif text-xl tracking-wide">StageAI</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate hover:text-navy mb-6"
        >
          <ArrowLeft size={14} />
          Back
        </Link>

        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl sm:text-4xl text-navy">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-slate max-w-md mx-auto">
            Start with 5 free staging credits. Upgrade when you&apos;re ready.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl p-6 border-2 ${
                plan.highlight
                  ? "border-gold shadow-lg shadow-gold/10 ring-1 ring-gold/20"
                  : "border-navy/10"
              }`}
            >
              {plan.highlight && (
                <span className="text-[10px] font-semibold tracking-wider uppercase text-gold">
                  Most Popular
                </span>
              )}
              <h2 className="font-serif text-2xl text-navy mt-1">
                {plan.name}
              </h2>
              <div className="mt-3">
                <span className="text-4xl font-serif text-navy">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-slate text-sm">{plan.period}</span>
                )}
              </div>
              <p className="text-sm text-slate mt-1">{plan.credits}</p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="text-sm text-navy/80 flex items-start gap-2"
                  >
                    <Check size={16} className="text-gold shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard"
                className={`mt-8 block text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  plan.highlight
                    ? "bg-gold hover:bg-gold-dark text-white"
                    : "border border-navy/15 text-navy hover:bg-ivory-light"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate">
            Need more?{" "}
            <span className="text-navy font-medium">$0.50/photo</span> for
            overages on any plan.
          </p>
        </div>
      </div>
    </div>
  );
}
