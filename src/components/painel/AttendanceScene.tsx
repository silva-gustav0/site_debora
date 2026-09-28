import type { SceneKind } from "@/lib/attendance-themes";

/** Rosto sereno em traço (base das cenas faciais). */
function Face() {
  return (
    <g className="att-line">
      <path d="M120 38c-38 0-62 32-62 78 0 44 28 84 62 84s62-40 62-84c0-46-24-78-62-78Z" />
      <path d="M62 96c10-34 34-52 58-52s50 16 60 50" opacity=".45" />
      <path d="M92 114q10 7 20 0M128 114q10 7 20 0" />
      <path d="M120 122l-5 22q5 3 10 0" opacity=".7" />
      <path d="M108 162q12 7 24 0" />
      <path d="M96 196v30M144 196v30" opacity=".5" />
    </g>
  );
}

/** Mão em traço, desenhada apontando para cima com o centro da palma em (0,0). */
function Hand({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <g className={className}>
      <g transform={flip ? "scale(-1,1)" : undefined} className="att-line att-hand">
        <path d="M-16 16c-4-10-4-22-2-34 1-5 7-5 8 0l2 14M-8-4l1-22c0-6 8-6 8 0v20M1-6l1-20c0-6 8-6 8 0l-1 22M10-2l2-14c1-6 8-5 8 1l-3 22c-2 12-8 20-20 22-8 1-14-2-18-7" />
        <path d="M-16 16l-10-10c-4-4 1-10 6-7l6 5" />
      </g>
    </g>
  );
}

function Spots({ n, cls }: { n: [number, number, number][]; cls: string }) {
  return <>{n.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} className={cls} style={{ animationDelay: `${(i * 0.37) % 3}s` }} />)}</>;
}

const CHEEK: [number, number, number][] = [[84, 134, 2.2], [92, 144, 2], [80, 150, 1.8], [96, 128, 1.6], [150, 134, 2.2], [158, 146, 2], [146, 150, 1.8], [162, 128, 1.6], [120, 88, 1.8], [108, 80, 1.5], [132, 80, 1.5]];

function FacialScene({ kind }: { kind: SceneKind }) {
  return (
    <>
      <Face />
      {kind === "limpeza" && (
        <g>
          {[88, 120, 152].map((x, i) => (
            <path key={x} d={`M${x} 236c-8-12 8-20 0-32s8-20 0-32`} className="att-line att-steam" style={{ animationDelay: `${i * 0.9}s` }} />
          ))}
          <Spots n={[[70, 60, 5], [178, 72, 4], [60, 170, 3.5], [186, 160, 5], [166, 40, 3]]} cls="att-line att-bubble" />
        </g>
      )}
      {kind === "peeling" && (
        <g clipPath="url(#att-face)">
          {[0, 1, 2].map((i) => (
            <path key={i} d="M30 0c20 40 20 80 0 120s-20 80 0 120" className="att-line att-layer" style={{ animationDelay: `${i * 1.3}s` }} />
          ))}
        </g>
      )}
      {kind === "microagulhamento" && (
        <g>
          <Spots n={CHEEK} cls="att-fill att-pulse" />
          <g className="att-pen"><path d="M0 0l30-30M26-34l10-10M22-38l12 12" className="att-line" /></g>
        </g>
      )}
      {kind === "manchas" && (
        <g>
          <Spots n={CHEEK.slice(0, 8).map(([x, y, r]) => [x, y, r * 2.4])} cls="att-fill att-fade" />
          <rect x="40" y="30" width="30" height="190" className="att-sheen" clipPath="url(#att-face)" />
        </g>
      )}
      {kind === "rejuvenescimento" && (
        <g>
          <path d="M72 150q-6 30 20 48M168 150q6 30-20 48" className="att-line att-lift" />
          {[[64, 70], [180, 64], [176, 176], [58, 184], [120, 26]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 8}v16M${x - 8} ${y}h16`} className="att-line att-twinkle" style={{ animationDelay: `${i * 0.6}s`, transformOrigin: `${x}px ${y}px` }} />
          ))}
        </g>
      )}
    </>
  );
}

/** Ilustração animada do procedimento, desenhada dentro do anel do cronômetro. */
export default function AttendanceScene({ kind }: { kind: SceneKind }) {
  const facial = kind === "limpeza" || kind === "peeling" || kind === "microagulhamento" || kind === "manchas" || kind === "rejuvenescimento";
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible" aria-hidden>
      <defs>
        <clipPath id="att-face"><path d="M120 38c-38 0-62 32-62 78 0 44 28 84 62 84s62-40 62-84c0-46-24-78-62-78Z" /></clipPath>
      </defs>
      {facial && <FacialScene kind={kind} />}

      {kind === "massagem" && (
        <g>
          <g className="att-line">
            <path d="M30 230c0-70 36-112 90-116 54 4 90 46 90 116" />
            <path d="M120 116v114" strokeDasharray="3 7" opacity=".5" />
            <path d="M84 150q14 18 28 4M156 150q-14 18-28 4" opacity=".55" />
            <circle cx="120" cy="72" r="30" opacity=".8" />
          </g>
          <g transform="translate(92 170)"><Hand className="att-knead" /></g>
          <g transform="translate(148 170)"><Hand className="att-knead att-knead-b" flip /></g>
        </g>
      )}

      {kind === "drenagem" && (
        <g>
          <g className="att-line" opacity=".85">
            <path d="M92 16c-10 70-6 140 6 214M148 16c10 70 6 140-6 214" />
            <path d="M106 120q14 8 28 0" opacity=".5" />
          </g>
          {[104, 120, 136].map((x, i) => (
            <path key={x} d={`M${x} 220C${x - 4} 150 ${x + 4} 90 ${x} 30`} className="att-flow" style={{ animationDelay: `${i * 0.5}s` }} />
          ))}
          <circle cx="120" cy="24" r="6" className="att-fill att-pulse" />
          <g className="att-glide"><Hand /></g>
        </g>
      )}

      {kind === "depilacao" && (
        <g>
          <g className="att-line">
            <path d="M88 10c-12 70-8 150 10 222M152 10c12 70 8 150-10 222" />
            <path d="M104 118q16 10 32 0" opacity=".5" />
          </g>
          <g className="att-strip"><rect x="96" y="60" width="48" height="26" rx="6" className="att-line att-strip-fill" /></g>
          {[[112, 150], [130, 166], [118, 184]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 6}v12M${x - 6} ${y}h12`} className="att-line att-twinkle" style={{ animationDelay: `${1 + i * 0.4}s`, transformOrigin: `${x}px ${y}px` }} />
          ))}
        </g>
      )}

      {kind === "pes" && (
        <g>
          <path d="M70 40v112c0 26 20 44 52 44h78c16 0 20-18 6-26-24-14-52-26-72-50-12-14-16-40-16-80" className="att-line" />
          <path d="M40 206q40-14 80 0t80 0" className="att-line att-wave" />
          <path d="M40 222q40-14 80 0t80 0" className="att-line att-wave" style={{ animationDelay: ".8s" }} opacity=".6" />
          <Spots n={[[58, 190, 4], [210, 186, 5], [190, 150, 3], [44, 150, 3.5], [226, 120, 3]]} cls="att-line att-bubble" />
          <g transform="translate(150 150)"><Hand className="att-knead" flip /></g>
        </g>
      )}
    </svg>
  );
}

const AMBIENT: Record<SceneKind, "bubble" | "petal" | "dot" | "spark" | "wave"> = {
  limpeza: "bubble", pes: "bubble", massagem: "petal", depilacao: "petal",
  microagulhamento: "dot", manchas: "spark", rejuvenescimento: "spark", drenagem: "wave", peeling: "wave",
};

// Posições fixas (sem aleatório na renderização): x%, tamanho, duração, atraso.
const PARTICLES: [number, number, number, number][] = [
  [6, 10, 17, 0], [14, 6, 21, 4], [22, 14, 19, 9], [31, 8, 23, 2], [39, 5, 18, 12], [47, 12, 25, 6], [55, 7, 20, 14],
  [63, 10, 22, 1], [71, 6, 19, 8], [79, 13, 24, 3], [87, 8, 18, 11], [94, 11, 21, 5], [18, 9, 26, 16], [68, 9, 27, 18],
];

/** Partículas que sobem devagar pelo fundo, no estilo do procedimento. */
export function AttendanceAmbient({ kind }: { kind: SceneKind }) {
  const shape = AMBIENT[kind];
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="att-breathe absolute left-1/2 top-[42%] w-[90vmin] h-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      {PARTICLES.map(([x, size, dur, delay], i) => (
        <span
          key={i}
          className={`att-particle att-p-${shape}`}
          style={{ left: `${x}%`, width: size * (shape === "wave" ? 4 : 1), height: size, animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}
        />
      ))}
    </div>
  );
}
