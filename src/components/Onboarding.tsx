import { useState } from "react";
import { Mic, Sparkles, ClipboardPaste, Eye, EyeOff, ExternalLink, Check, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";
import { api } from "@/api/tauri";

interface OnboardingProps {
  onComplete: () => void;
}

type Step = 0 | 1 | 2 | 3;

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const goTo = (s: Step, dir: "forward" | "back" = "forward") => {
    setDirection(dir);
    setStep(s);
  };

  const next = () => goTo(Math.min(step + 1, 3) as Step, "forward");

  return (
    <div className="fixed inset-0 bg-[#0c0c0c] flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Step dots */}
      <div className="absolute top-8 flex gap-2">
        {([0, 1, 2, 3] as Step[]).map((s) => (
          <div
            key={s}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              s === step ? "bg-white w-4" : s < step ? "bg-white/40" : "bg-white/15"
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div
        key={step}
        className="w-full max-w-[480px] px-8 flex flex-col items-center text-center"
        style={{
          animation: `${direction === "forward" ? "slideInRight" : "slideInLeft"} 300ms cubic-bezier(0.33, 1, 0.68, 1) both`,
        }}
      >
        {step === 0 && <WelcomeStep onNext={next} />}
        {step === 1 && <HowItWorksStep onNext={next} />}
        {step === 2 && <ApiKeyStep onNext={next} onSkip={next} />}
        {step === 3 && <ReadyStep onComplete={onComplete} />}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-32px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Step 1: Welcome ────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
        <img src="/icons/128x128.png" alt="Ghosty" className="w-10 h-10" onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }} />
        <Mic className="w-8 h-8 text-orange-400 hidden" />
      </div>
      <h1 className="text-3xl font-semibold text-white mb-3">{strings.onboarding.welcome.title}</h1>
      <p className="text-sm text-white/50 leading-relaxed mb-10 max-w-[340px]">
        {strings.onboarding.welcome.description}
      </p>
      <button
        type="button"
        onClick={onNext}
        className="px-8 py-3 bg-white text-black rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors"
      >
        {strings.onboarding.welcome.getStarted}
      </button>
    </>
  );
}

// ─── Step 2: How it works ────────────────────────────────────────────────────

function HowItWorksStep({ onNext }: { onNext: () => void }) {
  const steps = [
    { icon: Mic, label: strings.onboarding.howItWorks.step1Label, desc: strings.onboarding.howItWorks.step1Desc },
    { icon: Sparkles, label: strings.onboarding.howItWorks.step2Label, desc: strings.onboarding.howItWorks.step2Desc },
    { icon: ClipboardPaste, label: strings.onboarding.howItWorks.step3Label, desc: strings.onboarding.howItWorks.step3Desc },
  ];

  return (
    <>
      <h2 className="text-2xl font-semibold text-white mb-2">{strings.onboarding.howItWorks.title}</h2>
      <p className="text-sm text-white/40 mb-10">{strings.onboarding.howItWorks.subtitle}</p>
      <div className="flex flex-col gap-4 w-full mb-10">
        {steps.map(({ icon: Icon, label, desc }, i) => (
          <div key={i} className="flex items-start gap-4 bg-white/[0.04] rounded-xl p-4 text-left border border-white/[0.06]">
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-white/70" />
            </div>
            <div>
              <div className="text-sm font-medium text-white mb-0.5">{label}</div>
              <div className="text-xs text-white/40 leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="px-8 py-3 bg-white text-black rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors"
      >
        {strings.onboarding.howItWorks.continue}
      </button>
    </>
  );
}

// ─── Step 3: API Key ─────────────────────────────────────────────────────────

type KeyStatus = "idle" | "validating" | "testing" | "saving" | "success" | "error";

function ApiKeyStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [key, setKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<KeyStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = key.trim();
    setError(null);

    if (!trimmed) {
      setError(strings.onboarding.apiKey.errors.enterKey);
      return;
    }
    if (!trimmed.startsWith("sk-")) {
      setStatus("error");
      setError(strings.onboarding.apiKey.errors.mustStartWithSk);
      return;
    }

    setStatus("validating");
    try {
      setStatus("testing");
      await invoke("test_openai_key", { key: trimmed });
      setStatus("saving");
      await api.apiKeys.add({ name: "Default", provider: "openai", key: trimmed });
      setStatus("success");
      setTimeout(() => onNext(), 900);
    } catch (e) {
      setStatus("error");
      setError(String(e).replace(/^Error: /, ""));
    }
  };

  const isLoading = status === "validating" || status === "testing" || status === "saving";

  return (
    <>
      <h2 className="text-2xl font-semibold text-white mb-2">{strings.onboarding.apiKey.title}</h2>
      <p className="text-sm text-white/40 mb-8 max-w-[340px] leading-relaxed">
        {strings.onboarding.apiKey.description}
      </p>

      <div className="w-full mb-3">
        <div className="relative">
          <input
            type={visible ? "text" : "password"}
            value={key}
            onChange={(e) => { setKey(e.target.value); setStatus("idle"); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSave()}
            placeholder="sk-..."
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className={cn(
              "w-full px-4 py-3 pr-10 rounded-xl bg-white/[0.05] border text-sm text-white placeholder:text-white/20 outline-none transition-colors font-mono",
              status === "error" ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-white/30"
            )}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            aria-label={visible ? strings.onboarding.apiKey.hideKey : strings.onboarding.apiKey.showKey}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
            <X className="w-3 h-3 shrink-0" /> {error}
          </p>
        )}
      </div>

      <a
        href="https://platform.openai.com/api-keys"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors mb-8"
      >
        <ExternalLink className="w-3 h-3" />
        {strings.onboarding.apiKey.getApiKey}
      </a>

      <div className="flex flex-col gap-3 w-full">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || status === "success"}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-sm transition-all",
            status === "success"
              ? "bg-green-500 text-white"
              : "bg-white text-black hover:bg-white/90 disabled:opacity-50"
          )}
        >
          {status === "validating" && strings.onboarding.apiKey.validating}
          {status === "testing" && strings.onboarding.apiKey.testingKey}
          {status === "saving" && strings.onboarding.apiKey.saving}
          {status === "success" && <span className="flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> {strings.onboarding.apiKey.keySaved}</span>}
          {(status === "idle" || status === "error") && strings.onboarding.apiKey.saveAndContinue}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-white/25 hover:text-white/50 transition-colors py-1"
        >
          {strings.onboarding.apiKey.skipForNow}
        </button>
      </div>
    </>
  );
}

// ─── Step 4: Ready ────────────────────────────────────────────────────────────

function ReadyStep({ onComplete }: { onComplete: () => void }) {
  return (
    <>
      <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-8">
        <Check className="w-8 h-8 text-green-400" />
      </div>
      <h2 className="text-3xl font-semibold text-white mb-3">{strings.onboarding.ready.title}</h2>
      <p className="text-sm text-white/40 mb-8 max-w-[320px] leading-relaxed">
        Hold <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono text-xs">Ctrl</kbd>{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono text-xs">Shift</kbd>{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono text-xs">Space</kbd>{" "}
        {strings.onboarding.ready.description}
      </p>
      <button
        type="button"
        onClick={onComplete}
        className="px-8 py-3 bg-white text-black rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors"
      >
        {strings.onboarding.ready.openGhosty}
      </button>
    </>
  );
}
