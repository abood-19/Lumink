import Link from "next/link";

/* LUMINK identity: a high-contrast serif wordmark whose "I" is a tattoo needle dropping one bead of ink. Paths are outlined so it renders identically everywhere. */
const WORD = "M2.25 0.0V-1.9500000000000002H11.3V-73.05H2.25V-75.0H35.800000000000004V-73.05H26.85V-1.9500000000000002H36.65Q42.150000000000006 -1.9500000000000002 46.050000000000004 -3.3750000000000004Q49.95 -4.800000000000001 52.525000000000006 -7.4750000000000005Q55.1 -10.15 56.525000000000006 -13.95Q57.95 -17.75 58.5 -22.5H60.5V0.0ZM138.7 -75.0V-73.05H129.3V-23.0Q129.3 -10.65 123.4 -4.6Q117.5 1.4500000000000002 105.30000000000001 1.4500000000000002Q91.2 1.4500000000000002 84.725 -4.300000000000001Q78.25 -10.05 78.25 -23.0V-73.05H69.25V-75.0H103.80000000000001V-73.05H93.80000000000001V-24.0Q93.80000000000001 -19.05 94.4 -14.9Q95.0 -10.75 96.65 -7.7Q98.30000000000001 -4.65 101.32500000000002 -2.975Q104.35000000000001 -1.3 109.15 -1.3Q114.60000000000001 -1.3 118.70000000000002 -3.45Q122.80000000000001 -5.6000000000000005 125.07500000000002 -10.350000000000001Q127.35000000000001 -15.100000000000001 127.35000000000001 -23.0V-73.05H118.30000000000001V-75.0ZM183.9 1.0 157.1 -72.25V-1.9500000000000002H164.5V0.0H147.95000000000002V-1.9500000000000002H155.05V-73.05H147.4V-75.0H171.70000000000002L191.70000000000002 -21.150000000000002L210.3 -75.0H234.4V-73.05H227.35000000000002V-1.9500000000000002H234.4V0.0H203.85000000000002V-1.9500000000000002H211.85000000000002V-73.4L186.20000000000002 1.0ZM363.65000000000003 -75.0V-73.05H353.15000000000003V1.0H350.40000000000003L302.20000000000005 -72.85000000000001V-1.9500000000000002H313.8V0.0H289.90000000000003V-1.9500000000000002H300.15000000000003V-73.05H289.90000000000003V-75.0H319.3L351.1 -25.6V-73.05H339.85V-75.0ZM372.15000000000003 0.0V-1.9500000000000002H381.20000000000005V-73.05H372.15000000000003V-75.0H406.70000000000005V-73.05H396.75000000000006V-35.550000000000004L428.80000000000007 -73.05H418.20000000000005V-75.0H442.20000000000005V-73.05H431.6L410.35 -48.2L437.75000000000006 -1.9500000000000002H446.70000000000005V0.0H410.70000000000005V-1.9500000000000002H419.80000000000007L400.25000000000006 -36.35L396.75000000000006 -32.300000000000004V-1.9500000000000002H405.70000000000005V0.0Z";
const NEEDLE = "M245.1 -75H279.1V-72.6C273.1 -72.4 270.3 -71 270.3 -66V-14L262.1 14L253.9 -14V-66C253.9 -71 251.1 -72.4 245.1 -72.6Z";
const DROP = "M262.1 19C265.5 24 267.7 27.4 267.7 30.2A5.6 5.6 0 0 1 256.5 30.2C256.5 27.4 258.7 24 262.1 19Z";
const L = "M2.25 0.0V-1.9500000000000002H11.3V-73.05H2.25V-75.0H35.800000000000004V-73.05H26.85V-1.9500000000000002H36.65Q42.150000000000006 -1.9500000000000002 46.050000000000004 -3.3750000000000004Q49.95 -4.800000000000001 52.525000000000006 -7.4750000000000005Q55.1 -10.15 56.525000000000006 -13.95Q57.95 -17.75 58.5 -22.5H60.5V0.0Z";
const VB = "-4 -80 460 116";

/** The wordmark. `height` is the rendered height in px. */
export function Wordmark({ height = 22, dark = false, accent, className }: { height?: number; dark?: boolean; accent?: string; className?: string }) {
  const fg = dark ? "#0a0b09" : "#f3f3f5";
  const fluid = !height;
  return (
    <svg role="img" aria-label="LUMINK" height={fluid ? undefined : height} viewBox={VB} className={className} style={fluid ? { display: "block" } : { width: "auto", display: "block" }}>
      <path d={WORD} fill={fg} />
      <path d={NEEDLE} fill={fg} />
      <path d={DROP} fill={accent ?? (dark ? "#0a0b09" : "#c4f135")} />
    </svg>
  );
}

/** App icon / favicon mark: the serif L with its drop of ink. */
export function LogoMark({ size = 36, tile = "#0a0b09" }: { size?: number; tile?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill={tile} />
      <path transform="translate(11.44 54.00) scale(0.56)" d={L} fill="#f3f3f5" />
      <path d="M51.72 45.00c2.6 3.6 4.2 6 4.2 7.8a4.2 4.2 0 0 1-8.4 0c0-1.8 1.6-4.2 4.2-7.8Z" fill="#c4f135" />
    </svg>
  );
}

export function Logo({ href = "/", dark = false }: { href?: string; dark?: boolean; size?: number }) {
  return (
    <Link href={href} aria-label="LUMINK" className="flex items-center no-underline" dir="ltr">
      <Wordmark height={30} dark={dark} />
    </Link>
  );
}

/**
 * Footer artwork: a black tattoo machine hovering over the wordmark, its needle dripping ink
 * straight onto the needle-"I". Pure SVG, no image file.
 */
export function InkMachineMark({ className }: { className?: string }) {
  const ink = "#0a0b09";
  // the machine is drawn pointing straight down with its needle tip at (0,0), then tilted into place
  const ridges = Array.from({ length: 13 }, (_, i) => -106 - i * 6.6);
  return (
    <svg role="img" aria-label="LUMINK" viewBox="-4 -430 470 466" className={className} style={{ display: "block", overflow: "visible" }}>
      <g transform="translate(262.1 -122) rotate(32)">
        {/* power cable */}
        <path d="M0 -352 C 6 -400, 40 -430, 120 -440 S 260 -470, 330 -520" fill="none" stroke={ink} strokeWidth="7" strokeLinecap="round" />
        {/* needle */}
        <path d="M-1.6 -30 L1.6 -30 L0.6 -2 L0 1 L-0.6 -2 Z" fill={ink} />
        {/* cartridge: cone + barrel with grip rings */}
        <path d="M-3.5 -28 L3.5 -28 L12 -62 L-12 -62 Z" fill="#1d1f1c" />
        <rect x="-13" y="-104" width="26" height="42" rx="2" fill="#262824" />
        {[-70, -78, -86, -94].map((y) => <rect key={y} x="-13" y={y} width="26" height="2.2" fill="#3a3d37" />)}
        {/* knurled grip */}
        <rect x="-18" y="-196" width="36" height="94" rx="6" fill={ink} />
        {ridges.map((y) => <rect key={y} x="-17" y={y} width="34" height="2.4" rx="1.2" fill="#2c2e2a" />)}
        {/* collar */}
        <rect x="-21" y="-206" width="42" height="12" rx="3" fill="#20221f" />
        <rect x="-21" y="-203" width="42" height="2" fill="#4a4d46" />
        {/* motor body with a long metal highlight */}
        <rect x="-21" y="-342" width="42" height="138" rx="8" fill={ink} />
        <rect x="-12" y="-334" width="5" height="122" rx="2.5" fill="#3b3e38" opacity=".9" />
        <rect x="9" y="-334" width="2" height="122" rx="1" fill="#2a2c28" />
        {/* stroke-adjust dial and end cap */}
        <rect x="-21" y="-290" width="42" height="7" fill="#1b1d1a" />
        <path d="M-21 -342 Q-21 -360 0 -362 Q21 -360 21 -342 Z" fill="#141513" />
        <rect x="-7" y="-372" width="14" height="12" rx="3" fill="#2a2c28" />
      </g>
      {/* ink: a bead on the needle tip and drops falling onto the "I" */}
      <g fill={ink}>
        <path className="lx-drip-bead" d="M262.1 -120 C264.4 -116.6 265.6 -114.4 265.6 -112.6 A3.5 3.5 0 0 1 258.6 -112.6 C258.6 -114.4 259.8 -116.6 262.1 -120 Z" />
        <path className="lx-drip" d="M262.1 -116 C265 -111.6 266.6 -108.8 266.6 -106.4 A4.5 4.5 0 0 1 257.6 -106.4 C257.6 -108.8 259.2 -111.6 262.1 -116 Z" />
        <circle cx="249" cy="-84" r="2.2" /><circle cx="277" cy="-88" r="1.6" /><circle cx="241" cy="-92" r="1.1" /><circle cx="284" cy="-80" r="1.2" />
      </g>
      {/* the wordmark itself */}
      <path d={WORD} fill={ink} />
      <path d={NEEDLE} fill={ink} />
      <path d={DROP} fill={ink} />
    </svg>
  );
}
