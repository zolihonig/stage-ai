import Link from "next/link";
import { ArrowRight, Sparkles, Layers, Download, Shield, Clock, Palette } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ivory-light">
      {/* Nav — transparent on hero */}
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gold rounded flex items-center justify-center shadow-md">
              <span className="font-serif text-white font-bold text-base">S</span>
            </div>
            <span className="font-serif text-2xl tracking-wide text-white">
              Stage<span className="text-gold">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/pricing" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="text-sm bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-full font-medium transition-all border border-white/10"
            >
              Open App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — full viewport, cinematic */}
      <section className="relative min-h-[85vh] sm:min-h-screen bg-navy overflow-hidden flex items-center texture-noise">
        {/* Background image — faded staged room */}
        <div className="absolute inset-0 opacity-[0.07]">
          <img src="/styles/quiet_luxury.png" alt="" className="w-full h-full object-cover" />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy via-navy/95 to-navy" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-16 sm:pt-0 sm:pb-0 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <Sparkles size={14} className="text-gold" />
              <span className="text-xs text-gold font-medium tracking-wide">AI-Powered Virtual Staging</span>
            </div>

            <h1 className="font-serif text-[2.75rem] sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-white animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              Stage entire listings
              <br />
              <span className="text-gold italic">in minutes.</span>
            </h1>

            <p className="mt-7 text-lg sm:text-xl text-white/50 max-w-lg leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
              Upload property photos. Choose a style. Get back photorealistic
              staged images that preserve every architectural detail.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
              <Link
                href="/listing/new"
                className="inline-flex items-center justify-center gap-2.5 shimmer-gold text-white px-7 py-4 rounded-full font-medium transition-all text-base shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30"
              >
                Start Staging
                <ArrowRight size={18} />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 border border-white/15 hover:bg-white/5 text-white/70 hover:text-white px-7 py-4 rounded-full font-medium transition-all text-base"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>

        {/* Floating preview cards on right — desktop only */}
        <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div className="w-72 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10 rotate-2 img-hover-zoom">
              <img src="/styles/transitional.png" alt="Staged room" className="w-full aspect-[4/3] object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-white text-sm font-medium">Transitional</p>
                <p className="text-white/50 text-xs">Living Room</p>
              </div>
            </div>
            <div className="w-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10 absolute -bottom-16 -left-20 -rotate-3 img-hover-zoom">
              <img src="/styles/japandi.png" alt="Staged room" className="w-full aspect-[4/3] object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-white text-xs font-medium">Japandi</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-ivory-light to-transparent" />
      </section>

      {/* Social proof bar */}
      <section className="py-8 bg-ivory-light border-b border-navy/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-center">
          {[
            { value: "13", label: "Designer Styles" },
            { value: "<20s", label: "Per Image" },
            { value: "100%", label: "Architecture Preserved" },
            { value: "MLS", label: "Compliant Exports" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-serif text-2xl sm:text-3xl text-navy">{stat.value}</p>
              <p className="text-xs text-slate mt-0.5 tracking-wide uppercase">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="features" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gold mb-3">How It Works</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-navy">
              Three steps to a staged listing
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                title: "Upload Photos",
                desc: "Drag and drop your property photos. AI automatically detects each room type — kitchen, bedroom, bathroom, living room.",
                icon: Layers,
              },
              {
                step: "02",
                title: "Choose a Style",
                desc: "Pick from 13 designer styles like Japandi, Quiet Luxury, or Transitional. Add color preferences and custom instructions.",
                icon: Palette,
              },
              {
                step: "03",
                title: "Get Staged Photos",
                desc: "AI analyzes your room's lighting, dimensions, and architecture, then generates photorealistic staged images in seconds.",
                icon: Sparkles,
              },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                <div className="text-[5rem] font-serif text-navy/[0.04] leading-none absolute -top-4 -left-2">
                  {item.step}
                </div>
                <div className="relative">
                  <div className="w-12 h-12 bg-navy rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-navy/10">
                    <item.icon size={22} className="text-gold" />
                  </div>
                  <h3 className="font-serif text-xl text-navy mb-2">{item.title}</h3>
                  <p className="text-sm text-slate leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Style gallery */}
      <section className="py-20 sm:py-28 bg-ivory-light">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gold mb-3">Style Library</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-navy">
              13 curated design styles
            </h2>
            <p className="mt-3 text-slate max-w-lg mx-auto text-sm">
              From trending Japandi minimalism to timeless Traditional elegance.
              Each style is AI-optimized for photorealistic staging.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              "transitional", "modern_minimalist", "japandi", "organic_modern",
              "quiet_luxury", "scandinavian", "mid_century_modern", "modern_heritage",
              "coastal", "boho_chic", "traditional", "luxury_contemporary",
            ].map((id) => (
              <div key={id} className="group rounded-2xl overflow-hidden border border-navy/5 shadow-sm hover:shadow-xl transition-all duration-300 img-hover-zoom">
                <div className="aspect-[4/3] relative">
                  <img src={`/styles/${id}.png`} alt={id} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-sm font-medium capitalize">{id.replace(/_/g, " ")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gold mb-3">Features</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-navy">
              Built for real estate professionals
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Sparkles, title: "AI Room Analysis", desc: "Claude AI analyzes lighting, dimensions, and doorways to craft the perfect staging prompt." },
              { icon: Clock, title: "Batch Processing", desc: "Stage an entire listing — 15 to 25 photos — in one batch with consistent style." },
              { icon: Palette, title: "Style Switching", desc: "Try different styles on any photo. Keep all versions. Compare side by side." },
              { icon: Download, title: "Multi-Format Export", desc: "MLS, Instagram carousel, Reels, print flyer. Auto-watermark for compliance." },
              { icon: Shield, title: "MLS Compliant", desc: "\"Virtually Staged\" watermarks. Original photos always preserved alongside staged." },
              { icon: Layers, title: "Edit & Reprompt", desc: "Refine any staged image. Rearrange furniture, change artwork, add plants — one click." },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group bg-ivory-light/60 border border-navy/[0.04] rounded-2xl p-7 hover:bg-white hover:shadow-lg hover:border-navy/10 transition-all duration-300"
              >
                <div className="w-11 h-11 bg-navy/[0.04] group-hover:bg-navy rounded-xl flex items-center justify-center mb-4 transition-colors duration-300">
                  <feature.icon size={20} className="text-navy/30 group-hover:text-gold transition-colors duration-300" />
                </div>
                <h3 className="font-serif text-lg text-navy mb-1.5">{feature.title}</h3>
                <p className="text-sm text-slate leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-navy text-white relative overflow-hidden texture-noise">
        <div className="absolute inset-0 opacity-[0.05]">
          <img src="/styles/luxury_contemporary.png" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Ready to stage your next listing?
          </h2>
          <p className="mt-5 text-white/50 text-lg max-w-md mx-auto">
            Upload your first photo and see the transformation in seconds.
          </p>
          <Link
            href="/listing/new"
            className="inline-flex items-center gap-2.5 mt-8 shimmer-gold text-white px-8 py-4 rounded-full font-medium text-base shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30 transition-shadow"
          >
            Start Staging Now
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-dark text-white/30 py-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gold/15 rounded flex items-center justify-center">
              <span className="font-serif text-gold text-xs font-bold">S</span>
            </div>
            <span className="font-serif text-sm text-white/40">StageAI</span>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <Link href="/pricing" className="hover:text-white/60 transition-colors">Pricing</Link>
            <Link href="/dashboard" className="hover:text-white/60 transition-colors">Dashboard</Link>
          </div>
          <p className="text-xs">&copy; {new Date().getFullYear()} StageAI</p>
        </div>
      </footer>
    </div>
  );
}
