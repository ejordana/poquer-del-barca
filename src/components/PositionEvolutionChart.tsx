'use client';

import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';

export interface EvolutionJornada {
  matchId: string;
  /** Etiqueta curta per l'eix (ex: "23/8"). */
  label: string;
}

export interface EvolutionSeries {
  userId: string;
  nom: string;
  /** Posició (1 = primer) després de cada jornada, mateix ordre que `jornadas`. */
  ranks: number[];
}

interface PositionEvolutionChartProps {
  jornadas: EvolutionJornada[];
  series: EvolutionSeries[];
  /** Nombre total de jugadors (inclosos els que no surten al gràfic) per fixar l'eix. */
  totalPlayers: number;
}

// 12 tons distingibles: els 8 primers són la paleta categòrica validada
// (ordre fix, mai cíclic); els 4 següents s'afegeixen per cobrir totes les
// persones de la família encara que superin el conjunt validat per a totes
// les parelles CVD. Com que la identitat mai depèn només del color (la
// llegenda sempre mostra el nom), és un compromís acceptable en una app
// familiar interna.
const PLAYER_COLORS = [
  '#2a78d6', // blau
  '#eb6834', // taronja
  '#1baf7a', // aqua
  '#eda100', // groc
  '#e87ba4', // magenta
  '#008300', // verd
  '#4a3aa7', // violeta
  '#e34948', // vermell
  '#8a5a2b', // marró
  '#0e7c86', // verd blavós
  '#c2185b', // rosa fosc
  '#6b7d1f', // oliva
];

const PADDING_LEFT = 26;
const PADDING_RIGHT = 10;
const PADDING_TOP = 14;
const PADDING_BOTTOM = 26;
const STEP_X = 46;
const STEP_Y = 26;
const MARKER_R = 5;

export function PositionEvolutionChart({ jornadas, series, totalPlayers }: PositionEvolutionChartProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  // Assignem el color per una ordenació estable (alfabètica), no per la
  // posició actual: així cada persona conserva sempre el mateix color encara
  // que la classificació canviï de jornada en jornada.
  const colorByUserId = useMemo(() => {
    const sorted = [...series].sort((a, b) => a.nom.localeCompare(b.nom));
    const map: Record<string, string> = {};
    sorted.forEach((s, i) => {
      map[s.userId] = PLAYER_COLORS[i % PLAYER_COLORS.length];
    });
    return map;
  }, [series]);

  if (jornadas.length < 2 || series.length === 0) return null;

  const width = PADDING_LEFT + PADDING_RIGHT + STEP_X * (jornadas.length - 1);
  const height = PADDING_TOP + PADDING_BOTTOM + STEP_Y * (totalPlayers - 1);

  const xFor = (i: number) => PADDING_LEFT + i * STEP_X;
  const yFor = (rank: number) => PADDING_TOP + (rank - 1) * STEP_Y;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-barca-blue" />
          Evolució de posicions
        </h3>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs font-semibold text-barca-blue hover:underline"
        >
          {showTable ? 'Veure gràfic' : 'Veure taula'}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left font-bold text-slate-500 pr-2 pb-1.5 sticky left-0 bg-white">
                  Jugador
                </th>
                {jornadas.map((j) => (
                  <th key={j.matchId} className="text-center font-bold text-slate-500 px-1.5 pb-1.5 whitespace-nowrap">
                    {j.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...series]
                .sort((a, b) => a.nom.localeCompare(b.nom))
                .map((s) => (
                  <tr key={s.userId}>
                    <td className="text-left font-bold text-slate-800 pr-2 py-1.5 whitespace-nowrap sticky left-0 bg-white">
                      {s.nom}
                    </td>
                    {s.ranks.map((r, i) => (
                      <td key={i} className="text-center font-semibold text-slate-700 px-1.5 py-1.5">
                        {r}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="relative overflow-x-auto">
            <svg width={width} height={height} className="block">
              {/* Línies de graella horitzontals, una per posició possible */}
              {Array.from({ length: totalPlayers }, (_, i) => i + 1).map((rank) => (
                <line
                  key={rank}
                  x1={PADDING_LEFT}
                  y1={yFor(rank)}
                  x2={width - PADDING_RIGHT}
                  y2={yFor(rank)}
                  stroke="#e1e0d9"
                  strokeWidth={1}
                />
              ))}

              {/* Etiquetes de posició a l'eix vertical */}
              {Array.from({ length: totalPlayers }, (_, i) => i + 1).map((rank) => (
                <text
                  key={rank}
                  x={PADDING_LEFT - 6}
                  y={yFor(rank)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-slate-400"
                  fontSize={9}
                  fontWeight={700}
                >
                  {rank}
                </text>
              ))}

              {/* Etiquetes de jornada a l'eix horitzontal */}
              {jornadas.map((j, i) => (
                <text
                  key={j.matchId}
                  x={xFor(i)}
                  y={height - PADDING_BOTTOM + 16}
                  textAnchor="middle"
                  className="fill-slate-400"
                  fontSize={9}
                  fontWeight={700}
                >
                  {j.label}
                </text>
              ))}

              {/* Línies i marcadors per jugador */}
              {series.map((s) => {
                const color = colorByUserId[s.userId];
                const isDimmed = selectedUserId !== null && selectedUserId !== s.userId;
                const pathD = s.ranks
                  .map((r, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(r)}`)
                  .join(' ');
                return (
                  <g key={s.userId} opacity={isDimmed ? 0.15 : 1}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {s.ranks.map((r, i) => (
                      <circle
                        key={i}
                        cx={xFor(i)}
                        cy={yFor(r)}
                        r={MARKER_R}
                        fill={color}
                        stroke="#fcfcfb"
                        strokeWidth={2}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Llegenda: fer clic aïlla la línia d'una persona */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[...series]
              .sort((a, b) => a.nom.localeCompare(b.nom))
              .map((s) => (
                <button
                  key={s.userId}
                  type="button"
                  onClick={() => setSelectedUserId((cur) => (cur === s.userId ? null : s.userId))}
                  aria-pressed={selectedUserId === s.userId}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                    selectedUserId === s.userId
                      ? 'border-slate-300 bg-slate-100 text-slate-900'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorByUserId[s.userId] }}
                  />
                  {s.nom}
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
