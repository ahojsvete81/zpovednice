import type { MaskStyle } from '../types/confession';

interface MaskAvatarProps {
  style?: MaskStyle | null;
  symbol?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DEFAULT_STYLE: MaskStyle = {
  shape: 'venetian',
  color: '#8f1833',
  accent: '#f2d57e',
};

export function MaskAvatar({ style, symbol = '⚜', size = 'md', className = '' }: MaskAvatarProps) {
  const s = style ?? DEFAULT_STYLE;
  const dims =
    size === 'sm'
      ? 'w-11 h-7'
      : size === 'lg'
        ? 'w-44 h-28'
        : 'w-16 h-10';

  const gradId = `mg-${s.shape}-${s.color.replace('#', '')}-${size}`;

  return (
    <svg
      viewBox="0 0 160 100"
      className={`${dims} shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)] ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={s.color} stopOpacity="1" />
          <stop offset="55%" stopColor={s.color} stopOpacity="0.88" />
          <stop offset="100%" stopColor="#0e060b" stopOpacity="0.98" />
        </linearGradient>
      </defs>

      {/* Silhouette based on chosen mask shape */}
      {s.shape === 'venetian' && (
        <path
          d="M12,48 C18,22 45,18 68,30 C75,34 85,34 92,30 C115,18 142,22 148,48 C144,72 122,82 98,74 C88,71 84,65 80,65 C76,65 72,71 62,74 C38,82 16,72 12,48 Z"
          fill={`url(#${gradId})`}
          stroke={s.accent}
          strokeWidth="3"
        />
      )}

      {s.shape === 'cat' && (
        <path
          d="M18,52 L24,14 L56,31 C68,36 92,36 104,31 L136,14 L142,52 C140,74 118,82 95,74 C87,71 84,64 80,64 C76,64 73,71 65,74 C42,82 20,74 18,52 Z"
          fill={`url(#${gradId})`}
          stroke={s.accent}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}

      {s.shape === 'phantom' && (
        <path
          d="M16,46 C20,18 55,14 82,22 C110,18 140,26 144,50 C140,68 124,72 106,66 C94,62 88,68 80,82 C70,86 48,84 30,74 C18,67 14,58 16,46 Z"
          fill={`url(#${gradId})`}
          stroke={s.accent}
          strokeWidth="3"
        />
      )}

      {s.shape === 'crown' && (
        <path
          d="M16,50 L24,24 L46,34 L62,14 L80,28 L98,14 L114,34 L136,24 L144,50 C140,74 118,82 96,74 C87,70 84,65 80,65 C76,65 73,70 64,74 C42,82 20,74 16,50 Z"
          fill={`url(#${gradId})`}
          stroke={s.accent}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}

      {s.shape === 'butterfly' && (
        <path
          d="M8,36 C16,12 52,14 74,34 C78,38 82,38 86,34 C108,14 144,12 152,36 C154,54 138,62 126,62 C134,74 120,88 96,76 C88,72 84,65 80,65 C76,65 72,72 64,76 C40,88 26,74 34,62 C22,62 6,54 8,36 Z"
          fill={`url(#${gradId})`}
          stroke={s.accent}
          strokeWidth="3"
        />
      )}

      {/* Subtle inner baroque filigree curve */}
      <path
        d="M32,40 Q80,26 128,40"
        fill="none"
        stroke={s.accent}
        strokeWidth="1.2"
        strokeOpacity="0.55"
      />

      {/* Mysterious Eye Cutouts */}
      <path
        d="M33,49 C40,40 56,40 65,49 C57,57 41,57 33,49 Z"
        fill="#080407"
        stroke={s.accent}
        strokeWidth="1.8"
      />
      <path
        d="M95,49 C104,40 120,40 127,49 C119,57 103,57 95,49 Z"
        fill="#080407"
        stroke={s.accent}
        strokeWidth="1.8"
      />

      {/* Center forehead jewel + player emblem */}
      <circle
        cx="80"
        cy="39"
        r="10"
        fill="#12070c"
        stroke={s.accent}
        strokeWidth="1.6"
      />
      <text
        x="80"
        y="43"
        textAnchor="middle"
        fill={s.accent}
        fontSize="11"
        fontWeight="700"
      >
        {symbol}
      </text>
    </svg>
  );
}
