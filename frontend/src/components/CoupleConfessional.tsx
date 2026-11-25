import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Copy,
  Flame,
  Heart,
  HeartHandshake,
  Lock,
  MessageCircle,
  Play,
  RefreshCw,
  Share2,
  Sparkles,
  ThumbsDown,
  Users,
  Wand2,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  CoupleModeType,
  CoupleRoomStatus,
  DesireCard,
  IntensityLevel,
  Persona,
} from '../types/confession';
import { ambientAudio } from '../utils/ambientAudio';
import { LiveEveningModal } from './LiveEveningModal';

interface CoupleConfessionalProps {
  clientId: string;
  personas: Persona[];
  initialRoomCode?: string | null;
  initialPartnerRole?: 'A' | 'B' | null;
  onProfileRefresh: () => Promise<void>;
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

const COUPLE_MODES: {
  id: CoupleModeType;
  badge: string;
  title: string;
  desc: string;
}[] = [
  {
    id: 'deck',
    badge: 'Nejoblíbenější • 60 s',
    title: 'Tajné karty (Blind Deck)',
    desc: 'Oba projedete 12 smyslných karet. Ukážou se jen společné shody a magnetické polarity.',
  },
  {
    id: 'honesty',
    badge: 'Hluboké sblížení',
    title: 'Odvážná upřímnost',
    desc: 'Když v intimitě něco drhne. Zpovědník přeloží tichá přání do jazyka touhy bez obviňování.',
  },
  {
    id: 'confession',
    badge: 'Vlastní slova',
    title: 'Tajná zpověď slovem',
    desc: 'Každý zašeptá vlastní tajnou fantazii a hranice -> AI ušije společný večer.',
  },
];

export function CoupleConfessional({
  clientId,
  personas,
  initialRoomCode,
  initialPartnerRole,
  onProfileRefresh,
  onNotify,
}: CoupleConfessionalProps) {
  const [mode, setMode] = useState<CoupleModeType>('deck');
  const [personaId, setPersonaId] = useState('dominik');
  const [intensity, setIntensity] = useState<IntensityLevel>('spicy');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const [cards, setCards] = useState<DesireCard[]>([]);
  const [room, setRoom] = useState<CoupleRoomStatus | null>(null);
  const [activePartner, setActivePartner] = useState<'A' | 'B'>(initialPartnerRole ?? 'A');
  const [joinedViaLink, setJoinedViaLink] = useState(Boolean(initialRoomCode));

  // Deck state (1-card-at-a-time mobile thumb UX)
  const [cardIndex, setCardIndex] = useState(0);
  const [cardVotes, setCardVotes] = useState<Record<string, string>>({});

  // Text confession / honesty state
  const [confessionText, setConfessionText] = useState('');
  const [selectedBoundaries, setSelectedBoundaries] = useState<string[]>(['Pomalé tempo & masáž']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showLiveEvening, setShowLiveEvening] = useState(false);

  // Load Blind Desire Cards catalog
  useEffect(() => {
    api.getCoupleCards().then(setCards).catch(() => {});
  }, []);

  // Auto-join room from WhatsApp deep link (?room=SIN-XXXX&partner=B)
  useEffect(() => {
    if (!initialRoomCode) return;
    setLoading(true);
    api
      .getCoupleRoom(initialRoomCode)
      .then((existing) => {
        setRoom(existing);
        setJoinedViaLink(true);
        if (initialPartnerRole) {
          setActivePartner(initialPartnerRole);
        } else {
          setActivePartner(existing.partnerASubmitted && !existing.partnerBSubmitted ? 'B' : 'A');
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Odkaz na párovou zpovědnici vypršel nebo již shořel.'
        );
      })
      .finally(() => setLoading(false));
  }, [initialRoomCode, initialPartnerRole]);

  // Auto-poll every 4s while waiting for the other partner to finish via WhatsApp link
  const isWaitingForOtherPartner = Boolean(
    room &&
      !room.isReady &&
      ((activePartner === 'A' && room.partnerASubmitted && !room.partnerBSubmitted) ||
        (activePartner === 'B' && room.partnerBSubmitted && !room.partnerASubmitted))
  );

  useEffect(() => {
    if (!room || !isWaitingForOtherPartner) return;
    const interval = setInterval(async () => {
      try {
        const updated = await api.getCoupleRoom(room.roomCode);
        setRoom(updated);
        if (updated.isReady) {
          onNotify('🔥 Partner dokončil svou část! Večer rozhřešení je odemčen.');
          onProfileRefresh();
        }
      } catch {
        // ignore transient poll failure
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [room, isWaitingForOtherPartner, onNotify, onProfileRefresh]);

  const inviteRole: 'A' | 'B' = activePartner === 'A' ? 'B' : 'A';
  const inviteUrl = useMemo(() => {
    if (!room) return '';
    return `${window.location.origin}/?room=${encodeURIComponent(room.roomCode)}&partner=${inviteRole}`;
  }, [room, inviteRole]);

  const whatsappInviteHref = useMemo(() => {
    if (!inviteUrl) return '#';
    const text = `🔥 Mám pro nás na dnešek hříšnou hru v Párové zpovědnici. Už jsem uzamkl/a svou část — teď jsi na řadě ty! Jednostranná tajemství nikdo neuvidí, odhalí se jen naše společné shody:\n${inviteUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [inviteUrl]);

  const handleNativeShare = async () => {
    if (!inviteUrl) return;
    const shareData = {
      title: 'ODPUSTEK — Párová zpovědnice',
      text: '🔥 Už jsem uzamkl/a svou část v Párové zpovědnici — teď jsi na řadě ty! Ukážou se jen naše shody.',
      url: inviteUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fallback to copy
      }
    }
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    onNotify('Pozvánkový odkaz zkopírován!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    onNotify('Odkaz zkopírován do schránky.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const created = await api.createCoupleRoom(clientId, personaId, intensity, mode);
      setRoom(created);
      setActivePartner('A');
      setJoinedViaLink(false);
      setCardIndex(0);
      setCardVotes({});
      setConfessionText('');
      window.history.replaceState({}, '', `/?room=${created.roomCode}&partner=A`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se otevřít párovou kabinku.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const existing = await api.getCoupleRoom(joinCodeInput.trim());
      setRoom(existing);
      setActivePartner(existing.partnerASubmitted && !existing.partnerBSubmitted ? 'B' : 'A');
      setCardIndex(0);
      setCardVotes({});
      setConfessionText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kabinka s tímto kódem nebyla nalezena.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteCard = (cardId: string, vote: 'yes' | 'maybe' | 'no') => {
    setCardVotes((prev) => ({ ...prev, [cardId]: vote }));
    if (cardIndex < cards.length - 1) {
      setCardIndex((i) => i + 1);
    }
  };

  const handleSubmitPartner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!room) return;

    if (room.mode === 'deck') {
      if (Object.keys(cardVotes).length < 4) {
        setError('Ohodnoť prosím alespoň 4 karty.');
        return;
      }
    } else if (confessionText.trim().length < 8) {
      setError('Napiš alespoň krátkou větu (min. 8 znaků).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updated = await api.submitCoupleConfession(room.roomCode, {
        clientId,
        partnerRole: activePartner,
        confessionText: room.mode === 'deck' ? undefined : confessionText.trim(),
        boundaries: room.mode === 'deck' ? undefined : selectedBoundaries,
        cardVotes: room.mode === 'deck' ? cardVotes : undefined,
      });
      setRoom(updated);
      setConfessionText('');
      setCardVotes({});
      setCardIndex(0);

      if (updated.isReady) {
        onNotify('🔥 Obě tajemství se propojila! Večer rozhřešení je odemčen.');
        await onProfileRefresh();
      } else {
        onNotify('Tvé tajemství je uzamčeno! Pošli teď odkaz partnerovi na WhatsApp.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se uzamknout zpověď.');
    } finally {
      setLoading(false);
    }
  };

  const handleBurnRoom = async () => {
    if (!room) return;
    setLoading(true);
    ambientAudio.playBurnWhoosh();
    try {
      await api.burnCoupleRoom(room.roomCode);
      setShowLiveEvening(false);
      setRoom(null);
      setCardVotes({});
      setCardIndex(0);
      setConfessionText('');
      window.history.replaceState({}, '', '/');
      onNotify('Párová kabinka shořela v plamenech a byla nenávratně smazána.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBoundary = (b: string) => {
    setSelectedBoundaries((prev) =>
      prev.includes(b) ? prev.filter((item) => item !== b) : [...prev, b]
    );
  };

  const ratedCount = Object.keys(cardVotes).length;
  const currentCard = cards[cardIndex];
  const deckComplete = cards.length > 0 && ratedCount >= cards.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#d4af37]">
          Párová zpovědnice • Mobil-first • Otevřený pilot zdarma
        </p>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#f8ece4] leading-tight">
          Odhalte společné touhy beze studu
        </h1>
        <p className="text-xs sm:text-sm text-[#c4aeb7] max-w-2xl leading-relaxed">
          Začni teď na mobilu a na <strong>jedno kliknutí pošli odkaz partnerovi na WhatsApp</strong>.
          Jednostranné fantazie nikdo neuvidí — Zpovědník ukáže jen vaše shody a polaritu.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-xs sm:text-sm text-red-200">
          {error}
        </div>
      )}

      {/* ─── STATE 1: NO ROOM YET (MOBILE-FIRST START SCREEN) ─── */}
      {!room && (
        <div className="space-y-4">
          {/* 3 Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {COUPLE_MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`cursor-pointer text-left rounded-2xl p-4 sm:p-5 border transition-all ${
                    active
                      ? 'bg-gradient-to-b from-[#351120] to-[#17090f] border-[#d4af37]/75 shadow-lg shadow-[#9e1c38]/25'
                      : 'velvet-card hover:border-[#d4af37]/35'
                  }`}
                >
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                      active ? 'bg-[#d4af37] text-[#17080d]' : 'bg-white/10 text-[#f2d57e]'
                    }`}
                  >
                    {m.badge}
                  </span>
                  <h2 className="font-serif-display text-2xl font-semibold text-[#f8ece4] mb-1">
                    {m.title}
                  </h2>
                  <p className="text-xs text-[#cbb5be] leading-relaxed">{m.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Quick Confessor & Spice compact strip + Big Start CTA */}
          <div className="velvet-card gold-shimmer-border rounded-3xl p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#b7a0aa] mb-2">
                  Průvodce dnešního večera
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {personas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPersonaId(p.id)}
                      className={`cursor-pointer rounded-xl px-3 py-2.5 text-left text-xs border transition ${
                        personaId === p.id
                          ? 'bg-[#3b1222] border-[#d4af37]/70 text-white'
                          : 'bg-black/35 border-white/10 text-[#bfa9b2]'
                      }`}
                    >
                      <span className="font-medium block truncate">{p.name}</span>
                      <span className="text-[10px] opacity-75 block truncate">{p.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#b7a0aa] mb-2">
                  Žár scénáře
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['gentle', 'Něžný'],
                      ['spicy', 'Pikantní'],
                      ['burning', 'Odvážný 🔥'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setIntensity(val)}
                      className={`cursor-pointer rounded-xl py-3 text-xs font-medium border transition ${
                        intensity === val
                          ? 'bg-[#8f1833] border-[#f2d57e]/60 text-white'
                          : 'bg-black/35 border-white/10 text-[#bfa9b2]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleCreateRoom}
              className="w-full cursor-pointer min-h-[52px] inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#7d152d] via-[#a91e3e] to-[#7d152d] px-6 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#fff4e2] border border-[#f2d57e]/45 shadow-xl shadow-[#8c1832]/40 hover:brightness-115 active:scale-[0.99] transition disabled:opacity-50"
            >
              <HeartHandshake className="h-5 w-5 text-[#f2d57e]" />
              {loading ? 'Otevírám kabinku…' : 'Začít teď & Pak poslat odkaz partnerovi'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowJoinInput((v) => !v)}
                className="cursor-pointer text-xs text-[#cbb5be] underline decoration-[#d4af37]/40 underline-offset-4 hover:text-[#f2d57e]"
              >
                {showJoinInput ? 'Skrýt zadání kódu' : 'Máš od partnera kód ručně (např. SIN-7K4Q)?'}
              </button>

              {showJoinInput && (
                <form
                  onSubmit={handleJoinByCode}
                  className="mt-3 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
                >
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="SIN-XXXX"
                    className="flex-1 rounded-xl border border-[#d4af37]/30 bg-black/50 px-4 py-3 text-center font-mono tracking-[0.2em] text-[#f2d57e] uppercase focus:border-[#d4af37] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="cursor-pointer rounded-xl bg-[#2a1019] border border-[#d4af37]/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#f2d57e]"
                  >
                    Vstoupit
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── STATE 2: WAITING FOR PARTNER -> 1-CLICK WHATSAPP INVITE SCREEN ─── */}
      {room && !room.isReady && isWaitingForOtherPartner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="velvet-card gold-shimmer-border lattice-bg rounded-3xl p-6 sm:p-8 text-center space-y-6"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-950/60 text-emerald-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-[#d4af37]">
              Krok 2 ze 2 • Kód kabinky {room.roomCode}
            </p>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#fff3e2]">
              Tvé tajemství je uzamčeno!
            </h2>
            <p className="text-sm text-[#d4bfc8] max-w-md mx-auto leading-relaxed">
              Teď pošli tento soukromý odkaz partnerovi. Otevře se mu rovnou jeho část na mobilu —
              tvoje odpovědi neuvidí, odhalí se jen vaše shody.
            </p>
          </div>

          {/* 1-CLICK WHATSAPP PRIMARY CTA */}
          <div className="max-w-md mx-auto space-y-3">
            <a
              href={whatsappInviteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[54px] inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-6 py-4 text-sm font-bold uppercase tracking-wider text-[#062411] shadow-xl shadow-[#25D366]/25 hover:brightness-105 active:scale-[0.99] transition"
            >
              <MessageCircle className="h-5 w-5 fill-current" />
              Poslat odkaz na WhatsApp
            </a>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleNativeShare}
                className="cursor-pointer min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/40 bg-[#260e18] px-4 py-2.5 text-xs font-semibold text-[#f2d57e] hover:bg-[#381423]"
              >
                <Share2 className="h-4 w-4" />
                Sdílet jinak
              </button>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="cursor-pointer min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-xs font-semibold text-[#e6d5dc] hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                {copiedLink ? 'Zkopírováno!' : 'Kopírovat link'}
              </button>
            </div>
          </div>

          {/* Live Auto-Polling Indicator */}
          <div className="rounded-2xl border border-[#d4af37]/20 bg-black/35 px-4 py-3.5 max-w-md mx-auto flex items-center justify-center gap-2.5 text-xs text-[#cbb5be]">
            <RefreshCw className="h-3.5 w-3.5 text-[#d4af37] animate-spin" />
            <span>
              Čekám na partnera… Jakmile dokončí, <strong>Večer rozhřešení se tu sám otevře</strong>.
            </span>
          </div>

          {/* Fallback: Same device couch handoff */}
          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => {
                setActivePartner(inviteRole);
                setCardIndex(0);
                setCardVotes({});
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 text-[#f2d57e] underline underline-offset-4 hover:text-white"
            >
              <Users className="h-3.5 w-3.5" />
              Sedíte vedle sebe? Předat telefon Partnerovi {inviteRole}
            </button>
            <button
              type="button"
              onClick={handleBurnRoom}
              className="cursor-pointer text-[#9e8690] hover:text-red-300"
            >
              Zrušit a smazat pokoj
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── STATE 3: ACTIVE INPUT FOR PARTNER A OR B ─── */}
      {room && !room.isReady && !isWaitingForOtherPartner && (
        <div className="velvet-card lattice-bg gold-shimmer-border rounded-3xl p-5 sm:p-7 space-y-5">
          {/* Partner Context Banner */}
          <div className="flex items-center justify-between gap-2 border-b border-[#d4af37]/15 pb-3.5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#d4af37]">
                Kabinka {room.roomCode} • Partner {activePartner}
              </p>
              <p className="text-xs text-[#cbb5be] mt-0.5">
                {joinedViaLink || (activePartner === 'B' && room.partnerASubmitted)
                  ? 'Partner už svou část uzamkl! Teď jsi na řadě ty — nikdo neuvidí tvé neshody.'
                  : 'Vyplň svou tajnou část. Po uzamčení dostaneš 1-klik pozvánku na WhatsApp.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBurnRoom}
              className="cursor-pointer shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-[#b49ba5] hover:text-red-300"
            >
              Zrušit
            </button>
          </div>

          {/* MODE A: MOBILE-FIRST BLIND DESIRE DECK (1 CARD AT A TIME) */}
          {room.mode === 'deck' && cards.length > 0 && (
            <div className="space-y-5">
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#c6b0b9]">
                  <span>
                    Karta <strong className="text-[#f2d57e]">{Math.min(cardIndex + 1, cards.length)}</strong> z{' '}
                    {cards.length}
                  </span>
                  <span>Ohodnoceno: {ratedCount}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#8f1833] to-[#f2d57e] transition-all duration-300"
                    style={{ width: `${Math.round((ratedCount / cards.length) * 100)}%` }}
                  />
                </div>
              </div>

              {!deckComplete && currentCard ? (
                <div className="space-y-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentCard.id}
                      initial={{ opacity: 0, x: 24, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -24, scale: 0.97 }}
                      transition={{ duration: 0.22 }}
                      className="rounded-3xl border border-[#d4af37]/45 bg-gradient-to-b from-[#2f0f1c] via-[#17090f] to-[#12070c] p-6 sm:p-8 min-h-[220px] flex flex-col justify-between shadow-2xl"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 px-3 py-1 text-[11px] font-medium text-[#f2d57e]">
                          {currentCard.category}
                        </span>
                        <span className="text-xs text-[#f2d57e]" title="Intenzita">
                          {'🔥'.repeat(currentCard.spiceLevel)}
                        </span>
                      </div>

                      <div className="py-5 text-center space-y-2.5">
                        <h3 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#fff3e4]">
                          {currentCard.title}
                        </h3>
                        <p className="text-sm sm:text-base text-[#ebd9e1] leading-relaxed max-w-md mx-auto">
                          „{currentCard.prompt}“
                        </p>
                      </div>

                      {currentCard.complementaryCardId && (
                        <p className="text-[11px] text-center text-[#d4af37]/85 flex items-center justify-center gap-1">
                          <Wand2 className="h-3 w-3" />
                          Páruje se i s opačnou polaritou partnera!
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* 3 Big Mobile Thumb Buttons */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleVoteCard(currentCard.id, 'no')}
                      className="cursor-pointer min-h-[64px] flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/15 bg-[#160a0f] px-2 py-3 text-xs font-medium text-[#bda6b0] hover:bg-white/10 active:scale-95 transition"
                    >
                      <ThumbsDown className="h-4 w-4 text-[#9a828c]" />
                      <span>Raději ne</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleVoteCard(currentCard.id, 'maybe')}
                      className="cursor-pointer min-h-[64px] flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#d4af37]/50 bg-[#2d1a10] px-2 py-3 text-xs font-semibold text-[#f5da8b] hover:brightness-110 active:scale-95 transition"
                    >
                      <Sparkles className="h-4 w-4 text-[#f2d57e]" />
                      <span>Svedl bys mě</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleVoteCard(currentCard.id, 'yes')}
                      className="cursor-pointer min-h-[64px] flex flex-col items-center justify-center gap-1 rounded-2xl border border-[#f2d57e]/60 bg-gradient-to-b from-[#9e1c38] to-[#6f1125] px-2 py-3 text-xs font-bold text-white shadow-lg shadow-[#9e1c38]/35 hover:brightness-110 active:scale-95 transition"
                    >
                      <Heart className="h-4 w-4 fill-current text-[#f8d78c]" />
                      <span>Chci hned</span>
                    </button>
                  </div>

                  {/* Early lock-in option after >= 6 cards */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      disabled={cardIndex === 0}
                      onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
                      className="cursor-pointer text-[#a9929c] hover:text-white disabled:opacity-30"
                    >
                      ← Předchozí karta
                    </button>
                    {ratedCount >= 6 && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSubmitPartner()}
                        className="cursor-pointer text-[#f2d57e] font-semibold underline underline-offset-4"
                      >
                        Stačí mi {ratedCount} karet — Uzamknout teď →
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* All 12 Cards Rated -> Lock-in CTA */
                <div className="text-center py-6 space-y-4">
                  <Sparkles className="h-10 w-10 text-[#f2d57e] mx-auto" />
                  <h3 className="font-serif-display text-3xl text-[#fff3e2]">
                    Všech {cards.length} karet ohodnoceno!
                  </h3>
                  <p className="text-sm text-[#cbb5be] max-w-md mx-auto">
                    {activePartner === 'B' && room.partnerASubmitted
                      ? 'Stačí kliknout níže a Zpovědník okamžitě odhalí vaše shody a dnešní Večer rozhřešení.'
                      : 'Uzamkni své karty a jedním kliknutím pošli partnerovi soukromý odkaz na WhatsApp.'}
                  </p>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSubmitPartner()}
                    className="w-full sm:w-auto min-h-[52px] cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7d152d] via-[#a91e3e] to-[#7d152d] px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.16em] text-white border border-[#f2d57e]/50 shadow-xl"
                  >
                    <Lock className="h-4 w-4 text-[#f2d57e]" />
                    {loading
                      ? 'Propojuji tajemství…'
                      : room.partnerASubmitted && activePartner === 'B'
                        ? 'Odhalit naše shody & Scénář'
                        : 'Uzamknout & Získat WhatsApp odkaz'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE B & C: FREE CONFESSION OR BRAVE HONESTY */}
          {room.mode !== 'deck' && (
            <form onSubmit={handleSubmitPartner} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#f2d57e] mb-2">
                  {room.mode === 'honesty'
                    ? 'Co ti v naší intimitě chybí a bojíš se to říct, abys druhého nezranil/a?'
                    : 'Tvé tajné přání nebo fantazie na dnešní noc:'}
                </label>
                <textarea
                  value={confessionText}
                  onChange={(e) => setConfessionText(e.target.value)}
                  rows={4}
                  placeholder={
                    room.mode === 'honesty'
                      ? 'Např. „Chybí mi pocit, že si na sebe uděláme čas bez spěchu a telefonů, a moc bych si přál/a víc iniciativy…“'
                      : 'Např. „Láká mě představa jemné dominance se šátkem nebo hry na cizince při sklence vína…“'
                  }
                  className="w-full rounded-2xl border border-[#d4af37]/25 bg-[#0b0508]/90 p-4 text-sm sm:text-base text-[#f7ece6] placeholder-[#78616b] focus:border-[#d4af37]/70 focus:outline-none"
                />
              </div>

              {room.mode === 'confession' && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#bba5ae] mb-2">
                    Hranice & preference:
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
                              : 'bg-black/35 border-white/10 text-[#c1abb4]'
                          }`}
                        >
                          {b}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[50px] cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7d152d] via-[#a31d3c] to-[#7d152d] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white border border-[#f2d57e]/45"
              >
                <Lock className="h-4 w-4 text-[#f2d57e]" />
                {loading
                  ? 'Zamykám tajemství…'
                  : room.partnerASubmitted && activePartner === 'B'
                    ? 'Odhalit Večer rozhřešení'
                    : 'Uzamknout & Poslat na WhatsApp'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ─── STATE 4: REVEALED EVENING SCENARIO + LIVE GUIDED LAUNCHER ─── */}
      {room && room.isReady && room.scenario && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="velvet-card gold-shimmer-border rounded-3xl p-5 sm:p-8 space-y-6"
        >
          {/* Scenario Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d4af37]/20 pb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#d4af37] mb-1">
                Večer rozhřešení odemčen • {room.roomCode}
              </p>
              <h2 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#fff3e4]">
                {room.scenario.title}
              </h2>
              <p className="text-sm italic text-[#d8b7c4] mt-1">{room.scenario.archetypePair}</p>
            </div>

            <div className="rounded-2xl border border-[#d4af37]/50 bg-[#230a13] px-5 py-3 text-center self-start">
              <span className="block text-[10px] uppercase tracking-widest text-[#c6abb6]">
                Chemie páru
              </span>
              <span className="font-serif-display text-3xl font-bold text-[#f2d57e]">
                {room.scenario.chemistryScore} %
              </span>
            </div>
          </div>

          {/* Primary CTA: Launch Live Guided Evening */}
          <button
            type="button"
            onClick={() => setShowLiveEvening(true)}
            className="w-full min-h-[54px] cursor-pointer inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#c4972f] via-[#e8c66c] to-[#c4972f] px-6 py-4 text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#17080d] shadow-xl shadow-[#d4af37]/20 hover:brightness-105 transition"
          >
            <Play className="h-4 w-4 fill-current" />
            Spustit Večer rozhřešení živě (Časovač & Hlas)
          </button>

          {/* Confessor Intro */}
          <blockquote className="rounded-2xl border-l-2 border-[#d4af37] bg-[#13070c]/80 p-4 sm:p-5">
            <p className="font-serif-display text-xl italic text-[#f7eae2] leading-relaxed">
              „{room.scenario.confessorIntro}“
            </p>
          </blockquote>

          {/* Matched Golden Desires & Polarity Matches */}
          {room.scenario.matchedDesires && room.scenario.matchedDesires.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-[0.22em] text-[#f2d57e] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Vaše zlaté shody & Magnetické polarity
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {room.scenario.matchedDesires.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-4 border ${
                      m.kind === 'polarity'
                        ? 'bg-gradient-to-br from-[#3c1124] to-[#24130b] border-[#f2d57e]/65 shadow-lg'
                        : 'bg-[#1a0a11]/90 border-[#d4af37]/25'
                    }`}
                  >
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${
                        m.kind === 'polarity'
                          ? 'bg-[#f2d57e] text-[#17080d]'
                          : 'bg-[#d4af37]/20 text-[#f2d57e]'
                      }`}
                    >
                      {m.matchStrength}
                    </span>
                    <h4 className="font-serif-display text-xl font-semibold text-[#fff3e4]">
                      {m.title}
                    </h4>
                    <p className="text-xs text-[#d6c2ca] mt-1 leading-relaxed">{m.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daytime Spark Message + 1-click WhatsApp send */}
          {room.scenario.daytimeSparkMessage && (
            <div className="rounded-2xl border border-[#25D366]/35 bg-[#0c1d13]/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#6ee7a0] font-semibold mb-1">
                  Předehra už odpoledne (Tichý spouštěč)
                </p>
                <p className="text-xs sm:text-sm italic text-[#e3f4ea]">
                  {room.scenario.daytimeSparkMessage}
                </p>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(room.scenario.daytimeSparkMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-[#062411] hover:brightness-105"
              >
                <MessageCircle className="h-4 w-4 fill-current" />
                Poslat na WhatsApp
              </a>
            </div>
          )}

          {/* 3-Step Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {room.scenario.steps.map((step) => (
              <div
                key={step.stepNumber}
                className="rounded-2xl border border-[#d4af37]/25 bg-[#18090f]/90 p-4 sm:p-5 space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#d4af37]">
                  <span>
                    0{step.stepNumber} • {step.phase}
                  </span>
                  <span className="text-[#c5aeb7]">{step.duration}</span>
                </div>
                <h4 className="font-serif-display text-2xl font-semibold text-[#fff1db]">
                  {step.title}
                </h4>
                <p className="text-xs sm:text-sm text-[#dfc9d2] leading-relaxed">
                  {step.instruction}
                </p>
              </div>
            ))}
          </div>

          {/* Burn Room */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleBurnRoom}
              disabled={loading}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#b8321a] to-[#9e1c38] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white border border-[#ffbe76]/40 hover:brightness-115 transition"
            >
              <Flame className="h-4 w-4" />
              Spálit párovou kabinku & Smazat z databáze
            </button>
          </div>
        </motion.div>
      )}

      {showLiveEvening && room?.scenario && (
        <LiveEveningModal
          scenario={room.scenario}
          onClose={() => setShowLiveEvening(false)}
          onFinishAndBurn={handleBurnRoom}
        />
      )}
    </div>
  );
}
