import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  PhoneCall,
  Share2,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  DesireProfile,
  IntensityLevel,
  Persona,
  SoloConfessionResponse,
  SoloProbeResponse,
  Wallet,
} from '../types/confession';
import { ambientAudio } from '../utils/ambientAudio';
import { PersonaSelector } from './PersonaSelector';
import { ShareCardModal } from './ShareCardModal';
import { DailyQuestionBanner } from './DailyQuestionBanner';

interface SoloConfessionalProps {
  clientId: string;
  personas: Persona[];
  wallet: Wallet;
  initialSeedText?: string | null;
  onWalletChange: (w: Wallet) => void;
  onProfileChange: (p: DesireProfile) => void;
  onNotify: (msg: string) => void;
}

const PROMPT_CHIPS = [
  'Už půl roku fantazíruju o tom, že partner převezme absolutní velení, ale stydím se mu to říct.',
  'Jsme spolu roky a milujeme se, ale v ložnici nás dostihla rutina a toužím po něčem zakázaném.',
  'V práci mě přitahuje hlas kolegy — nechci podvádět, ale tu energii bych chtěl/a přenést domů.',
];

const INTENSITIES: { id: IntensityLevel; label: string }[] = [
  { id: 'gentle', label: 'Sametové' },
  { id: 'spicy', label: 'Pikantní' },
  { id: 'burning', label: 'Hořící 🔥' },
];

export function SoloConfessional({
  clientId,
  personas,
  initialSeedText,
  onWalletChange,
  onProfileChange,
  onNotify,
}: SoloConfessionalProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('dominik');
  const [intensity, setIntensity] = useState<IntensityLevel>('spicy');
  const [contextMode, setContextMode] = useState<'solo' | 'partner'>('partner');
  const [confessionText, setConfessionText] = useState(initialSeedText ?? '');
  const [publishToWall, setPublishToWall] = useState(false);

  // Layer 2 (Socratic Probe) state
  const [probe, setProbe] = useState<SoloProbeResponse | null>(null);
  const [deepAnswer, setDeepAnswer] = useState('');

  // Layer 3 (Absolution) state
  const [result, setResult] = useState<SoloConfessionResponse | null>(null);
  const [penanceFeedbackDone, setPenanceFeedbackDone] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBurning, setIsBurning] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const [burnedMessage, setBurnedMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (initialSeedText) {
      setConfessionText(initialSeedText);
      setProbe(null);
      setResult(null);
    }
  }, [initialSeedText]);

  const activePersona = useMemo(
    () => personas.find((p) => p.id === selectedPersonaId) ?? personas[0],
    [personas, selectedPersonaId]
  );

  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleSpeak = () => {
    if (!result?.voiceScript || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(result.voiceScript);
    u.lang = 'cs-CZ';
    u.pitch = activePersona?.voicePitch ?? 0.85;
    u.rate = activePersona?.voiceRate ?? 0.88;
    const czechVoice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith('cs'));
    if (czechVoice) u.voice = czechVoice;
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  // Layer 1 -> Layer 2 (Probe)
  const handleStartProbe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confessionText.trim().length < 8) {
      setError('Zašeptej alespoň krátkou větu (min. 8 znaků).');
      return;
    }
    setSubmitting(true);
    setError(null);
    setBurnedMessage(null);
    try {
      const probeRes = await api.probeSoloConfession({
        clientId,
        personaId: selectedPersonaId,
        confessionText: confessionText.trim(),
        intensity,
      });
      if (probeRes.isSafetyIntervention) {
        // Trigger full safety display via final submit path
        const safeRes = await api.submitSoloConfession({
          clientId,
          personaId: selectedPersonaId,
          confessionText: confessionText.trim(),
          intensity,
          publishToWall: false,
          contextMode,
        });
        setResult(safeRes);
      } else {
        setProbe(probeRes);
        setDeepAnswer('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spojení se zpovědnicí selhalo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Layer 2 -> Layer 3 (Absolution & Penance)
  const handleCompleteAbsolution = async (chosenAnswer?: string) => {
    const finalDeepAnswer = (chosenAnswer ?? deepAnswer).trim();
    stopSpeech();
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.submitSoloConfession({
        clientId,
        personaId: selectedPersonaId,
        confessionText: confessionText.trim(),
        intensity,
        publishToWall,
        probeQuestion: probe?.probingQuestion,
        deepAnswer: finalDeepAnswer || undefined,
        contextMode,
      });
      setResult(response);
      setProbe(null);
      setPenanceFeedbackDone(false);
      onWalletChange(response.wallet);
      if (response.profile) onProfileChange(response.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se získat rozhřešení.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePenanceFeedback = async (feedback: 'bolder' | 'perfect' | 'gentler') => {
    if (!result) return;
    try {
      const res = await api.completePenance({
        clientId,
        penanceTitle: result.penance.title,
        feedback,
      });
      setPenanceFeedbackDone(true);
      onProfileChange(res.profile);
      onNotify(res.message);
    } catch {
      // ignore
    }
  };

  // Hold-to-Burn tactile ritual (1.2s hold)
  const executeBurn = async () => {
    if (!result || isBurning) return;
    stopSpeech();
    setIsBurning(true);
    ambientAudio.playBurnWhoosh();

    try {
      if (result.sessionId && result.sessionId !== '00000000-0000-0000-0000-000000000000') {
        await api.burnSoloSession(result.sessionId);
      }
      await new Promise((r) => setTimeout(r, 850));
      setResult(null);
      setProbe(null);
      setConfessionText('');
      setDeepAnswer('');
      setPublishToWall(false);
      setHoldProgress(0);
      setBurnedMessage('Zpověď shořela v plamenech. Atlas touhy si zapamatoval jen tvůj archetyp.');
      onNotify('Hřích spálen bez stopy.');
    } finally {
      setIsBurning(false);
    }
  };

  const startHoldBurn = () => {
    if (isBurning) return;
    const start = Date.now();
    const duration = 1100;
    holdTimerRef.current = window.setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      setHoldProgress(pct);
      if (pct >= 100) {
        stopHoldBurn();
        executeBurn();
      }
    }, 30);
  };

  const stopHoldBurn = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  return (
    <div className="space-y-6">
      <DailyQuestionBanner
        onExploreInSolo={(seed) => {
          setConfessionText(seed);
          setProbe(null);
          setResult(null);
        }}
      />

      {/* Step 1: Persona selection */}
      <section>
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#d4af37]/80 mb-1">
          3-kolová hloubková zpověď • Všechny persony zdarma
        </p>
        <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#f8ece4] mb-3">
          Komu se dnes svěříš za mřížkou?
        </h2>
        <PersonaSelector
          personas={personas}
          selectedId={selectedPersonaId}
          isVip={true}
          onSelect={(id) => {
            setSelectedPersonaId(id);
            setError(null);
          }}
        />
      </section>

      <AnimatePresence>
        {burnedMessage && !result && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-[#d4af37]/40 bg-[#2a100c]/90 px-4 py-3.5 flex items-center gap-3 text-xs sm:text-sm text-[#f5dfb0]"
          >
            <Flame className="h-5 w-5 text-[#e87938] shrink-0" />
            <span>{burnedMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ─── LAYER 1: INITIAL CONFESSION ─── */}
        {!probe && !result && (
          <motion.form
            key="layer-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleStartProbe}
            className="velvet-card lattice-bg gold-shimmer-border rounded-3xl p-5 sm:p-7 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d4af37]/15 pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#d4af37]">
                  Vrstva 1 / 3 • {activePersona?.name}
                </p>
                <h3 className="font-serif-display text-2xl sm:text-3xl text-[#f8ece4]">
                  „Pověz mi, co ti nedá spát…“
                </h3>
              </div>

              <div className="flex gap-1.5">
                {INTENSITIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIntensity(item.id)}
                    className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-medium border transition ${
                      intensity === item.id
                        ? 'bg-[#8d1733] border-[#f2d57e]/60 text-white'
                        : 'bg-black/40 border-white/10 text-[#bfa9b2]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {PROMPT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setConfessionText(chip)}
                  className="cursor-pointer rounded-full border border-[#d4af37]/20 bg-[#1a0b11]/80 px-3 py-1.5 text-xs text-[#d7c3cb] hover:border-[#d4af37]/50 text-left"
                >
                  „{chip.slice(0, 48)}…“
                </button>
              ))}
            </div>

            <textarea
              value={confessionText}
              onChange={(e) => setConfessionText(e.target.value)}
              rows={4}
              placeholder="Zašeptej první vrstvu své fantazie nebo studu… Zpovědník se tě nejdřív doptá do hloubky."
              className="w-full rounded-2xl border border-[#d4af37]/25 bg-[#0b0508]/90 p-4 text-sm sm:text-base text-[#f7ece6] placeholder-[#7c656f] focus:border-[#d4af37]/70 focus:outline-none resize-none"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#b59ea8]">Pokání chci pro:</span>
                {(
                  [
                    ['partner', 'S partnerem'],
                    ['solo', 'Jen pro mě'],
                  ] as const
                ).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setContextMode(val)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs border ${
                      contextMode === val
                        ? 'bg-[#361120] border-[#d4af37]/60 text-[#f2d57e]'
                        : 'bg-black/35 border-white/10 text-[#a9929c]'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#cbb5be]">
                <input
                  type="checkbox"
                  checked={publishToWall}
                  onChange={(e) => setPublishToWall(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#9e1c38]"
                />
                <span>Sdílet anonymně na Zeď hříchů</span>
              </label>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-xs text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[50px] cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7d152d] via-[#a31d3c] to-[#7d152d] px-7 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-white border border-[#f2d57e]/40 shadow-lg disabled:opacity-50"
            >
              <Flame className="h-4 w-4 text-[#f2d57e]" />
              {submitting ? 'Zpovědník naslouchá…' : 'Zašeptat za mřížku'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.form>
        )}

        {/* ─── LAYER 2: SOCRATIC DEEP PROBE ─── */}
        {probe && !result && (
          <motion.div
            key="layer-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="velvet-card lattice-bg gold-shimmer-border rounded-3xl p-5 sm:p-8 space-y-5"
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#d4af37]">
              Vrstva 2 / 3 • {probe.personaName} jde pod povrch
            </p>

            <p className="font-serif-display text-xl sm:text-2xl italic text-[#e8d5de]">
              „{probe.mirrorReaction}“
            </p>

            <div className="rounded-2xl border border-[#d4af37]/35 bg-[#190910]/90 p-5">
              <p className="text-base sm:text-lg font-medium text-[#fff3e2] leading-relaxed">
                {probe.probingQuestion}
              </p>
            </div>

            {/* 3 Provocative 1-tap choices */}
            <div className="space-y-2.5">
              <p className="text-[11px] uppercase tracking-wider text-[#a9929c]">
                Vyber, co tě trefilo nejblíž (1 kliknutí):
              </p>
              {probe.quickChoices.map((choice, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCompleteAbsolution(choice)}
                  className="w-full min-h-[50px] cursor-pointer text-left rounded-2xl border border-[#d4af37]/30 bg-[#220c15] px-4 py-3.5 text-sm text-[#f7ece6] hover:border-[#f2d57e] hover:bg-[#351120] transition flex items-center justify-between gap-3"
                >
                  <span>{choice}</span>
                  <ArrowRight className="h-4 w-4 text-[#f2d57e] shrink-0" />
                </button>
              ))}
            </div>

            {/* Or write own deep answer */}
            <div className="pt-2 border-t border-white/10 space-y-2.5">
              <input
                type="text"
                value={deepAnswer}
                onChange={(e) => setDeepAnswer(e.target.value)}
                placeholder="Nebo napiš vlastní upřímnou odpověď…"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white placeholder-[#7a646e] focus:border-[#d4af37] focus:outline-none"
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setProbe(null)}
                  className="cursor-pointer text-xs text-[#9e8690] hover:text-white"
                >
                  ← Zpět
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCompleteAbsolution()}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8c1832] to-[#b51f3e] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
                >
                  {submitting ? 'Uděluji rozhřešení…' : 'Získat rozhřešení & Pokání'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── LAYER 3: ABSOLUTION + PENANCE RETURN LOOP + HOLD-TO-BURN ─── */}
        {result && (
          <motion.div
            key="layer-3"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={
              isBurning
                ? {
                    opacity: 0,
                    scale: 1.05,
                    y: -30,
                    filter: 'blur(10px) brightness(1.8) sepia(1) hue-rotate(-30deg)',
                  }
                : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
            }
            transition={{ duration: isBurning ? 0.85 : 0.4 }}
            className="velvet-card gold-shimmer-border rounded-3xl p-5 sm:p-8 space-y-6"
          >
            {result.isSafetyIntervention && result.crisisHelp ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-amber-300">
                  <AlertTriangle className="h-6 w-6" />
                  <h3 className="font-serif-display text-3xl font-semibold">Bezpečnostní zastavení</h3>
                </div>
                <p className="text-sm sm:text-base text-[#f1e1e7]">{result.crisisHelp.message}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {result.crisisHelp.helplines.map((line) => (
                    <div key={line.name} className="rounded-2xl border border-amber-400/30 bg-[#1c120d] p-4">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-1">
                        <PhoneCall className="h-3.5 w-3.5" />
                        {line.name}
                      </div>
                      <p className="text-xl font-bold text-white">{line.contact}</p>
                      <p className="text-xs text-[#cdb8c0]">{line.note}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setConfessionText('');
                  }}
                  className="cursor-pointer rounded-xl border border-white/20 px-4 py-2 text-xs text-white"
                >
                  Zpět
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d4af37]/20 pb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-[#d4af37] mb-1">
                      Rozhřešení uděleno • {result.personaName}
                    </p>
                    <h3 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#fff3e6]">
                      „{result.archetype}“
                    </h3>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="rounded-2xl border border-[#d4af37]/40 bg-[#1a0910] px-4 py-2 text-center">
                      <span className="block text-[9px] uppercase tracking-widest text-[#bfa5af]">
                        Index hříchu
                      </span>
                      <span className="font-serif-display text-2xl font-bold text-[#f2d57e]">
                        {result.sinIndex} %
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSpeak}
                      className={`cursor-pointer inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-3 text-xs font-semibold ${
                        isSpeaking
                          ? 'bg-[#9e1c38] border-[#f2d57e] text-white'
                          : 'bg-[#1d0b12] border-[#d4af37]/35 text-[#f2d57e]'
                      }`}
                    >
                      {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      Hlas
                    </button>
                  </div>
                </div>

                <blockquote className="rounded-2xl border-l-2 border-[#d4af37] bg-[#13070c]/80 p-5">
                  <p className="font-serif-display text-xl sm:text-2xl italic leading-relaxed text-[#f7eae2]">
                    „{result.absolutionText}“
                  </p>
                </blockquote>

                {/* Penance Card + Return Loop Feedback */}
                <div className="rounded-2xl border border-[#d4af37]/45 bg-gradient-to-br from-[#35101d]/90 via-[#1d0911]/95 to-[#29140c]/85 p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#f5da8b]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Tvé Pokání • {result.penance.spiceLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#dcc4cd]">
                      <Clock className="h-3.5 w-3.5 text-[#d4af37]" />
                      {result.penance.timing}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#fff1db] mb-1.5">
                      {result.penance.title}
                    </h4>
                    <p className="text-sm sm:text-base text-[#ebd9e0] leading-relaxed">
                      {result.penance.description}
                    </p>
                  </div>

                  {/* Penance Return Loop */}
                  {!penanceFeedbackDone ? (
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-[#d4af37]/85">
                        Až pokání přijmeš nebo splníš — uprav svůj Atlas touhy:
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePenanceFeedback('gentler')}
                          className="cursor-pointer rounded-xl border border-white/15 bg-black/35 py-2.5 px-2 text-xs text-[#dfd0d6] hover:border-[#d4af37]/40"
                        >
                          Příště jemněji
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePenanceFeedback('perfect')}
                          className="cursor-pointer rounded-xl border border-emerald-500/40 bg-emerald-950/50 py-2.5 px-2 text-xs font-medium text-emerald-200 hover:brightness-110"
                        >
                          Splněno ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePenanceFeedback('bolder')}
                          className="cursor-pointer rounded-xl border border-[#f2d57e]/50 bg-[#511124] py-2.5 px-2 text-xs font-semibold text-[#fff2dc] hover:brightness-110"
                        >
                          Chci přitvrdit 🔥
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex items-center gap-2 text-xs text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Pečeť splnění uložena do tvého Atlasu touhy!
                    </div>
                  )}
                </div>

                {/* Hold-to-Burn + Share */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/35 bg-[#1b0b12] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#f2d57e]"
                  >
                    <Share2 className="h-4 w-4" />
                    Karta odpustku
                  </button>

                  {/* Hold-to-burn tactile button */}
                  <button
                    type="button"
                    onMouseDown={startHoldBurn}
                    onMouseUp={stopHoldBurn}
                    onMouseLeave={stopHoldBurn}
                    onTouchStart={startHoldBurn}
                    onTouchEnd={stopHoldBurn}
                    onClick={() => {
                      if (holdProgress === 0) onNotify('Podrž tlačítko 1 sekundu pro zapálení zpovědi!');
                    }}
                    className="relative overflow-hidden select-none cursor-pointer min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8f2614] via-[#b8321a] to-[#8f1833] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white border border-[#ffbe76]/45 shadow-lg"
                  >
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 bg-[#ffbe76]/40 transition-all duration-75"
                      style={{ width: `${holdProgress}%` }}
                    />
                    <Flame className="relative z-10 h-4 w-4" />
                    <span className="relative z-10">
                      {isBurning
                        ? 'Spaluji v plamenech…'
                        : holdProgress > 0
                          ? `Drž… ${holdProgress} %`
                          : 'Podrž pro spálení zpovědi'}
                    </span>
                  </button>
                </div>

                <p className="text-[11px] text-center text-[#8c7780] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" />
                  Po spálení se záznam fyzicky smaže ze SQL Serveru.
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {showShareModal && result && (
        <ShareCardModal
          personaName={result.personaName}
          sinIndex={result.sinIndex}
          archetype={result.archetype}
          penanceTitle={result.penance.title}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
