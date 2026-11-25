import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Flame,
  PhoneCall,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import type {
  IntensityLevel,
  Persona,
  SoloConfessionResponse,
  Wallet,
} from '../types/confession';
import { PersonaSelector } from './PersonaSelector';
import { ShareCardModal } from './ShareCardModal';

interface SoloConfessionalProps {
  clientId: string;
  personas: Persona[];
  wallet: Wallet;
  onWalletChange: (w: Wallet) => void;
  onOpenShop: () => void;
  onNotify: (msg: string) => void;
}

const PROMPT_CHIPS = [
  'Už půl roku fantazíruju o tom, že partner převezme absolutní velení, ale stydím se mu to říct.',
  'Jsme spolu roky a milujeme se, ale v ložnici nás dostihla rutina a toužím po něčem zakázaném.',
  'V práci mě neskutečně přitahuje hlas kolegy — nechci podvádět, ale tu energii bych chtěla přenést domů.',
  'Mám tajnou fantazii o hře na cizince v hotelovém baru, ale nevím, jak ji nadhodit.',
];

const INTENSITIES: { id: IntensityLevel; label: string; desc: string }[] = [
  { id: 'gentle', label: 'Sametové pohlazení', desc: 'Něžné & smyslné' },
  { id: 'spicy', label: 'Hříšná jiskra', desc: 'Hravé & provokativní' },
  { id: 'burning', label: 'Hořící zpovědnice', desc: 'Odvážné & intenzivní' },
];

export function SoloConfessional({
  clientId,
  personas,
  wallet,
  onWalletChange,
  onOpenShop,
  onNotify,
}: SoloConfessionalProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('dominik');
  const [intensity, setIntensity] = useState<IntensityLevel>('spicy');
  const [confessionText, setConfessionText] = useState('');
  const [publishToWall, setPublishToWall] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SoloConfessionResponse | null>(null);

  const [isBurning, setIsBurning] = useState(false);
  const [burnedMessage, setBurnedMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const activePersona = useMemo(
    () => personas.find((p) => p.id === selectedPersonaId) ?? personas[0],
    [personas, selectedPersonaId]
  );

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleSpeak = () => {
    if (!result?.voiceScript || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.voiceScript);
    utterance.lang = 'cs-CZ';
    utterance.pitch = activePersona?.voicePitch ?? 0.85;
    utterance.rate = activePersona?.voiceRate ?? 0.88;

    const voices = window.speechSynthesis.getVoices();
    const czechVoice = voices.find((v) => v.lang.toLowerCase().startsWith('cs'));
    if (czechVoice) utterance.voice = czechVoice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confessionText.trim().length < 8) {
      setError('Zašeptej alespoň jednu větu své zpovědi (min. 8 znaků).');
      return;
    }

    stopSpeech();
    setSubmitting(true);
    setError(null);
    setBurnedMessage(null);

    try {
      const response = await api.submitSoloConfession({
        clientId,
        personaId: selectedPersonaId,
        confessionText: confessionText.trim(),
        intensity,
        publishToWall,
      });
      setResult(response);
      onWalletChange(response.wallet);
      if (publishToWall && !response.isSafetyIntervention) {
        onNotify('Anonymní zpověď byla přidána také na Zeď hříchů.');
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_ODPUSTKY') {
        setError(err.message);
        onOpenShop();
      } else {
        setError(err instanceof Error ? err.message : 'Spojení se zpovědnicí selhalo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBurn = async () => {
    if (!result) return;
    stopSpeech();
    setIsBurning(true);

    try {
      if (result.sessionId && result.sessionId !== '00000000-0000-0000-0000-000000000000') {
        await api.burnSoloSession(result.sessionId);
      }
      await new Promise((r) => setTimeout(r, 950));
      setResult(null);
      setConfessionText('');
      setPublishToWall(false);
      setBurnedMessage('Tvá zpověď shořela v plamenech a její záznam byl nenávratně smazán ze SQL Serveru.');
      onNotify('Hřích spálen bez jediné stopy.');
    } catch {
      setError('Nepodařilo se spálit záznam.');
    } finally {
      setIsBurning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Persona selection */}
      <section>
        <div className="flex items-end justify-between gap-2 mb-3.5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#d4af37]/80">
              Krok 1 • Vyber si průvodce za mřížkou
            </p>
            <h2 className="font-serif-display text-2xl md:text-3xl font-semibold text-[#f8ece4]">
              Komu se dnes svěříš?
            </h2>
          </div>
        </div>
        <PersonaSelector
          personas={personas}
          selectedId={selectedPersonaId}
          isVip={wallet.isVip}
          onSelect={(id) => {
            setSelectedPersonaId(id);
            setError(null);
          }}
        />
      </section>

      {/* Burned confirmation banner */}
      <AnimatePresence>
        {burnedMessage && !result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-[#d4af37]/40 bg-gradient-to-r from-[#2c120d]/90 via-[#1f0b12]/90 to-[#2c120d]/90 px-5 py-4 flex items-center gap-3 text-sm text-[#f5dfb0]"
          >
            <Flame className="h-5 w-5 text-[#e87938] shrink-0" />
            <span>{burnedMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 2: Confessional Booth OR Absolution Result */}
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.form
            key="booth-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onSubmit={handleSubmit}
            className="velvet-card lattice-bg gold-shimmer-border relative rounded-3xl p-6 md:p-8 overflow-hidden"
          >
            <div className="pointer-events-none absolute -top-24 right-8 h-56 w-56 rounded-full bg-[#a61c3c]/20 blur-3xl candle-glow" />

            <div className="relative z-10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d4af37]/15 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#d4af37]">
                    Zpovědní kabinka • {activePersona?.name}
                  </p>
                  <h3 className="font-serif-display text-2xl md:text-3xl text-[#f8ece4]">
                    „Pověz mi, co ti nedá v noci spát…“
                  </h3>
                </div>

                {/* Intensity selector */}
                <div className="flex flex-wrap gap-1.5">
                  {INTENSITIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIntensity(item.id)}
                      className={`cursor-pointer rounded-xl px-3 py-1.5 text-left transition border ${
                        intensity === item.id
                          ? 'bg-[#8d1733]/85 border-[#f2d57e]/60 text-white shadow'
                          : 'bg-black/40 border-white/10 text-[#bfa9b2] hover:border-[#d4af37]/30'
                      }`}
                    >
                      <span className="block text-xs font-medium">{item.label}</span>
                      <span className="block text-[10px] opacity-75">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Inspiration chips */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#9d8790] mb-2">
                  Nevíš, jak začít? Vyzkoušej inspiraci jedním kliknutím:
                </p>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setConfessionText(chip)}
                      className="cursor-pointer rounded-full border border-[#d4af37]/20 bg-[#1a0b11]/80 px-3 py-1.5 text-xs text-[#d7c3cb] hover:border-[#d4af37]/50 hover:text-[#fff2dc] transition text-left"
                    >
                      „{chip.slice(0, 52)}…“
                    </button>
                  ))}
                </div>
              </div>

              {/* Main textarea */}
              <div>
                <textarea
                  value={confessionText}
                  onChange={(e) => setConfessionText(e.target.value)}
                  rows={5}
                  placeholder="Zašeptej svou tajnou fantazii, hříšnou myšlenku, touhu nebo vztahový přešlap… Text samotné zpovědi neukládáme do databáze."
                  className="w-full rounded-2xl border border-[#d4af37]/25 bg-[#0b0508]/90 p-4 md:p-5 text-base text-[#f7ece6] placeholder-[#7c656f] focus:border-[#d4af37]/70 focus:outline-none focus:ring-2 focus:ring-[#9e1c38]/35 transition resize-none leading-relaxed"
                />
                <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs text-[#cbb5be]">
                    <input
                      type="checkbox"
                      checked={publishToWall}
                      onChange={(e) => setPublishToWall(e.target.checked)}
                      className="h-4 w-4 rounded border-[#d4af37]/40 bg-black/60 accent-[#9e1c38]"
                    />
                    <span>Sdílet mou zpověď anonymně na Zeď hříchů (ať hlasuje komunita)</span>
                  </label>
                  <span className="text-[11px] text-[#8d7780] flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" />
                    GDPR Ephemeral • Text zpovědi se neukládá
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-xs text-[#a58e98]">
                  {activePersona?.isPremium && !wallet.isVip ? (
                    <>
                      Cena za zpověď u <strong>{activePersona.name}</strong>:{' '}
                      <span className="text-[#f2d57e] font-semibold">
                        {activePersona.odpustkyCost} Odpustek
                      </span>
                    </>
                  ) : (
                    <span className="text-emerald-300/90">
                      Tato zpověď je pro tebe zdarma ({wallet.isVip ? 'Řád Hříšníků VIP' : 'Základní zpovědník'}).
                    </span>
                  )}
                </p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#7d152d] via-[#a31d3c] to-[#7d152d] px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.16em] text-[#fff3e0] border border-[#f2d57e]/40 shadow-lg shadow-[#8c1832]/40 hover:brightness-115 active:scale-[0.99] transition disabled:opacity-50"
                >
                  <Flame className="h-4 w-4 text-[#f2d57e]" />
                  {submitting ? 'Zpovědník naslouchá…' : 'Vyzpovídat se & Získat Pokání'}
                </button>
              </div>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="absolution-card"
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={
              isBurning
                ? {
                    opacity: 0,
                    scale: 1.05,
                    y: -35,
                    filter: 'blur(10px) brightness(1.8) sepia(1) hue-rotate(-30deg)',
                  }
                : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
            }
            transition={{ duration: isBurning ? 0.9 : 0.45 }}
            className="velvet-card gold-shimmer-border relative rounded-3xl p-6 md:p-9 overflow-hidden"
          >
            {/* Safety Intervention View */}
            {result.isSafetyIntervention && result.crisisHelp ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-amber-300">
                  <AlertTriangle className="h-7 w-7 shrink-0" />
                  <h3 className="font-serif-display text-3xl font-semibold">
                    Bezpečnostní zastavení
                  </h3>
                </div>
                <p className="text-base text-[#f1e1e7] leading-relaxed">
                  {result.crisisHelp.message}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {result.crisisHelp.helplines.map((line) => (
                    <div
                      key={line.name}
                      className="rounded-2xl border border-amber-400/30 bg-[#1c120d]/90 p-4"
                    >
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm mb-1">
                        <PhoneCall className="h-4 w-4" />
                        {line.name}
                      </div>
                      <p className="text-xl font-bold text-white mb-1">{line.contact}</p>
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
                  className="cursor-pointer rounded-xl border border-white/20 px-5 py-2.5 text-xs uppercase tracking-wider text-white hover:bg-white/10"
                >
                  Zpět do zpovědnice
                </button>
              </div>
            ) : (
              /* Normal Absolution + Penance Reveal */
              <div className="space-y-7">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d4af37]/20 pb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-[#d4af37] mb-1">
                      Rozhřešení uděleno • {result.personaName}
                    </p>
                    <h3 className="font-serif-display text-3xl md:text-4xl font-semibold text-[#fff3e6]">
                      „{result.archetype}“
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-[#d4af37]/40 bg-[#1a0910] px-4 py-2 text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-[#bfa5af]">
                        Index hříchu
                      </span>
                      <span className="font-serif-display text-2xl font-bold text-[#f2d57e]">
                        {result.sinIndex} %
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSpeak}
                      className={`cursor-pointer inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${
                        isSpeaking
                          ? 'bg-[#9e1c38] border-[#f2d57e] text-white animate-pulse'
                          : 'bg-[#1d0b12] border-[#d4af37]/35 text-[#f2d57e] hover:bg-[#2d101b]'
                      }`}
                    >
                      {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      {isSpeaking ? 'Zastavit hlas' : 'Šeptané audio'}
                    </button>
                  </div>
                </div>

                {/* Absolution Quote */}
                <blockquote className="relative rounded-2xl border-l-2 border-[#d4af37] bg-[#13070c]/80 p-5 md:p-6">
                  <p className="font-serif-display text-xl md:text-2xl italic leading-relaxed text-[#f7eae2]">
                    „{result.absolutionText}“
                  </p>
                </blockquote>

                {/* Penance Card */}
                <div className="relative overflow-hidden rounded-2xl border border-[#d4af37]/45 bg-gradient-to-br from-[#35101d]/90 via-[#1d0911]/95 to-[#29140c]/85 p-6 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#f5da8b]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Tvé dnešní Pokání • {result.penance.spiceLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#dcc4cd]">
                      <Clock className="h-3.5 w-3.5 text-[#d4af37]" />
                      {result.penance.timing}
                    </span>
                  </div>

                  <h4 className="font-serif-display text-2xl md:text-3xl font-semibold text-[#fff1db] mb-2">
                    {result.penance.title}
                  </h4>
                  <p className="text-sm md:text-base text-[#ebd9e0] leading-relaxed">
                    {result.penance.description}
                  </p>
                </div>

                {/* Actions: Burn to Absolve + Share Card */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/35 bg-[#1b0b12] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#f2d57e] hover:bg-[#2c111d] transition"
                  >
                    <Share2 className="h-4 w-4" />
                    Karta odpustku (Stories)
                  </button>

                  <button
                    type="button"
                    disabled={isBurning}
                    onClick={handleBurn}
                    className="cursor-pointer inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#b8321a] via-[#d94d1e] to-[#9e1c38] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-white border border-[#ffbe76]/45 shadow-lg shadow-[#b8321a]/40 hover:brightness-115 transition"
                  >
                    <Flame className="h-4 w-4" />
                    {isBurning ? 'Spaluji v plamenech…' : 'Spálit zpověď & Smazat stopy'}
                  </button>
                </div>
              </div>
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
