"use client";

import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getApiKey, saveApiKey, clearApiKey } from "@/lib/store";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    const stored = getApiKey();
    if (stored) {
      setApiKey(stored);
      setSaved(true);
    }
  }, []);

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.slice(0, 6) + "..." + key.slice(-4);
  };

  const handleSave = () => {
    saveApiKey(apiKey);
    setSaved(true);
    setShowKey(false);
  };

  const handleClear = () => {
    clearApiKey();
    setApiKey("");
    setSaved(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      setTestResult(res.ok ? "success" : "error");
    } catch {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-serif text-2xl sm:text-3xl text-navy mb-8">
        Settings
      </h1>

      {/* API Key Section */}
      <div className="bg-white rounded-2xl border border-navy/10 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center shrink-0">
            <Key size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-serif text-lg text-navy">Gemini API Key</h2>
            <p className="text-sm text-slate mt-0.5">
              Your key is stored locally in your browser and sent directly to
              Google&apos;s API. We never store it on our servers.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSaved(false);
                setTestResult(null);
              }}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2.5 pr-10 rounded-xl border border-navy/15 bg-ivory-light text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold font-mono text-sm"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-navy"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {saved && !showKey && apiKey && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle size={12} />
              Saved: {maskKey(apiKey)}
            </p>
          )}

          {testResult === "success" && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle size={12} />
              Connection successful! Your API key is valid.
            </p>
          )}
          {testResult === "error" && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              Connection failed. Check your API key.
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Key
            </button>
            <button
              onClick={handleTest}
              disabled={!apiKey.trim() || testing}
              className="border border-navy/15 text-navy px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-ivory-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {testing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </button>
            {apiKey && (
              <button
                onClick={handleClear}
                className="text-sm text-red-500 hover:text-red-600 px-3 py-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="bg-ivory-light rounded-xl p-4 text-sm text-slate space-y-2">
          <p className="font-medium text-navy text-xs uppercase tracking-wide">
            How to get a Gemini API key:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>
              Go to{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline"
              >
                Google AI Studio
              </a>
            </li>
            <li>Sign in with your Google account</li>
            <li>Click &quot;Create API Key&quot;</li>
            <li>Copy and paste the key above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
