"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Settings, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold rounded flex items-center justify-center">
              <span className="font-serif text-white font-bold text-sm">S</span>
            </div>
            <span className="font-serif text-lg sm:text-xl tracking-wide">
              Stage<span className="text-gold/80">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            <NavLink href="/dashboard" icon={Home} label="Dashboard" active={pathname === "/dashboard"} />
            <NavLink href="/listing/new" icon={Plus} label="New Listing" active={pathname === "/listing/new"} />
            <NavLink href="/settings" icon={Settings} label="Settings" active={pathname === "/settings"} />
          </div>

          {/* Mobile: just show + button and hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/listing/new"
              className="w-8 h-8 bg-gold/20 hover:bg-gold/30 rounded-lg flex items-center justify-center transition-colors"
            >
              <Plus size={16} className="text-gold" />
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 text-white/60 hover:text-white"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="sm:hidden pb-3 space-y-0.5 border-t border-white/5 pt-2">
            <MobileLink href="/dashboard" label="Dashboard" onClick={() => setMobileOpen(false)} active={pathname === "/dashboard"} />
            <MobileLink href="/listing/new" label="New Listing" onClick={() => setMobileOpen(false)} active={pathname === "/listing/new"} />
            <MobileLink href="/settings" label="Settings" onClick={() => setMobileOpen(false)} active={pathname === "/settings"} />
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, icon: Icon, label, active }: { href: string; icon: typeof Home; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-white/10 text-gold" : "text-white/60 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}

function MobileLink({ href, label, onClick, active }: { href: string; label: string; onClick: () => void; active: boolean }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block px-3 py-2.5 rounded-lg text-sm ${
        active ? "bg-white/10 text-gold font-medium" : "text-white/60"
      }`}
    >
      {label}
    </Link>
  );
}
