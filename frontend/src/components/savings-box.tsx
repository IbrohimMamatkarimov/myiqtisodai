// Art-directed savings box used on the sign-in story and the public about page.
// Pure SVG + CSS (see the "sbx" block in globals.css): no images, no video, no
// animation library, so it stays light on mobile. Motion is CSS only and is
// switched off under prefers-reduced-motion.

const COINS = [
  { delay: '0s', x: 210 },
  { delay: '-1.8s', x: 196 },
  { delay: '-3.6s', x: 224 },
];

export function SavingsBox({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`sbx ${className}`.trim()}
      viewBox="0 0 420 300"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sbx-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b7a52" />
          <stop offset=".55" stopColor="#235b3a" />
          <stop offset="1" stopColor="#153b27" />
        </linearGradient>
        <linearGradient id="sbx-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a9b72" />
          <stop offset="1" stopColor="#2f6b47" />
        </linearGradient>
        <linearGradient id="sbx-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dc8d" />
          <stop offset=".5" stopColor="#d9a441" />
          <stop offset="1" stopColor="#a8761f" />
        </linearGradient>
        <radialGradient id="sbx-ground" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#020a05" stopOpacity=".55" />
          <stop offset="1" stopColor="#020a05" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sbx-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#8ee3a5" stopOpacity=".5" />
          <stop offset="1" stopColor="#8ee3a5" stopOpacity="0" />
        </radialGradient>
        <clipPath id="sbx-intake">
          <rect x="0" y="0" width="420" height="119" />
        </clipPath>
      </defs>

      <ellipse className="sbx-glow" cx="210" cy="150" rx="170" ry="120" fill="url(#sbx-glow)" />
      <ellipse cx="210" cy="262" rx="152" ry="17" fill="url(#sbx-ground)" />

      {/* sprout */}
      <g className="sbx-sprout">
        <path d="M326 108c-2-16 2-30 11-42" stroke="#7fc895" strokeWidth="3" strokeLinecap="round" />
        <path d="M337 66c1-14 11-22 25-22-1 14-10 22-25 22Z" fill="#6bb784" />
        <path d="M330 86c-9-3-15-11-15-21 11 0 18 7 15 21Z" fill="#4f9d6b" />
      </g>

      {/* body */}
      <rect x="112" y="128" width="196" height="124" rx="26" fill="url(#sbx-body)" />
      <rect x="113" y="129" width="194" height="122" rx="25" stroke="#8fd1a3" strokeOpacity=".22" />
      <path d="M126 160c0-8 6-14 14-14h20" stroke="#fff" strokeOpacity=".14" strokeWidth="3" strokeLinecap="round" />

      {/* lid + slot */}
      <rect x="102" y="102" width="216" height="44" rx="22" fill="url(#sbx-lid)" />
      <rect x="103" y="103" width="214" height="42" rx="21" stroke="#c9efd4" strokeOpacity=".28" />
      <rect className="sbx-slot" x="164" y="114" width="92" height="14" rx="7" fill="#0a1d12" />
      <rect x="160" y="110" width="100" height="22" rx="11" stroke="url(#sbx-brass)" strokeWidth="3" />

      {/* plate with progress ring */}
      <circle cx="210" cy="196" r="38" fill="#0f2c1c" fillOpacity=".55" />
      <circle cx="210" cy="196" r="30" stroke="#8fd1a3" strokeOpacity=".22" strokeWidth="5" />
      <circle
        className="sbx-ring"
        cx="210"
        cy="196"
        r="30"
        stroke="url(#sbx-brass)"
        strokeWidth="5"
        strokeLinecap="round"
        transform="rotate(-90 210 196)"
      />
      <text x="210" y="201" textAnchor="middle" fontSize="15" fontWeight="800" fill="#f4f1df" fontFamily="inherit">
        65%
      </text>

      {/* rivets */}
      {[[132, 146], [288, 146], [132, 232], [288, 232]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" fill="url(#sbx-brass)" />
      ))}

      {/* coins falling into the slot */}
      <g clipPath="url(#sbx-intake)">
        {COINS.map((coin) => (
          <g key={coin.delay} className="sbx-coin" style={{ animationDelay: coin.delay }}>
            <circle cx={coin.x} cy="104" r="14" fill="url(#sbx-brass)" />
            <circle cx={coin.x} cy="104" r="9.5" stroke="#fff2bd" strokeOpacity=".85" strokeWidth="1.4" />
            <path d={`M${coin.x} 99v10M${coin.x - 3} 101.5h5.5M${coin.x - 3} 106.5h5.5`} stroke="#fff6d4" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        ))}
      </g>

      {/* sparkles + plus */}
      <path className="sbx-spark" d="M92 84v14M85 91h14" stroke="#b9ecc7" strokeWidth="2" strokeLinecap="round" />
      <path className="sbx-spark sbx-spark--b" d="M356 150v10M351 155h10" stroke="#f2d37a" strokeWidth="2" strokeLinecap="round" />
      <path className="sbx-spark sbx-spark--c" d="M70 182v8M66 186h8" stroke="#b9ecc7" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
