import Link from "next/link";
import { ArrowRight, Zap, Image, Download, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold rounded-sm flex items-center justify-center">
              <span className="font-serif text-navy font-bold text-sm">S</span>
            </div>
            <span className="font-serif text-xl tracking-wide">StageAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm text-white/70 hover:text-white transition-colors hidden sm:block"
            >
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="text-sm bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-navy text-white pb-20 pt-16 sm:pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.1] tracking-tight">
              Stage entire listings{" "}
              <span className="text-gold">in minutes,</span>
              <br />
              not days.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed">
              AI-powered virtual staging that preserves every architectural
              detail. Upload photos, pick a style, get photorealistic results
              instantly.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-white px-6 py-3.5 rounded-xl font-medium transition-colors text-base"
              >
                Start Staging Free
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl font-medium transition-colors text-base"
              >
                View Pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/40">
              5 free staging credits. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Before/After Demo */}
      <section className="py-16 sm:py-24 bg-ivory-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl text-navy">
              See the transformation
            </h2>
            <p className="mt-3 text-slate max-w-lg mx-auto">
              Our AI adds furniture and decor while preserving every wall,
              window, and floor exactly as-is.
            </p>
          </div>
          <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-navy/10">
            <div className="aspect-[16/10] bg-gradient-to-br from-ivory to-ivory-light flex items-center justify-center">
              <div className="text-center px-8">
                <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Image size={32} className="text-gold" />
                </div>
                <p className="font-serif text-2xl text-navy mb-2">
                  Before & After Preview
                </p>
                <p className="text-slate text-sm max-w-md mx-auto">
                  Upload your first property photo to see StageAI in action.
                  The interactive comparison slider lets you see every detail.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 mt-6 bg-navy hover:bg-navy-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  Try It Now
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl text-navy">
              Built for real estate professionals
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: "Batch Processing",
                desc: "Stage 15-25 photos in one shot. Process an entire listing in under 5 minutes.",
              },
              {
                icon: Image,
                title: "10 Designer Styles",
                desc: "From Modern Minimalist to Art Deco. Pick up to 3 styles per listing.",
              },
              {
                icon: Download,
                title: "Multi-Format Export",
                desc: "MLS, Instagram, print-ready. Auto-watermark for compliance.",
              },
              {
                icon: Shield,
                title: "MLS Compliant",
                desc: "Auto \"Virtually Staged\" watermarks. Original photos always preserved.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-ivory-light/50 border border-navy/5 rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon size={20} className="text-gold" />
                </div>
                <h3 className="font-serif text-lg text-navy mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 sm:py-24 bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-white/60">
              Start free. Scale as you grow.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                credits: "5 photos",
                features: ["Single style", "MLS export"],
              },
              {
                name: "Pro",
                price: "$49",
                period: "/mo",
                credits: "100 photos/mo",
                features: [
                  "All 10 styles",
                  "All export formats",
                  "Batch processing",
                  "Image filters",
                ],
                popular: true,
              },
              {
                name: "Enterprise",
                price: "$149",
                period: "/mo",
                credits: "500 photos/mo",
                features: [
                  "Everything in Pro",
                  "Priority processing",
                  "Custom styles",
                  "API access",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 border ${
                  plan.popular
                    ? "border-gold bg-white/5 ring-1 ring-gold"
                    : "border-white/10"
                }`}
              >
                {plan.popular && (
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-gold">
                    Most Popular
                  </span>
                )}
                <h3 className="font-serif text-xl mt-1">{plan.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-serif">{plan.price}</span>
                  {plan.period && (
                    <span className="text-white/50 text-sm">{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-white/50 mt-1">{plan.credits}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="text-sm text-white/70 flex items-start gap-2"
                    >
                      <span className="text-gold mt-0.5">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className={`mt-6 block text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    plan.popular
                      ? "bg-gold hover:bg-gold-dark text-white"
                      : "border border-white/20 hover:bg-white/5 text-white"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-dark text-white/40 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gold/20 rounded-sm flex items-center justify-center">
              <span className="font-serif text-gold text-xs font-bold">S</span>
            </div>
            <span className="font-serif text-sm text-white/60">StageAI</span>
          </div>
          <p className="text-xs">
            &copy; {new Date().getFullYear()} StageAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
