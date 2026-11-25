import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Copy,
  Flame,
  HeartHandshake,
  Lock,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import type { CoupleRoomStatus, IntensityLevel, Persona, Wallet } from '../types/confession';

interface CoupleConfessionalProps {
  clientId: string;
  personas: Persona[];
  wallet: Wallet;
  onRefreshWallet: () => Promise<void>;
  onOpenShop: () => void;
  onNotify: (msg: string) => void;
}

const BOUNDARY_CHIPS = [
  'Jemná dominance ano',
  'Roleplay ano',
  'Šátek přes oči ano',
  'Pomalé tempo & masáž',
  'Bez bolesti',
  'Hravé dráždění slovem',
];

export function CoupleConfessional({
  clientId,
  personas,
  wallet,
  onRefreshWallet,
  onOpenShop,
  onNotify,
}: CoupleConfessionalProps) {
  const [personaId, setPersonaId] = useState('dominik');
  const [intensity, setIntensity] = useState<IntensityLevel>('spicy');
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const [room, setRoom] = useState<CoupleRoomStatus | null>(null);
  const [activePartner, setActivePartner] = useState<'A' | 'B'>('A');
  const [confessionText, setConfessionText] = useState('');
  const [selectedBoundaries, setSelectedBoundaries] = useState<string[]>(['Pomalé tempo & masáž']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const toggleBoundary = (b: string) => {
    setSelectedBoundaries((prev) =>
      prev.includes(b) ? prev.filter((item) => item !== b) : [...prev, b]
    );
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const created = await api.createCoupleRoom(clientId, personaId, intensity);
      setRoom(created);
      setActivePartner('A');
      setConfessionText('');
      onNotify(`Párová zpovědnice ${created.roomCode} vytvořena!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se vytvořit místnost.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const existing = await api.getCoupleRoom(joinCodeInput.trim());
      setRoom(existing);
      setActivePartner(existing.partnerASubmitted && !existing.partnerBSubmitted ? 'B' : 'A');
      setConfessionText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Místnost s tímto kódem nebyla nalezena.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshRoom = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const updated = await api.getCoupleRoom(room.roomCode);
      setRoom(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se aktualizovat místnost.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    if (confessionText.trim().length < 8) {
      setError('Napiš alespoň krátkou větu své tajné touhy (min. 8 znaků).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updated = await api.submitCoupleConfession(room.roomCode, {
        clientId,
        partnerRole: activePartner,
        confessionText: confessionText.trim(),
        boundaries: selectedBoundaries,
      });
      setRoom(updated);
      setConfessionText('');
      await onRefreshWallet();

      if (updated.isReady) {
        onNotify('Obě zpovědi se propojily! Večer rozhřešení je připraven.');
      } else {
        onNotify(`Zpověď Partnera ${activePartner} byla uzamčena. Nyní může psát druhý partner.`);
        setActivePartner(activePartner === 'A' ? 'B' : 'A');
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_ODPUSTKY') {
        setError(err.message);
        onOpenShop();
      } else {
        setError(err instanceof Error ? err.message : 'Nepodařilo se odeslat zpověď.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBurnRoom = async () => {
    if (!room) return;
    setLoading(true);
    try {
      await api.burnCoupleRoom(room.roomCode);
      setRoom(null);
      setConfessionText('');
      onNotify('Párový pokoj shořel v plamenech a byl smazán z databáze.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!room) return;
    await navigator.clipboard.writeText(room.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#d4af37]/80 mb-1">
            Blind Desire Matching • 2 Odpustky (VIP zdarma)
          </p>
          <h2 className="font-serif-display text-3xl md:text-4xl font-semibold text-[#f8ece4]">
            Párová zpovědnice
          </h2>
          <p className="text-sm text-[#c2acb5] mt-1 max-w-2xl">
            Každý partner tajně svěří svou fantazii. Zpovědník{' '}
            <strong className="text-[#f2d57e]">nikdy neprozradí jednostranná tajemství</strong> — najde
            společnou chemii a vytvoří z ní 3-fázový <em>Večer rozhřešení</em> na míru.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!room ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Create Room Card */}
          <div className="velvet-card gold-shimmer-border rounded-3xl p-6 md:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#34111e] border border-[#d4af37]/40 text-[#f2d57e]">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif-display text-2xl font-semibold text-[#f8ece4]">
                  Otevřít novou kabinku pro dva
                </h3>
                <p className="text-xs text-[#a9939c]">
                  Vytvoř tajný kód a pozvi partnera (nebo se vystřídejte na jednom zařízení).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-wider text-[#c9b3bc]">
                Průvodce večera
              </label>
              <div className="grid grid-cols-2 gap-2">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersonaId(p.id)}
                    className={`cursor-pointer rounded-xl px-3 py-2 text-left text-xs border transition ${
                      personaId === p.id
                        ? 'bg-[#3b1222] border-[#d4af37]/65 text-white'
                        : 'bg-black/30 border-white/10 text-[#bfa9b2] hover:border-[#d4af37]/30'
                    }`}
                  >
                    <span className="font-medium block">{p.name}</span>
                    <span className="text-[10px] opacity-75">{p.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-[#c9b3bc]">
                Žár večera
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['gentle', 'Smyslný'],
                    ['spicy', 'Pikantní'],
                    ['burning', 'Odvážný'],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setIntensity(val)}
                    className={`cursor-pointer rounded-xl py-2 text-xs font-medium border transition ${
                      intensity === val
                        ? 'bg-[#8f1833] border-[#f2d57e]/50 text-white'
                        : 'bg-black/30 border-white/10 text-[#bfa9b2]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleCreateRoom}
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#7d152d] via-[#a31d3c] to-[#7d152d] py-3.5 px-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#fff4e0] border border-[#f2d57e]/40 hover:brightness-115 transition disabled:opacity-50"
            >
              {loading ? 'Vytvářím kabinku…' : 'Vytvořit Párovou zpovědnici'}
            </button>
            <p className="text-[11px] text-center text-[#99838c]">
              {wallet.isVip
                ? 'Pro členy Řádu Hříšníků VIP zdarma.'
                : 'Odemčení výsledného scénáře stojí 2 Odpustky (platí se až po odeslání obou).'}
            </p>
          </div>

          {/* Join Existing Room Card */}
          <form
            onSubmit={handleJoinRoom}
            className="velvet-card rounded-3xl p-6 md:p-7 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1e0d14] border border-[#d4af37]/30 text-[#d4af37]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif-display text-2xl font-semibold text-[#f8ece4]">
                    Máš kód od partnera?
                  </h3>
                  <p className="text-xs text-[#a9939c]">
                    Připoj se do společné šifrované kabinky ze svého telefonu.
                  </p>
                </div>
              </div>

              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="Např. SIN-7K4Q"
                className="w-full rounded-xl border border-[#d4af37]/30 bg-[#0b0508] px-4 py-3.5 text-center font-mono text-lg tracking-[0.25em] text-[#f2d57e] placeholder-[#6c5560] focus:border-[#d4af37] focus:outline-none uppercase"
              />
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || !joinCodeInput.trim()}
                className="w-full cursor-pointer rounded-xl border border-[#d4af37]/40 bg-[#240d16] py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f2d57e] hover:bg-[#361321] transition disabled:opacity-40"
              >
                Vstoupit pomocí kódu
              </button>
              <p className="text-[11px] text-[#8f7882] flex items-center justify-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#d4af37]" />
                Surové texty obou partnerů se po vygenerování scénáře okamžitě mažou.
              </p>
            </div>
          </form>
        </div>
      ) : room.isReady && room.scenario ? (
        /* REVEALED COUPLE EVENING SCENARIO */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="velvet-card gold-shimmer-border rounded-3xl p-6 md:p-9 space-y-7"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d4af37]/20 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#d4af37] mb-1">
                Večer rozhřešení odemčen • Kód {room.roomCode}
              </p>
              <h3 className="font-serif-display text-3xl md:text-4xl font-semibold text-[#fff3e4]">
                {room.scenario.title}
              </h3>
              <p className="text-sm italic text-[#d8b7c4] mt-1">{room.scenario.archetypePair}</p>
            </div>

            <div className="rounded-2xl border border-[#d4af37]/45 bg-[#230a13] px-5 py-3 text-center self-start">
              <span className="block text-[10px] uppercase tracking-widest text-[#c6abb6]">
                Vzájemná chemie
              </span>
              <span className="font-serif-display text-3xl font-bold text-[#f2d57e]">
                {room.scenario.chemistryScore} %
              </span>
            </div>
          </div>

          <blockquote className="rounded-2xl border-l-2 border-[#d4af37] bg-[#13070c]/80 p-5">
            <p className="font-serif-display text-xl italic text-[#f7eae2] leading-relaxed">
              „{room.scenario.confessorIntro}“
            </p>
          </blockquote>

          <div className="rounded-2xl border border-[#d4af37]/25 bg-[#1c0b12]/80 p-5">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#f2d57e] mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Kde se vaše tajná přání potkala (bez prozrazení tajemství)
            </h4>
            <p className="text-sm md:text-base text-[#e6d5dc] leading-relaxed">
              {room.scenario.sharedSparkSummary}
            </p>
          </div>

          {/* 3-Step Evening Ritual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {room.scenario.steps.map((step) => (
              <div
                key={step.stepNumber}
                className="rounded-2xl border border-[#d4af37]/30 bg-gradient-to-b from-[#2a0e18]/90 to-[#14080c]/95 p-5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#d4af37] mb-2">
                    <span>
                      0{step.stepNumber} • {step.phase}
                    </span>
                    <span className="text-[#c5aeb7]">{step.duration}</span>
                  </div>
                  <h5 className="font-serif-display text-2xl font-semibold text-[#fff1db] mb-2">
                    {step.title}
                  </h5>
                  <p className="text-xs md:text-sm text-[#dfc9d2] leading-relaxed">
                    {step.instruction}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center font-serif-display text-lg italic text-[#d5bcc6]">
            „{room.scenario.closingAbsolution}“
          </p>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleBurnRoom}
              disabled={loading}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#b8321a] to-[#9e1c38] px-7 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white border border-[#ffbe76]/40 hover:brightness-115 transition"
            >
              <Flame className="h-4 w-4" />
              Spálit párovou kabinku & Smazat z databáze
            </button>
          </div>
        </motion.div>
      ) : (
        /* ACTIVE ROOM — SECRET SUBMISSION PHASE */
        <div className="velvet-card lattice-bg gold-shimmer-border rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d4af37]/20 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#d4af37]">
                Aktivní kabinka pro dva
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-2xl font-bold tracking-[0.22em] text-[#f2d57e]">
                  {room.roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-[#d4af37]/30 bg-black/40 px-2.5 py-1 text-xs text-[#e6d5bc] hover:bg-white/10"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedCode ? 'Zkopírováno' : 'Kopírovat kód'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshRoom}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-[#d6c2ca] hover:bg-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Obnovit stav
              </button>
              <button
                type="button"
                onClick={handleBurnRoom}
                className="cursor-pointer rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-950/50"
              >
                Zrušit pokoj
              </button>
            </div>
          </div>

          {/* Partner Status & Single-Device Switcher */}
          <div className="grid grid-cols-2 gap-3">
            {(['A', 'B'] as const).map((role) => {
              const submitted = role === 'A' ? room.partnerASubmitted : room.partnerBSubmitted;
              const isSelected = activePartner === role;

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActivePartner(role)}
                  className={`cursor-pointer rounded-2xl p-4 text-left border transition ${
                    isSelected
                      ? 'bg-[#35111f] border-[#d4af37]/70'
                      : 'bg-black/35 border-white/10 hover:border-[#d4af37]/35'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-serif-display text-xl font-semibold text-[#f8ece4]">
                      Partner {role}
                    </span>
                    {submitted ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" /> Uzamčeno
                      </span>
                    ) : (
                      <span className="text-xs text-[#d4af37]">Čeká na zpověď</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#a9939c]">
                    {submitted
                      ? 'Tajemství uloženo (druhý partner ho nevidí).'
                      : 'Klikni pro psaní jako tento partner.'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Submission form for selected partner */}
          <form onSubmit={handleSubmitPartner} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#f2d57e] mb-2">
                Tajná zpověď pro: Partner {activePartner} (nikdo jiný tento text neuvidí!)
              </label>
              <textarea
                value={confessionText}
                onChange={(e) => setConfessionText(e.target.value)}
                rows={4}
                placeholder={
                  activePartner === 'A'
                    ? 'Např. „Chtěl/a bych dnes vyzkoušet jemnou dominanci se šátkem přes oči a pomalejší předehru bez spěchu…“'
                    : 'Např. „Láká mě představa, že převezmu na chvíli vedení nebo si zahrajeme na cizince při sklence vína…“'
                }
                className="w-full rounded-2xl border border-[#d4af37]/25 bg-[#0b0508]/90 p-4 text-sm md:text-base text-[#f7ece6] placeholder-[#78616b] focus:border-[#d4af37]/70 focus:outline-none"
              />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-[#bba5ae] mb-2">
                Tvé hranice & preference (volitelné):
              </p>
              <div className="flex flex-wrap gap-2">
                {BOUNDARY_CHIPS.map((b) => {
                  const active = selectedBoundaries.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBoundary(b)}
                      className={`cursor-pointer rounded-full px-3 py-1.5 text-xs border transition ${
                        active
                          ? 'bg-[#8f1833] border-[#f2d57e]/60 text-white'
                          : 'bg-black/35 border-white/10 text-[#c1abb4] hover:border-[#d4af37]/30'
                      }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7d152d] via-[#a31d3c] to-[#7d152d] px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white border border-[#f2d57e]/40 hover:brightness-115 transition disabled:opacity-50"
              >
                <Lock className="h-4 w-4 text-[#f2d57e]" />
                {loading
                  ? 'Zamykám tajemství…'
                  : `Uzamknout tajnou zpověď Partnera ${activePartner}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
