import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$10",
    period: "/mo",
    credits: "50 staged images/mo",
    features: [
      "All 13 designer styles",
      "All export formats (MLS, IG, print)",
      "Batch processing",
      "Before/after comparison",
      "Edit & reprompt",
      "Auto room detection",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    credits: "200 staged images/mo",
    features: [
      "Everything in Starter",
      "Priority processing",
      "Color preferences",
      "Custom instructions",
      "Style preview before batch",
      "Generation history",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Agency",
    price: "$79",
    period: "/mo",
    credits: "750 staged images/mo",
    features: [
      "Everything in Pro",
      "3 team seats",
      "Listing sharing",
      "Custom brand watermark",
      "API access",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Brokerage",
    price: "$249",
    period: "/mo",
    credits: "3,000 staged images/mo",
    features: [
      "Everything in Agency",
      "Unlimited team seats",
      "Custom styles by our design team",
      "White-label option",
      "Dedicated Slack support",
      "Onboarding + training",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-ivory-light">
      <nav className="bg-navy text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gold rounded flex items-center justify-center">
              <span className="font-serif text-white font-bold text-base">S</span>
            </div>
            <span className="font-serif text-2xl tracking-wide">
              Stage<span className="text-gold">AI</span>
            </span>
          </Link>
          <Link href="/listing/new" className="text-sm bg-gold hover:bg-gold-dark text-white px-5 py-2.5 rounded-full transition-colors font-medium">
            Start Staging
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate hover:text-navy mb-8">
          <ArrowLeft size={14} />Back
        </Link>

        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gold mb-3">Pricing</p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-navy">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-slate max-w-md mx-auto">
            Start with 3 free stagings. No credit card required. Upgrade when you&apos;re ready.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl p-6 border-2 transition-shadow hover:shadow-lg ${
                plan.highlight
                  ? "border-gold shadow-lg shadow-gold/10"
                  : "border-navy/5"
              }`}
            >
              {plan.highlight && (
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gold">
                  Most Popular
                </span>
              )}
              <h2 className="font-serif text-xl text-navy mt-1">{plan.name}</h2>
              <div className="mt-3">
                <span className="text-3xl font-serif text-navy">{plan.price}</span>
                {plan.period && <span className="text-slate text-sm">{plan.period}</span>}
              </div>
              <p className="text-xs text-slate mt-1">{plan.credits}</p>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-navy/70 flex items-start gap-2">
                    <Check size={14} className="text-gold shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/listing/new"
                className={`mt-7 block text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  plan.highlight
                    ? "bg-gold hover:bg-gold-dark text-white"
                    : "border border-navy/10 text-navy hover:bg-ivory-light"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center space-y-2">
          <p className="text-sm text-slate">
            Need more? <span className="text-navy font-medium">$0.25/image</span> for overages on any plan.
          </p>
          <p className="text-sm text-slate">
            Enterprise needs? <a href="mailto:zoli@stageai.com" className="text-gold underline">Contact us</a> for custom pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
