import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  CheckCircle2,
  Copy,
  Eye,
  Flag,
  Flame,
  Lock,
  MapPin,
  MessageCircle,
  Plus,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wind,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  GenderOption,
  GroupPoolState,
  MaskChamber,
  PoolHeatMode,
  PoolPresets,
  SeekingOption,
} from '../types/confession';
import { ambientAudio } from '../utils/ambientAudio';

interface GroupPoolProps {
  clientId: string;
  initialPoolCode?: string | null;
  onProfileRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
}

const HEAT_MODES: { id: PoolHeatMode; label: string; desc: string; flames: string }[] = [
  { id: 'flirt', label: 'Flirt & Napětí', desc: 'Svatba, oslava, teambuilding', flames: '🔥' },
  { id: 'night', label: 'Noční Klášter', desc: 'Chata, silvestr, párty s partou', flames: '🔥🔥' },
  { id: 'unleashed', label: 'Bez masek po půlnoci', desc: 'Odvážná 18+ párty bez zábran', flames: '🔥🔥🔥' },
];

const FAR_LIMITS = [
  'Flirt, napětí & tajná sklenka',
  'Zakázaný polibek v soukromí',
  'Zmizet spolu po půlnoci, pokud přeskočí jiskra',
];

const DYNAMICS = [
  'Rád/a převezmu vedení',
  'Chci se nechat svést a překvapit',
  'Hravé přetahování o kontrolu',
];

export function GroupPool({
  clientId,
  initialPoolCode,
  onProfileRefresh,
  onNotify,
}: GroupPoolProps) {
  const [presets, setPresets] = useState<PoolPresets>({
    cluePresets: ['Mám dnes na sobě něco černého', 'Držím v ruce víno nebo drink'],
    quickSparks: [],
    meetingSpots: ['Za 5 minut venku na terase', 'Za 5 minut u baru'],
  });

  // Setup / Join form state
  const [joinModeCode, setJoinModeCode] = useState<string | null>(initialPoolCode ?? null);
  const [manualJoinCode, setManualJoinCode] = useState('');
  const [showManualJoin, setShowManualJoin] = useState(false);

  const [poolTitle, setPoolTitle] = useState('Chata / Párty dnes večer');
  const [heatMode, setHeatMode] = useState<PoolHeatMode>('night');
  const [gender, setGender] = useState<GenderOption>('M');
  const [seeking, setSeeking] = useState<SeekingOption>('F');
  const [clue1, setClue1] = useState('Mám dnes na sobě něco černého');

  // Active Pool state
  const [pool, setPool] = useState<GroupPoolState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Spark composer & Catch modal state
  const [showSparkComposer, setShowSparkComposer] = useState(false);
  const [sparkText, setSparkText] = useState('');
  const [catchingSparkId, setCatchingSparkId] = useState<string | null>(null);
  const [catchPitch, setCatchPitch] = useState('');

  // Chamber Stage 1 Chemistry form state
  const [farLimit, setFarLimit] = useState(FAR_LIMITS[1]);
  const [dynamicStyle, setDynamicStyle] = useState(DYNAMICS[2]);
  const [whisperLine, setWhisperLine] = useState('');

  useEffect(() => {
    api
      .getPoolPresets()
      .then((p) => {
        setPresets(p);
        if (p.cluePresets.length > 0) setClue1(p.cluePresets[0]);
      })
      .catch(() => {});
  }, []);

  // If user opened a WhatsApp group link (?pool=KRUH-XXXX), check if already joined or show quick join mask screen
  useEffect(() => {
    if (!initialPoolCode) return;
    setLoading(true);
    api
      .getPoolState(initialPoolCode, clientId)
      .then((state) => {
        if (state.me) {
          setPool(state);
        } else {
          setJoinModeCode(state.poolCode);
          setPoolTitle(state.title);
          setHeatMode(state.heatMode);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Tajný Kruh nebyl nalezen.');
      })
      .finally(() => setLoading(false));
  }, [initialPoolCode, clientId]);

  // Live auto-polling every 3.5s while inside a Pool
  useEffect(() => {
    if (!pool) return;
    const id = setInterval(async () => {
      try {
        const fresh = await api.getPoolState(pool.poolCode, clientId);
        if (fresh.activeChamber?.stage === 4 && pool.activeChamber?.stage !== 4) {
          onProfileRefresh();
        }
        setPool(fresh);
      } catch {
        // ignore transient network glitches
      }
    }, 3500);
    return () => clearInterval(id);
  }, [pool, clientId, onProfileRefresh]);

  const groupInviteUrl = useMemo(() => {
    if (!pool) return '';
    return `${window.location.origin}/?pool=${encodeURIComponent(pool.poolCode)}`;
  }, [pool]);

  const whatsappGroupHref = useMemo(() => {
    if (!pool || !groupInviteUrl) return '#';
    const msg = `🎭 Přidej se do našeho Tajného Kruhu „${pool.title}“!\nAnonymní masky, tajné návrhy v poolu a hra na skryté signály přímo v místnosti (bez jmen, ráno vše shoří):\n${groupInviteUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }, [pool, groupInviteUrl]);

  const handleCreateOrJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let state: GroupPoolState;
      if (joinModeCode) {
        state = await api.joinPool(joinModeCode, { clientId, gender, seeking, clue1 });
        onNotify(`Maska nasazena: ${state.me?.maskSymbol} ${state.me?.maskName}!`);
      } else {
        state = await api.createPool({
          clientId,
          title: poolTitle.trim() || 'Noční Klášter',
          heatMode,
          gender,
          seeking,
          clue1,
        });
        onNotify(`Tajný Kruh ${state.poolCode} otevřen! Pošli link do WhatsApp skupiny.`);
      }
      setPool(state);
      window.history.replaceState({}, '', `/?pool=${state.poolCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se vstoupit do Tajného Kruhu.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualJoinCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const state = await api.getPoolState(manualJoinCode.trim(), clientId);
      if (state.me) {
        setPool(state);
      } else {
        setJoinModeCode(state.poolCode);
        setPoolTitle(state.title);
        setHeatMode(state.heatMode);
        setShowManualJoin(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kruh s tímto kódem neexistuje.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyGroupLink = async () => {
    if (!groupInviteUrl) return;
    await navigator.clipboard.writeText(groupInviteUrl);
    setCopiedLink(true);
    onNotify('Odkaz na Tajný Kruh zkopírován!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDropSpark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pool || sparkText.trim().length < 10) {
      setError('Napiš alespoň krátký návrh (min. 10 znaků).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fresh = await api.dropPoolSpark(pool.poolCode, {
        clientId,
        text: sparkText.trim(),
        intentLevel: pool.heatMode,
      });
      setPool(fresh);
      setSparkText('');
      setShowSparkComposer(false);
      onNotify('Jiskra vhozena anonymně do poolu!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se vhodit návrh.');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSpark = async () => {
    if (!pool) return;
    setLoading(true);
    try {
      const fresh = await api.dropSystemSpark(pool.poolCode, clientId);
      setPool(fresh);
      onNotify('Zpovědník hodil do místnosti provokativní ledo-lamač!');
    } finally {
      setLoading(false);
    }
  };

  const handleCatchSpark = async (sparkId: string) => {
    if (!pool) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await api.catchPoolSpark(pool.poolCode, sparkId, {
        clientId,
        pitchText: catchPitch.trim() || 'Jdu do toho — zkusíme Zkoušku signálu v místnosti?',
      });
      setPool(fresh);
      setCatchingSparkId(null);
      setCatchPitch('');
      onNotify(
        fresh.activeChamber
          ? '🔥 Jiskra se chytila! Vstupuješ do Tajné komnaty.'
          : 'Zlatá sirka odeslána! Čeká se, až si tě druhá Maska vybere.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se chytit jiskru.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCatch = async (sparkId: string, catchId: string) => {
    if (!pool) return;
    setLoading(true);
    try {
      const fresh = await api.selectPoolCatch(pool.poolCode, sparkId, catchId, clientId);
      setPool(fresh);
      onNotify('🎭 Tajná komnata otevřena! Začíná Zkouška chemie.');
    } finally {
      setLoading(false);
    }
  };

  const handleSpawnDemoBot = async () => {
    if (!pool) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await api.spawnPoolDemoBot(pool.poolCode, clientId);
      setPool(fresh);
      onNotify('Demo Maska vstoupila do místnosti a zapojila se do hry!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se přidat Demo Masku.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitChemistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pool?.activeChamber) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await api.submitChamberChemistry(pool.activeChamber.id, {
        clientId,
        farLimit,
        dynamicStyle,
        whisperLine: whisperLine.trim() || 'Uvidíme, co řeknou oči při signálu…',
      });
      setPool(fresh);
      setWhisperLine('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při odeslání odpovědí.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async (
    action:
      | 'consent_stage1'
      | 'signal_a_sent'
      | 'signal_a_spotted'
      | 'signal_b_sent'
      | 'signal_b_spotted'
      | 'set_spot',
    meetingSpot?: string
  ) => {
    if (!pool?.activeChamber) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await api.advanceChamber(pool.activeChamber.id, {
        clientId,
        action,
        meetingSpot,
      });
      setPool(fresh);
      if (fresh.activeChamber?.stage === 4) {
        onNotify('🔥 Obě Masky potvrdily! Tajné heslo pro setkání je odemčeno.');
        await onProfileRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se posunout fázi.');
    } finally {
      setLoading(false);
    }
  };

  const handleBurnChamber = async () => {
    if (!pool?.activeChamber) return;
    setLoading(true);
    ambientAudio.playBurnWhoosh();
    try {
      const fresh = await api.burnChamber(pool.activeChamber.id, clientId);
      setPool(fresh);
      onNotify('Maska spálena beze stopy. Můžeš zkusit jinou jiskru v poolu.');
    } finally {
      setLoading(false);
    }
  };

  // ─── VIEW 1: CREATE OR JOIN TAJNÝ KRUH ──────────────────────────────────────
  if (!pool) {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#d4af37]">
            Skupinový Pool pro 6–30 lidí • Chata • Párty • Silvestr
          </p>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#f8ece4] leading-tight">
            {joinModeCode ? `Vstup do Kruhu: ${poolTitle}` : 'Tajný Kruh — Hra o Masku'}
          </h1>
          <p className="text-xs sm:text-sm text-[#c4aeb7] max-w-2xl leading-relaxed">
            Hoď do poolu anonymní návrh. Někdo ho chytí — ale nikdo neví, kdo je kdo. K sobě se
            propracujete přes <strong>Zkoušku chemie</strong> a{' '}
            <strong className="text-[#f2d57e]">skrytý fyzický signál přímo v místnosti</strong>.
            Kdykoliv můžeš bez ztrapnění spálit masku.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-xs sm:text-sm text-red-200">
            {error}
          </div>
        )}

        <form
          onSubmit={handleCreateOrJoin}
          className="velvet-card lattice-bg gold-shimmer-border rounded-3xl p-5 sm:p-7 space-y-5"
        >
          {!joinModeCode && (
            <>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-1.5">
                  Název vaší akce / skupiny
                </label>
                <input
                  type="text"
                  value={poolTitle}
                  onChange={(e) => setPoolTitle(e.target.value)}
                  placeholder="Např. Chata na Šumavě, Silvestr, Teambuilding…"
                  className="w-full rounded-xl border border-[#d4af37]/30 bg-black/50 px-4 py-3 text-sm text-[#fff3e4] focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#d4af37] mb-2">
                  Úroveň žáru v místnosti
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {HEAT_MODES.map((hm) => (
                    <button
                      key={hm.id}
                      type="button"
                      onClick={() => setHeatMode(hm.id)}
                      className={`cursor-pointer rounded-2xl p-3.5 text-left border transition ${
                        heatMode === hm.id
                          ? 'bg-[#381121] border-[#d4af37]/75 text-white'
                          : 'bg-black/35 border-white/10 text-[#c4aeb7]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs">{hm.label}</span>
                        <span className="text-xs">{hm.flames}</span>
                      </div>
                      <p className="text-[11px] opacity-80">{hm.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Silent compatibility filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#b7a0aa] mb-2">
                Já jsem (tichý filtr)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['M', 'Muž'],
                    ['F', 'Žena'],
                    ['X', 'Jiné'],
                  ] as const
                ).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setGender(val)}
                    className={`cursor-pointer rounded-xl py-2.5 text-xs font-medium border ${
                      gender === val
                        ? 'bg-[#8f1833] border-[#f2d57e]/60 text-white'
                        : 'bg-black/35 border-white/10 text-[#bfa9b2]'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#b7a0aa] mb-2">
                Lákají mě (nekompatibilní skryjeme)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['F', 'Ženy'],
                    ['M', 'Muži'],
                    ['Any', 'Kdokoliv'],
                  ] as const
                ).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSeeking(val)}
                    className={`cursor-pointer rounded-xl py-2.5 text-xs font-medium border ${
                      seeking === val
                        ? 'bg-[#8f1833] border-[#f2d57e]/60 text-white'
                        : 'bg-black/35 border-white/10 text-[#bfa9b2]'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clue 1 Vault */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#b7a0aa] mb-2">
              Tvá tajná stopa #1 (odemkne se až v Tajné komnatě, neidentifikuje tě hned):
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {presets.cluePresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClue1(c)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs border transition ${
                    clue1 === c
                      ? 'bg-[#361120] border-[#d4af37]/70 text-[#f2d57e]'
                      : 'bg-black/35 border-white/10 text-[#c1abb4]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={clue1}
              onChange={(e) => setClue1(e.target.value)}
              placeholder="Nebo napiš vlastní obecnou stopu…"
              className="w-full rounded-xl border border-white/15 bg-black/45 px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#d4af37] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[54px] cursor-pointer inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#7d152d] via-[#a91e3e] to-[#7d152d] px-6 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#fff4e2] border border-[#f2d57e]/45 shadow-xl shadow-[#8c1832]/40 hover:brightness-115 transition disabled:opacity-50"
          >
            <Users className="h-5 w-5 text-[#f2d57e]" />
            {loading
              ? 'Nasazuji masku…'
              : joinModeCode
                ? `Nasadit tajnou masku & Vstoupit (${joinModeCode})`
                : 'Otevřít Tajný Kruh & Pozvat skupinu'}
          </button>

          {!joinModeCode && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowManualJoin((v) => !v)}
                className="cursor-pointer text-xs text-[#cbb5be] underline decoration-[#d4af37]/40 underline-offset-4 hover:text-[#f2d57e]"
              >
                {showManualJoin ? 'Skrýt kód' : 'Máš už kód Kruhu (např. KRUH-8X2A)?'}
              </button>
            </div>
          )}
        </form>

        {showManualJoin && !joinModeCode && (
          <form onSubmit={handleManualLookup} className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={manualJoinCode}
              onChange={(e) => setManualJoinCode(e.target.value.toUpperCase())}
              placeholder="KRUH-XXXX"
              className="flex-1 rounded-xl border border-[#d4af37]/35 bg-black/50 px-4 py-3 text-center font-mono tracking-[0.2em] text-[#f2d57e] uppercase focus:outline-none"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-[#2a1019] border border-[#d4af37]/40 px-5 py-3 text-xs font-semibold uppercase text-[#f2d57e]"
            >
              Najít
            </button>
          </form>
        )}
      </div>
    );
  }

  // ─── VIEW 2: INSIDE ACTIVE TAJNÝ KRUH ───────────────────────────────────────
  const chamber = pool.activeChamber;

  return (
    <div className="space-y-5">
      {/* Pool Identity + WhatsApp Group Invite Header */}
      <div className="velvet-card gold-shimmer-border rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#361120] border border-[#d4af37]/40 px-2 py-0.5 font-mono text-[11px] font-bold text-[#f2d57e]">
                {pool.poolCode}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-[#b49ba5]">
                Auto-smazání za 12 h
              </span>
            </div>
            <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#fff3e2] mt-1">
              {pool.title}
            </h2>
          </div>

          {pool.me && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#d4af37]/35 bg-[#190910] px-4 py-2.5">
              <span className="text-2xl">{pool.me.maskSymbol}</span>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#bfa5af]">Tvá maska</p>
                <p className="font-serif-display text-lg font-semibold text-[#f2d57e] leading-tight">
                  {pool.me.maskName}
                </p>
              </div>
              <div className="pl-3 ml-1 border-l border-white/10 text-center">
                <span className="block text-[9px] uppercase tracking-wider text-[#b7a0aa]">
                  Sirky
                </span>
                <span className="text-sm font-bold text-[#ffbe76]">
                  {'🔥'.repeat(Math.max(0, pool.me.goldenMatchesLeft)) || '0'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Teploměr místnosti (Room Heat Meter) */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-black/35 border border-white/5 py-2 px-1">
            <span className="font-serif-display text-xl font-bold text-[#f8ece4] block leading-none">
              {pool.memberCount}
            </span>
            <span className="text-[10px] text-[#9e8690]">Masek</span>
          </div>
          <div className="rounded-xl bg-black/35 border border-white/5 py-2 px-1">
            <span className="font-serif-display text-xl font-bold text-[#f2d57e] block leading-none">
              {pool.openSparksCount}
            </span>
            <span className="text-[10px] text-[#9e8690]">Jisker</span>
          </div>
          <div className="rounded-xl bg-black/35 border border-white/5 py-2 px-1">
            <span className="font-serif-display text-xl font-bold text-[#ff7b89] block leading-none">
              {pool.activeChambersCount}
            </span>
            <span className="text-[10px] text-[#9e8690]">Komnat</span>
          </div>
          <div className="rounded-xl bg-black/35 border border-white/5 py-2 px-1">
            <span className="font-serif-display text-xl font-bold text-emerald-300 block leading-none">
              {pool.completedRendezvousCount}
            </span>
            <span className="text-[10px] text-[#9e8690]">Srazů</span>
          </div>
        </div>

        {/* 1-Click WhatsApp Group Invite Bar */}
        <div className="flex flex-wrap gap-2">
          <a
            href={whatsappGroupHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[200px] min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#062411] hover:brightness-105 transition"
          >
            <MessageCircle className="h-4 w-4 fill-current" />
            Pozvat skupinu na WhatsApp
          </a>
          <button
            type="button"
            onClick={handleCopyGroupLink}
            className="cursor-pointer min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d4af37]/35 bg-black/40 px-4 py-2.5 text-xs font-medium text-[#f2d57e] hover:bg-white/10"
          >
            <Copy className="h-3.5 w-3.5" />
            {copiedLink ? 'Zkopírováno!' : 'Link'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSpawnDemoBot}
            title="Přidá testovací Masku, aby sis hru mohl vyzkoušet i sám"
            className="cursor-pointer min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-[#d6c2ca] hover:border-[#d4af37]/40"
          >
            <Bot className="h-3.5 w-3.5 text-[#f2d57e]" />
            + Demo Maska
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-xs sm:text-sm text-red-200">
          {error}
        </div>
      )}

      {pool.lastChamberBurnedNotice && !chamber && (
        <div className="rounded-2xl border border-white/15 bg-[#180a10] px-4 py-3.5 flex items-center gap-2.5 text-xs text-[#cbb5be]">
          <Wind className="h-4 w-4 text-[#d4af37] shrink-0" />
          <span>
            Předchozí Masková komnata se rozplynula v kouři beze stopy. Můžeš kdykoliv chytit nebo
            vhodit novou jiskru.
          </span>
        </div>
      )}

      {/* ─── ACTIVE MASK CHAMBER (4-STAGE GAMEPLAY!) ─── */}
      {chamber ? (
        <MaskChamberView
          chamber={chamber}
          meetingSpots={presets.meetingSpots}
          farLimit={farLimit}
          setFarLimit={setFarLimit}
          dynamicStyle={dynamicStyle}
          setDynamicStyle={setDynamicStyle}
          whisperLine={whisperLine}
          setWhisperLine={setWhisperLine}
          loading={loading}
          onSubmitChemistry={handleSubmitChemistry}
          onAdvance={handleAdvance}
          onBurn={handleBurnChamber}
        />
      ) : (
        /* ─── SIN POOL FEED (THROW & CATCH SPARKS) ─── */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-serif-display text-2xl font-semibold text-[#f8ece4]">
              Hořící návrhy v poolu
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSystemSpark}
                disabled={loading}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-[#d6c2ca] hover:border-[#d4af37]/40"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#f2d57e]" />
                Ledolamač
              </button>
              <button
                type="button"
                onClick={() => setShowSparkComposer((v) => !v)}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8c1832] to-[#b51f3e] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white border border-[#f2d57e]/35"
              >
                <Plus className="h-4 w-4" />
                Hodit návrh
              </button>
            </div>
          </div>

          {/* Throw New Spark Composer */}
          {showSparkComposer && (
            <motion.form
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleDropSpark}
              className="velvet-card rounded-2xl p-4 sm:p-5 space-y-3.5 border border-[#d4af37]/35"
            >
              <p className="text-[11px] uppercase tracking-wider text-[#f2d57e]">
                Vhodit anonymní návrh pod maskou {pool.me?.maskSymbol} {pool.me?.maskName}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {presets.quickSparks.map((qs, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSparkText(qs)}
                    className="cursor-pointer rounded-full border border-[#d4af37]/25 bg-black/40 px-3 py-1.5 text-[11px] text-[#e1ced6] hover:border-[#f2d57e] text-left"
                  >
                    „{qs.slice(0, 44)}…“
                  </button>
                ))}
              </div>

              <textarea
                value={sparkText}
                onChange={(e) => setSparkText(e.target.value)}
                rows={3}
                placeholder="Napiš svůj tajný návrh pro skupinu (nikdo nepozná, že je od tebe)…"
                className="w-full rounded-xl border border-[#d4af37]/25 bg-black/50 p-3.5 text-sm text-white placeholder-[#7d6670] focus:border-[#d4af37] focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSparkComposer(false)}
                  className="cursor-pointer px-4 py-2 text-xs text-[#b49ba5]"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8c1832] to-[#b51f3e] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                  Vhodit do poolu
                </button>
              </div>
            </motion.form>
          )}

          {/* Sparks List */}
          {pool.sparks.length === 0 ? (
            <div className="velvet-card rounded-3xl p-8 text-center space-y-3">
              <Flame className="h-9 w-9 text-[#d4af37]/70 mx-auto" />
              <h4 className="font-serif-display text-2xl text-[#f8ece4]">
                V poolu zatím nikdo neškrtl sirkou
              </h4>
              <p className="text-xs sm:text-sm text-[#bfa8b1] max-w-md mx-auto">
                Buď první a hoď anonymní návrh — nebo klikni na <strong>+ Demo Maska</strong> nahoře
                a vyzkoušej si celý gameplay se skrytými signály hned teď!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {pool.sparks.map((spark) => (
                <div
                  key={spark.id}
                  className={`velvet-card rounded-2xl p-5 flex flex-col justify-between gap-4 border ${
                    spark.isMine ? 'border-[#d4af37]/45' : 'border-[#d4af37]/15'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#f2d57e]">
                        <span>{spark.authorMaskSymbol}</span>
                        <span>{spark.authorMaskName}</span>
                        {spark.isMine && (
                          <span className="rounded bg-[#d4af37]/20 px-1.5 py-0.5 text-[10px]">
                            Tvůj návrh
                          </span>
                        )}
                      </span>
                      {!spark.isMine && (
                        <button
                          type="button"
                          onClick={() => {
                            api.reportPoolSpark(pool.poolCode, spark.id);
                            onNotify('Návrh nahlášen.');
                          }}
                          className="cursor-pointer text-[#7a646e] hover:text-red-300"
                          title="Nahlásit nevhodný návrh"
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="font-serif-display text-xl italic text-[#f8ece4] leading-relaxed">
                      „{spark.text}“
                    </p>
                  </div>

                  {/* Author view: Incoming masked suitors */}
                  {spark.isMine ? (
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      {spark.incomingCatches.length === 0 ? (
                        <p className="text-xs text-[#9e8690]">
                          Čekám, až někdo z místnosti chytí tvou jiskru…
                        </p>
                      ) : (
                        <>
                          <p className="text-[11px] uppercase tracking-wider text-[#f2d57e] font-semibold">
                            Zájemci v maskách ({spark.incomingCatches.length}) — vyber JEDNOHO:
                          </p>
                          {spark.incomingCatches.map((c) => (
                            <div
                              key={c.catchId}
                              className="rounded-xl border border-[#d4af37]/30 bg-[#1c0a12] p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[#f2d57e]">
                                  {c.catcherMaskSymbol} {c.catcherMaskName}
                                </span>
                              </div>
                              <p className="text-xs italic text-[#e5d2da]">„{c.pitchText}“</p>
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleSelectCatch(spark.id, c.catchId)}
                                className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-[#8c1832] to-[#b51f3e] py-2 text-xs font-semibold uppercase tracking-wider text-white"
                              >
                                Vstoupit do Tajné komnaty →
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    /* Other players view: Catch spark */
                    <div className="pt-3 border-t border-white/10">
                      {spark.alreadyCaughtByMe ? (
                        <p className="text-xs text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          Chyceno! Čeká se, až si tě autor vybere do Tajné komnaty.
                        </p>
                      ) : catchingSparkId === spark.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={catchPitch}
                            onChange={(e) => setCatchPitch(e.target.value)}
                            placeholder="1 tajná věta: Proč by měl/a vybrat zrovna tebe?"
                            className="w-full rounded-xl border border-[#d4af37]/35 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setCatchingSparkId(null)}
                              className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[#a9929c]"
                            >
                              Zpět
                            </button>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleCatchSpark(spark.id)}
                              className="flex-1 cursor-pointer rounded-lg bg-gradient-to-r from-[#8c1832] to-[#b51f3e] py-2 text-xs font-semibold text-white"
                            >
                              Odeslat (1 Zlatá sirka 🔥)
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCatchingSparkId(spark.id)}
                          className="w-full min-h-[44px] cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/40 bg-[#270e18] py-2.5 text-xs font-semibold uppercase tracking-wider text-[#f2d57e] hover:bg-[#3b1323] transition"
                        >
                          <Flame className="h-3.5 w-3.5" />
                          Chytám jiskru ({spark.catchCount > 0 ? `${spark.catchCount} zájemců` : 'Buď první'})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── SUBCOMPONENT: 4-STAGE MASK CHAMBER GAMEPLAY ─────────────────────────── */
function MaskChamberView({
  chamber,
  meetingSpots,
  farLimit,
  setFarLimit,
  dynamicStyle,
  setDynamicStyle,
  whisperLine,
  setWhisperLine,
  loading,
  onSubmitChemistry,
  onAdvance,
  onBurn,
}: {
  chamber: MaskChamber;
  meetingSpots: string[];
  farLimit: string;
  setFarLimit: (v: string) => void;
  dynamicStyle: string;
  setDynamicStyle: (v: string) => void;
  whisperLine: string;
  setWhisperLine: (v: string) => void;
  loading: boolean;
  onSubmitChemistry: (e: React.FormEvent) => void;
  onAdvance: (
    action:
      | 'consent_stage1'
      | 'signal_a_sent'
      | 'signal_a_spotted'
      | 'signal_b_sent'
      | 'signal_b_spotted'
      | 'set_spot',
    meetingSpot?: string
  ) => void;
  onBurn: () => void;
}) {
  const stages = ['1. Chemie', '2. Signál A', '3. Signál B', '4. Sraz'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="velvet-card lattice-bg gold-shimmer-border rounded-3xl p-5 sm:p-7 space-y-5"
    >
      {/* Top Chamber Match Banner + Safe Eject */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d4af37]/20 pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#d4af37]">
            Tajná komnata • Identity skryty
          </p>
          <h3 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#fff3e2]">
            {chamber.myMaskSymbol} {chamber.myMaskName}{' '}
            <span className="text-[#d4af37] mx-1">×</span> {chamber.otherMaskSymbol}{' '}
            {chamber.otherMaskName}
          </h3>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={onBurn}
          className="cursor-pointer self-start inline-flex items-center gap-1.5 rounded-xl border border-red-400/35 bg-red-950/40 px-3.5 py-2 text-xs font-medium text-red-200 hover:bg-red-950/80 transition"
        >
          <Wind className="h-3.5 w-3.5" />
          Spálit masku (Únik bez stopy)
        </button>
      </div>

      {/* 4-Stage Progress Bar */}
      <div className="grid grid-cols-4 gap-1.5">
        {stages.map((lbl, idx) => {
          const num = idx + 1;
          const active = chamber.stage === num;
          const done = chamber.stage > num;
          return (
            <div
              key={lbl}
              className={`rounded-xl py-2 px-1 text-center text-[10px] sm:text-xs font-semibold border ${
                active
                  ? 'bg-[#8f1833] border-[#f2d57e]/70 text-white'
                  : done
                    ? 'bg-emerald-950/50 border-emerald-500/35 text-emerald-300'
                    : 'bg-black/35 border-white/10 text-[#8b747e]'
              }`}
            >
              {lbl}
            </div>
          );
        })}
      </div>

      {/* ─── STAGE 1: BLIND CHEMISTRY TRIAL ─── */}
      {chamber.stage === 1 && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-black/35 border border-white/10 p-4 text-xs sm:text-sm italic text-[#e5d2da]">
            Jiskra: „{chamber.sparkText}“
          </div>

          {!chamber.myAnswersSubmitted ? (
            <form onSubmit={onSubmitChemistry} className="space-y-4">
              <p className="text-xs uppercase tracking-wider text-[#f2d57e] font-semibold">
                Zkouška 1: Odpověz naslepo (druhá Maska uvidí odpovědi až poté, co odpoví oba)
              </p>

              <div className="space-y-2">
                <label className="text-xs text-[#cbb5be] block">1. Jak daleko chceš dnes zajít?</label>
                <div className="grid grid-cols-1 gap-2">
                  {FAR_LIMITS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFarLimit(opt)}
                      className={`cursor-pointer text-left rounded-xl px-4 py-3 text-xs sm:text-sm border ${
                        farLimit === opt
                          ? 'bg-[#381121] border-[#d4af37] text-white'
                          : 'bg-black/35 border-white/10 text-[#c4aeb7]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-[#cbb5be] block">2. Jaká dynamika tě láká?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DYNAMICS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDynamicStyle(opt)}
                      className={`cursor-pointer text-left rounded-xl px-3.5 py-2.5 text-xs border ${
                        dynamicStyle === opt
                          ? 'bg-[#381121] border-[#d4af37] text-white'
                          : 'bg-black/35 border-white/10 text-[#c4aeb7]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[#cbb5be] block mb-1.5">
                  3. Co je první věta, kterou mi pošeptáš, až poznáš, kdo jsem?
                </label>
                <input
                  type="text"
                  value={whisperLine}
                  onChange={(e) => setWhisperLine(e.target.value)}
                  placeholder="Např. ‚Tak přesně v tebe jsem tajně doufal/a…‘"
                  className="w-full rounded-xl border border-[#d4af37]/30 bg-black/50 px-4 py-3 text-sm text-white focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[50px] cursor-pointer rounded-2xl bg-gradient-to-r from-[#7d152d] to-[#a91e3e] py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white border border-[#f2d57e]/40"
              >
                <Lock className="inline h-4 w-4 mr-1.5 -mt-0.5 text-[#f2d57e]" />
                Uzamknout mé odpovědi
              </button>
            </form>
          ) : !chamber.otherAnswersSubmitted ? (
            <div className="py-6 text-center space-y-2">
              <Sparkles className="h-8 w-8 text-[#f2d57e] mx-auto animate-pulse" />
              <p className="font-serif-display text-2xl text-[#fff3e2]">
                Čekáme na odpovědi {chamber.otherMaskSymbol} {chamber.otherMaskName}…
              </p>
              <p className="text-xs text-[#b59ea8]">
                Obrazovka se sama aktualizuje za pár vteřin.
              </p>
            </div>
          ) : (
            /* Both answered -> Reveal Chemistry + Clue #1 + Consent Gate #1 */
            <div className="space-y-4">
              {chamber.confessorVerdict && (
                <blockquote className="rounded-2xl border-l-2 border-[#f2d57e] bg-[#1a0911]/90 p-4 text-xs sm:text-sm italic text-[#f7e7ee] leading-relaxed">
                  <span className="not-italic text-[10px] uppercase tracking-widest text-[#d4af37] block mb-1">
                    Verdikt AI Zpovědníka:
                  </span>
                  „{chamber.confessorVerdict}“
                </blockquote>
              )}

              {chamber.otherClue1 && (
                <div className="rounded-2xl border border-[#f2d57e]/45 bg-[#2a150e]/85 p-4 flex items-center gap-3">
                  <Eye className="h-5 w-5 text-[#f2d57e] shrink-0" />
                  <div className="text-xs sm:text-sm">
                    <span className="uppercase tracking-wider text-[10px] text-[#f2d57e] block font-semibold">
                      Odemčena 1. stopa o {chamber.otherMaskName}:
                    </span>
                    <strong className="text-[#fff3e2]">„{chamber.otherClue1}“</strong>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4 space-y-2 text-xs">
                  <p className="font-semibold text-[#d4af37]">
                    {chamber.myMaskSymbol} Tvé odpovědi
                  </p>
                  <p className="text-[#e6d5dc]">• {chamber.myAnswers?.farLimit}</p>
                  <p className="text-[#e6d5dc]">• {chamber.myAnswers?.dynamicStyle}</p>
                  <p className="italic text-[#f2d57e]">„{chamber.myAnswers?.whisperLine}“</p>
                </div>

                <div className="rounded-2xl border border-[#d4af37]/35 bg-[#230b15] p-4 space-y-2 text-xs">
                  <p className="font-semibold text-[#f2d57e]">
                    {chamber.otherMaskSymbol} {chamber.otherMaskName}
                  </p>
                  <p className="text-[#f7eae2]">• {chamber.otherAnswers?.farLimit}</p>
                  <p className="text-[#f7eae2]">• {chamber.otherAnswers?.dynamicStyle}</p>
                  <p className="italic text-[#f5da8b]">„{chamber.otherAnswers?.whisperLine}“</p>
                </div>
              </div>

              {chamber.myConsentStage1 ? (
                <p className="text-center text-xs text-emerald-300 py-2">
                  ✓ Potvrdil/a jsi postup. Čekáme na souhlas {chamber.otherMaskName}…
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={onBurn}
                    className="cursor-pointer min-h-[48px] rounded-xl border border-white/15 bg-black/40 py-3 text-xs font-medium text-[#cbb5be]"
                  >
                    💨 Spálit masku (Není to můj vibe)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onAdvance('consent_stage1')}
                    className="cursor-pointer min-h-[48px] rounded-xl bg-gradient-to-r from-[#8c1832] to-[#b51f3e] py-3 text-xs font-bold uppercase tracking-wider text-white border border-[#f2d57e]/50 shadow-lg"
                  >
                    🔥 Jdeme na Zkoušku signálu v místnosti!
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── STAGE 2 & STAGE 3: ASYMMETRIC REAL-WORLD STEALTH SIGNALS! ─── */}
      {(chamber.stage === 2 || chamber.stage === 3) && (
        <div className="space-y-5">
          {chamber.mySignalInstruction ? (
            /* I AM THE SENDER IN THIS STAGE */
            <div className="rounded-3xl border-2 border-[#f2d57e]/60 bg-gradient-to-b from-[#391020] to-[#17080e] p-6 text-center space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2d57e] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#17080d]">
                <Radio className="h-3.5 w-3.5" />
                Tvá tajná mise v místnosti (Kolo {chamber.stage - 1}/2)
              </span>

              <h4 className="font-serif-display text-3xl text-[#fff3e2]">
                Vyšli nenápadný signál v reálné místnosti!
              </h4>

              <p className="text-base sm:text-lg text-[#f7e7ee] leading-relaxed max-w-lg mx-auto font-medium">
                {chamber.mySignalInstruction}
              </p>

              <p className="text-xs text-[#cbb5be]">
                {chamber.otherMaskName} právě sleduje místnost a hledá tohle gesto. Tvá druhá Maska
                zůstává prozatím skrytá, dokud nepotvrdí, že mezi vámi přeskočila jiskra.
              </p>

              {(chamber.stage === 2 && !chamber.signalASent) ||
              (chamber.stage === 3 && !chamber.signalBSent) ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    onAdvance(chamber.stage === 2 ? 'signal_a_sent' : 'signal_b_sent')
                  }
                  className="w-full sm:w-auto min-h-[52px] cursor-pointer rounded-2xl bg-gradient-to-r from-[#c4972f] via-[#e8c66c] to-[#c4972f] px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#17080d] shadow-xl"
                >
                  ✓ Signál jsem právě vyslal/a v místnosti
                </button>
              ) : (
                <div className="rounded-xl bg-black/40 border border-[#d4af37]/30 px-4 py-3 text-xs text-[#f2d57e]">
                  🔥 Signál odeslán! Čekáme, až {chamber.otherMaskName} zareaguje z místnosti…
                </div>
              )}
            </div>
          ) : (
            /* I AM THE OBSERVER IN THIS STAGE (SAFE EJECT MAGIC!) */
            <div className="rounded-3xl border-2 border-[#d4af37]/50 bg-gradient-to-b from-[#25101b] to-[#12070c] p-6 text-center space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#f2d57e]">
                <Eye className="h-3.5 w-3.5" />
                Sleduj místnost • Tvá identita je 100 % krytá!
              </span>

              <h4 className="font-serif-display text-3xl text-[#fff3e2]">
                Hledej {chamber.otherMaskSymbol} {chamber.otherMaskName} mezi lidmi!
              </h4>

              <div className="rounded-2xl border border-[#d4af37]/30 bg-black/45 p-4 text-sm sm:text-base text-[#f8ece4] max-w-lg mx-auto">
                <span className="block text-[10px] uppercase tracking-widest text-[#d4af37] mb-1">
                  Tohle gesto právě udělá:
                </span>
                <strong>{chamber.watchForSignalHint}</strong>
              </div>

              {(chamber.stage === 2 && !chamber.signalASent) ||
              (chamber.stage === 3 && !chamber.signalBSent) ? (
                <p className="text-xs text-[#cbb5be] animate-pulse">
                  👀 Dívej se nenápadně po místnosti… Čekáme, až {chamber.otherMaskName} klikne, že
                  signál vyslal/a.
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-[#f2d57e]">
                    Signál proběhl! Viděl/a jsi, kdo to je? Rozhodni zcela svobodně:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={onBurn}
                      className="cursor-pointer min-h-[52px] rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-xs font-medium text-[#cbb5be] hover:bg-red-950/50"
                    >
                      💨 Spálit masku (Nepoznají, kdo jsem!)
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        onAdvance(chamber.stage === 2 ? 'signal_a_spotted' : 'signal_b_spotted')
                      }
                      className="cursor-pointer min-h-[52px] rounded-2xl bg-gradient-to-r from-[#8c1832] to-[#c42346] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white border border-[#f2d57e]/60 shadow-xl"
                    >
                      {chamber.stage === 2
                        ? '🔥 HOŘÍM — Posílám svůj signál zpět!'
                        : '🔥 HOŘÍM — Chci tajné setkání!'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── STAGE 4: FINÁLNÍ RENDEZVOUS (NO REAL NAMES, ZERO SCREENSHOT RISK!) ─── */}
      {chamber.stage === 4 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border-2 border-[#f2d57e]/75 bg-gradient-to-b from-[#3d1022] via-[#1c0911] to-[#24120a] p-6 sm:p-8 text-center space-y-5 shadow-2xl"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2d57e] px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#17080d]">
            <Flame className="h-3.5 w-3.5" />
            Obě Masky potvrdily • Rendezvous odemčeno
          </span>

          <h4 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#fff4e0]">
            Oba víte, kdo jste. Teď zmizte ze světel!
          </h4>

          <div className="rounded-2xl border border-[#f2d57e]/45 bg-black/45 p-5 max-w-md mx-auto space-y-1">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">
              Tajné heslo pro první větu
            </p>
            <p className="font-serif-display text-2xl sm:text-3xl italic text-[#fff3e2]">
              {chamber.passphrase}
            </p>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <p className="text-xs uppercase tracking-wider text-[#d4af37] flex items-center justify-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Místo srazu: <strong className="text-white">{chamber.meetingSpot}</strong>
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {meetingSpots.map((spot) => (
                <button
                  key={spot}
                  type="button"
                  onClick={() => onAdvance('set_spot', spot)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] border ${
                    chamber.meetingSpot === spot
                      ? 'bg-[#8f1833] border-[#f2d57e] text-white'
                      : 'bg-black/40 border-white/10 text-[#cbb5be]'
                  }`}
                >
                  {spot}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/35 p-4 max-w-md mx-auto text-xs sm:text-sm text-[#e6d5dc] leading-relaxed">
            <span className="block text-[10px] uppercase tracking-widest text-[#f2d57e] mb-1">
              Pravidlo prvních 30 sekund:
            </span>
            {chamber.icebreaker}
          </div>

          <p className="text-[11px] text-[#a9929c] flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]" />
            Nikde v aplikaci nejsou pravá jména — nulové riziko screenshotu.
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={onBurn}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#b8321a] to-[#9e1c38] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white border border-[#ffbe76]/45"
          >
            <Flame className="h-4 w-4" />
            Spálit komnatu & Zničit stopy
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
