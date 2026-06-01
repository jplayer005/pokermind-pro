// ============================================================
// POKERMIND PRO — CALCULADORAS
// Pot Odds, MDF, ICM, EV, SPR, Fold Equity e mais
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, ChevronDown, ChevronUp, Info, Play, RefreshCw } from 'lucide-react'
import { Card, Badge, Button, SectionHeader, Divider } from '@/components/ui'
import {
  potOdds, minimumDefenseFrequency, spr, foldEquityNeeded,
  calculateCallEV, calculateRaiseEV, outsToEquity, calculateICM,
  runMonteCarloEquity, countRemainingCombos, totalCombosForHand,
  generateRandomCards, RANKS, SUITS,
} from '@/lib/poker'
import type { Card as CardType, Rank, Suit } from '@/types'
import { formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ---- Tipos de calculadora ----
type CalcType = 'potodds' | 'ev' | 'mdf' | 'spr' | 'icm' | 'outs' | 'foldequity' | 'equity' | 'combos' | 'rake' | 'icmdrill'

interface CalcConfig {
  id: CalcType
  label: string
  icon: string
  description: string
  isPremium?: boolean
}

// Ordem: das mais essenciais (decisão em toda mão) para as mais situacionais.
//   1-5: ferramentas core — uso diário em qualquer mão (pot odds, outs, MDF, EV, SPR)
//   6-8: úteis em spots específicos (equity Monte Carlo, fold equity, combos)
//   9-10: ICM (só torneios)
//   11:   rake (raro consultar em mesa)
const CALCULATORS: CalcConfig[] = [
  { id: 'potodds',   label: 'Pot Odds',    icon: '📐', description: 'Calcule se uma call é matematicamente correta' },
  { id: 'outs',      label: 'Outs',        icon: '🎲', description: 'Converta outs em equity (regra 4 e 2)' },
  { id: 'mdf',       label: 'MDF',         icon: '🛡', description: 'Frequência mínima de defesa contra bets' },
  { id: 'ev',        label: 'EV',          icon: '⚖️', description: 'Compare EV entre fold, call e raise' },
  { id: 'spr',       label: 'SPR',         icon: '📊', description: 'Stack-to-Pot Ratio e comprometimento' },
  { id: 'equity',    label: 'Equity MC',   icon: '🔬', description: 'Equity real via simulação Monte Carlo' },
  { id: 'foldequity',label: 'Fold Equity', icon: '🎯', description: 'Fold equity mínima para bluffs' },
  { id: 'combos',    label: 'Combinações', icon: '🧮', description: 'Treino de contagem de combos e blockers' },
  { id: 'icmdrill',  label: 'ICM Drill',   icon: '🏆', description: 'Decisões situacionais com ICM em torneios' },
  { id: 'icm',       label: 'ICM Calc',    icon: '🥇', description: 'Calculadora ICM para distribuição de chips' },
  { id: 'rake',      label: 'Rake',        icon: '💸', description: 'Impacto do rake no EV e nas mãos marginais' },
]

// ------- CALCULADORA POT ODDS -------
function PotOddsCalc() {
  const [pot, setPot] = useState(100)
  const [call, setCall] = useState(50)

  const po = potOdds(call, pot)
  const breakeven = po * 100
  const isCall = (equity: number) => equity > po
  const exampleEquity = 0.35

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-text-muted font-body block mb-1.5 uppercase tracking-wider">Pot (BB)</label>
          <input type="number" value={pot} onChange={e => setPot(Number(e.target.value))}
            className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none transition-colors" />
        </div>
        <div>
          <label className="text-[11px] text-text-muted font-body block mb-1.5 uppercase tracking-wider">Call (BB)</label>
          <input type="number" value={call} onChange={e => setCall(Number(e.target.value))}
            className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none transition-colors" />
        </div>
      </div>

      <div className="bg-bg-base rounded-xl p-4 border border-border-subtle space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-muted">Pot Odds oferecidas</span>
          <span className="font-mono font-bold text-accent-gold text-lg">{formatPercent(po)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-muted">Equity de breakeven</span>
          <span className="font-mono font-bold text-text-primary">{formatPercent(po)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-muted">Tamanho do bet (% pot)</span>
          <span className="font-mono font-bold text-accent-blue">{Math.round((call / pot) * 100)}%</span>
        </div>
        <Divider />
        <div className="space-y-2">
          {[0.25, 0.33, 0.40, 0.50].map(eq => (
            <div key={eq} className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Equity {formatPercent(eq)}</span>
              <Badge variant={isCall(eq) ? 'emerald' : 'crimson'}>
                {isCall(eq) ? 'CALL ✓' : 'FOLD ✗'}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <Info size={13} className="text-accent-blue mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-text-secondary font-body leading-relaxed">
            Com pot de <strong className="text-text-primary">{pot}BB</strong> e call de <strong className="text-text-primary">{call}BB</strong>, você precisa de pelo menos <strong className="text-accent-gold">{formatPercent(po)}</strong> de equity para fazer a call ser lucrativa em longo prazo.
          </p>
        </div>
      </div>
    </div>
  )
}

// ------- CALCULADORA EV -------
function EVCalc() {
  const [pot, setPot] = useState(100)
  const [callAmt, setCallAmt] = useState(50)
  const [equity, setEquity] = useState(0.35)
  const [foldEq, setFoldEq] = useState(0.40)

  const callEV = calculateCallEV({ potSize: pot, callAmount: callAmt, equity })
  const raiseEV = calculateRaiseEV({ potSize: pot, callAmount: callAmt, equity, foldEquity: foldEq })
  const foldEV = 0

  const best = callEV > raiseEV ? (callEV > foldEV ? 'call' : 'fold') : (raiseEV > foldEV ? 'raise' : 'fold')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Pot (BB)', val: pot, set: setPot },
          { label: 'Call Size', val: callAmt, set: setCallAmt },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="text-[11px] text-text-muted block mb-1.5 uppercase tracking-wider">{label}</label>
            <input type="number" value={val} onChange={e => set(Number(e.target.value))}
              className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none" />
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Equity</label>
          <span className="font-mono text-accent-gold font-bold">{formatPercent(equity)}</span>
        </div>
        <input type="range" min={0.01} max={0.99} step={0.01} value={equity}
          onChange={e => setEquity(Number(e.target.value))}
          className="w-full accent-yellow-400" />
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Fold Equity</label>
          <span className="font-mono text-accent-blue font-bold">{formatPercent(foldEq)}</span>
        </div>
        <input type="range" min={0} max={0.99} step={0.01} value={foldEq}
          onChange={e => setFoldEq(Number(e.target.value))}
          className="w-full accent-blue-400" />
      </div>

      {/* Resultados */}
      <div className="space-y-2">
        {[
          { action: 'fold', ev: foldEV, label: 'Fold', color: 'text-text-muted' },
          { action: 'call', ev: callEV, label: 'Call', color: callEV > 0 ? 'text-accent-emerald' : 'text-accent-crimson' },
          { action: 'raise', ev: raiseEV, label: 'Raise/Bet', color: raiseEV > 0 ? 'text-accent-gold' : 'text-accent-crimson' },
        ].map(({ action, ev, label, color }) => (
          <div key={action} className={cn(
            'flex items-center justify-between p-3 rounded-xl border transition-all',
            best === action ? 'border-accent-gold/30 bg-accent-gold/5' : 'border-border-subtle bg-bg-base'
          )}>
            <div className="flex items-center gap-2">
              {best === action && <span className="text-accent-gold text-xs">★</span>}
              <span className="text-xs font-body text-text-primary">{label}</span>
              {best === action && <Badge variant="gold" size="sm">Melhor</Badge>}
            </div>
            <span className={cn('font-mono font-bold text-sm', color)}>
              {ev > 0 ? '+' : ''}{ev.toFixed(2)} BB
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ------- CALCULADORA MDF -------
function MDFCalc() {
  const [pot, setPot] = useState(100)
  const [bet, setBet] = useState(50)

  const mdf = minimumDefenseFrequency(bet, pot)
  const betPct = (bet / pot) * 100

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-text-muted block mb-1.5 uppercase tracking-wider">Pot (BB)</label>
          <input type="number" value={pot} onChange={e => setPot(Number(e.target.value))}
            className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none" />
        </div>
        <div>
          <label className="text-[11px] text-text-muted block mb-1.5 uppercase tracking-wider">Bet Size</label>
          <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))}
            className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none" />
        </div>
      </div>

      <div className="bg-bg-base rounded-xl p-5 border border-border-subtle text-center">
        <div className="text-[11px] text-text-muted mb-2">Você precisa defender ao menos</div>
        <div className="text-4xl font-mono font-bold text-accent-gold mb-1">{formatPercent(mdf)}</div>
        <div className="text-[11px] text-text-muted">da sua range total</div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Bet %', val: `${betPct.toFixed(0)}%`, color: 'text-accent-blue' },
          { label: 'Fold max', val: formatPercent(1 - mdf), color: 'text-accent-crimson' },
          { label: 'Defender', val: formatPercent(mdf), color: 'text-accent-emerald' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-bg-base rounded-lg p-2.5 border border-border-subtle">
            <div className="text-[10px] text-text-muted mb-1">{label}</div>
            <div className={cn('font-mono font-bold text-sm', color)}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ------- CALCULADORA OUTS -------
function OutsCalc() {
  const [outs, setOuts] = useState(9)
  const [street, setStreet] = useState<'flop' | 'turn'>('flop')

  const equity = outsToEquity(outs, street)

  const outExamples = [
    { name: 'Flush Draw', outs: 9, icon: '♥♣' },
    { name: 'Open-Ended SD', outs: 8, icon: '→←' },
    { name: 'Gutshot SD', outs: 4, icon: '→' },
    { name: 'Pair → Set', outs: 2, icon: '🎰' },
    { name: 'Two Overs', outs: 6, icon: '⬆⬆' },
    { name: 'Flush + OESD', outs: 15, icon: '🔥' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Número de Outs</label>
          <span className="font-mono font-bold text-accent-gold text-lg">{outs}</span>
        </div>
        <input type="range" min={1} max={21} value={outs}
          onChange={e => setOuts(Number(e.target.value))}
          className="w-full accent-yellow-400" />
      </div>

      <div className="flex gap-2">
        {(['flop', 'turn'] as const).map(s => (
          <button key={s} onClick={() => setStreet(s)}
            className={cn('flex-1 py-2.5 rounded-lg text-xs font-mono font-bold border capitalize transition-all',
              street === s ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold' : 'bg-bg-base border-border-subtle text-text-muted'
            )}>
            {s} ({s === 'flop' ? '×4' : '×2'})
          </button>
        ))}
      </div>

      <div className="bg-bg-base rounded-xl p-5 border border-border-subtle text-center">
        <div className="text-[11px] text-text-muted mb-2">{outs} outs no {street} ≈</div>
        <div className="text-4xl font-mono font-bold text-accent-emerald mb-1">{formatPercent(equity)}</div>
        <div className="text-[11px] text-text-muted">de equity</div>
      </div>

      <div>
        <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Referências Rápidas</div>
        <div className="grid grid-cols-2 gap-2">
          {outExamples.map(ex => (
            <button key={ex.name} onClick={() => setOuts(ex.outs)}
              className={cn('flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all',
                outs === ex.outs ? 'border-accent-gold/30 bg-accent-gold/5' : 'border-border-subtle bg-bg-base'
              )}>
              <span className="text-sm">{ex.icon}</span>
              <div>
                <div className="text-[10px] font-body text-text-primary">{ex.name}</div>
                <div className="text-[10px] font-mono text-accent-emerald">{ex.outs} outs</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ------- CALCULADORA FOLD EQUITY -------
function FoldEquityCalc() {
  const [pot, setPot] = useState(100)
  const [bet, setBet] = useState(66)
  const [equity, setEquity] = useState(0.30)

  const feNeeded = foldEquityNeeded(bet, pot, equity)
  const feNeededPct = Math.max(0, Math.min(1, feNeeded)) * 100
  const betPct = Math.round((bet / pot) * 100)
  const isProfitable = feNeeded < 1

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-text-muted block mb-1.5 uppercase tracking-wider">Pot (BB)</label>
          <input type="number" value={pot} onChange={e => setPot(Number(e.target.value))}
            className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none" />
        </div>
        <div>
          <label className="text-[11px] text-text-muted block mb-1.5 uppercase tracking-wider">Bet Size</label>
          <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))}
            className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none" />
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <label className="text-[11px] text-text-muted uppercase tracking-wider">Equity do Bluff</label>
          <span className="font-mono text-accent-blue font-bold">{formatPercent(equity)}</span>
        </div>
        <input type="range" min={0} max={0.60} step={0.01} value={equity}
          onChange={e => setEquity(Number(e.target.value))}
          className="w-full accent-blue-400" />
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>0% (puro bluff)</span><span>60% (semi-bluff forte)</span>
        </div>
      </div>

      <div className={cn(
        'rounded-xl p-5 border text-center',
        isProfitable
          ? 'bg-accent-emerald/5 border-accent-emerald/20'
          : 'bg-accent-crimson/5 border-accent-crimson/20'
      )}>
        <div className="text-[11px] text-text-muted mb-2">Fold Equity Mínima Necessária</div>
        <div className={cn('text-4xl font-mono font-bold mb-1',
          feNeededPct <= 40 ? 'text-accent-emerald' : feNeededPct <= 60 ? 'text-accent-gold' : 'text-accent-crimson'
        )}>
          {isProfitable ? `${feNeededPct.toFixed(1)}%` : 'Impossível'}
        </div>
        <div className="text-[11px] text-text-muted">
          {isProfitable
            ? `Villain precisa foldar mais de ${feNeededPct.toFixed(0)}% para lucrar`
            : 'Equity muito baixa — bluff nunca será lucrativo aqui'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Bet %', val: `${betPct}%`, color: 'text-accent-blue' },
          { label: 'Risk', val: `${bet} BB`, color: 'text-accent-crimson' },
          { label: 'Reward', val: `${pot} BB`, color: 'text-accent-emerald' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-bg-base rounded-lg p-2.5 border border-border-subtle">
            <div className="text-[10px] text-text-muted mb-1">{label}</div>
            <div className={cn('font-mono font-bold text-sm', color)}>{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <Info size={13} className="text-accent-blue mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-text-secondary font-body leading-relaxed">
            Com um bet de <strong className="text-text-primary">{betPct}%</strong> do pot e <strong className="text-text-primary">{formatPercent(equity)}</strong> de equity,
            você precisa que o villain folde ao menos <strong className="text-accent-gold">{isProfitable ? `${feNeededPct.toFixed(1)}%` : '—'}</strong> para o bluff ser lucrativo.
          </p>
        </div>
      </div>
    </div>
  )
}

// ------- CALCULADORA SPR -------
function SPRCalc() {
  const [stack, setStack] = useState(95)
  const [pot, setPot] = useState(10)

  const sprVal = spr(stack, pot)

  const interpretation =
    sprVal < 2 ? { text: 'SPR muito baixo — fácil commitar com top pair', color: 'text-accent-crimson' }
    : sprVal < 5 ? { text: 'SPR baixo — boas mãos top pair e above merecem comprometer', color: 'text-yellow-400' }
    : sprVal < 10 ? { text: 'SPR médio — precisa de mãos fortes (two pair+) para commitar', color: 'text-accent-gold' }
    : { text: 'SPR alto — necessita de nutted hands para all-in', color: 'text-accent-emerald' }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-text-muted block mb-1.5 uppercase tracking-wider">Stack Efetivo</label>
          <input type="number" value={stack} onChange={e => setStack(Number(e.target.value))}
            className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none" />
        </div>
        <div>
          <label className="text-[11px] text-text-muted block mb-1.5 uppercase tracking-wider">Pot Size</label>
          <input type="number" value={pot} onChange={e => setPot(Number(e.target.value))}
            className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none" />
        </div>
      </div>

      <div className="bg-bg-base rounded-xl p-5 border border-border-subtle text-center">
        <div className="text-[11px] text-text-muted mb-2">SPR</div>
        <div className={cn('text-4xl font-mono font-bold mb-2', interpretation.color)}>{sprVal.toFixed(1)}</div>
        <div className="text-[11px] text-text-secondary leading-relaxed px-2">{interpretation.text}</div>
      </div>

      {/* Tabela de referência */}
      <div className="space-y-1.5">
        {[
          { range: '< 2', desc: 'Top pair é nuts — commita facilmente', color: 'text-accent-crimson' },
          { range: '2–4', desc: 'Two pair+ para comprometer tudo', color: 'text-yellow-400' },
          { range: '5–9', desc: 'Sets e acima — jogue com cuidado', color: 'text-accent-gold' },
          { range: '10+', desc: 'Flushes, straights e melhor', color: 'text-accent-emerald' },
        ].map(({ range, desc, color }) => (
          <div key={range} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-bg-base border border-border-subtle">
            <span className={cn('font-mono font-bold text-xs w-10 flex-shrink-0', color)}>{range}</span>
            <span className="text-[11px] text-text-secondary">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ------- EQUITY MONTE CARLO -------
function EquityCalc() {
  const [h1rank, setH1rank] = useState<Rank>('A')
  const [h1suit, setH1suit] = useState<Suit>('spades')
  const [h2rank, setH2rank] = useState<Rank>('K')
  const [h2suit, setH2suit] = useState<Suit>('hearts')
  const [rangeStr, setRangeStr] = useState('TT,JJ,QQ,KK,AA,AKs,AKo')
  const [iterations, setIterations] = useState(2000)
  const [result, setResult] = useState<ReturnType<typeof runMonteCarloEquity> | null>(null)
  const [running, setRunning] = useState(false)

  const heroCards: [CardType, CardType] = [
    { rank: h1rank, suit: h1suit },
    { rank: h2rank, suit: h2suit },
  ]

  const runCalc = () => {
    if (h1rank === h2rank && h1suit === h2suit) return
    const range = rangeStr.split(',').map(s => s.trim()).filter(Boolean)
    setRunning(true)
    setTimeout(() => {
      const res = runMonteCarloEquity(heroCards, range, iterations)
      setResult(res)
      setRunning(false)
    }, 30)
  }

  const suitSymbols: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
  const suitColors: Record<Suit, string> = { spades: 'text-text-secondary', hearts: 'text-red-400', diamonds: 'text-red-400', clubs: 'text-text-secondary' }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-text-muted">Insira sua mão e o range do villain para calcular equity real via simulação.</p>

      {/* Hero cards */}
      <div>
        <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Sua Mão</div>
        <div className="grid grid-cols-2 gap-2">
          {([0, 1] as const).map(idx => {
            const rank = idx === 0 ? h1rank : h2rank
            const suit = idx === 0 ? h1suit : h2suit
            const setRank = idx === 0 ? setH1rank : setH2rank
            const setSuit = idx === 0 ? setH1suit : setH2suit
            return (
              <div key={idx} className="bg-bg-base border border-border-default rounded-xl p-2 space-y-1.5">
                <div className="text-[10px] text-text-muted">Carta {idx + 1}</div>
                <select value={rank} onChange={e => setRank(e.target.value as Rank)}
                  className="w-full bg-bg-elevated border border-border-subtle rounded-lg px-2 py-1.5 text-sm font-mono text-text-primary focus:outline-none">
                  {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="grid grid-cols-4 gap-1">
                  {SUITS.map(s => (
                    <button key={s} onClick={() => setSuit(s)}
                      className={cn('py-1.5 rounded-lg text-sm font-bold border transition-all',
                        suit === s ? 'border-accent-gold/40 bg-accent-gold/10' : 'border-border-subtle bg-bg-elevated',
                        suitColors[s]
                      )}>
                      {suitSymbols[s]}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="text-center mt-2 font-mono font-bold text-accent-gold">
          {h1rank}<span className={suitColors[h1suit]}>{suitSymbols[h1suit]}</span>
          {' '}{h2rank}<span className={suitColors[h2suit]}>{suitSymbols[h2suit]}</span>
        </div>
      </div>

      {/* Villain range */}
      <div>
        <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5">Range do Villain</div>
        <input value={rangeStr} onChange={e => setRangeStr(e.target.value)}
          placeholder="ex: TT+,AKs,AKo,QQ"
          className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none" />
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {['TT+,AKs,AKo', 'JJ+,AKs', 'QQ+', 'TT+,AQs+,AKo', 'Any two'].map(preset => (
            <button key={preset} onClick={() => setRangeStr(preset === 'Any two' ? 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,AKo,AQo,KQs,QJs,JTs,T9s' : preset)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-border-subtle text-text-muted hover:text-accent-gold hover:border-accent-gold/30 transition-all">
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Iterations */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-text-muted uppercase tracking-wider">Iterações</span>
          <span className="font-mono text-accent-gold text-xs font-bold">{iterations.toLocaleString()}</span>
        </div>
        <input type="range" min={500} max={10000} step={500} value={iterations}
          onChange={e => setIterations(Number(e.target.value))}
          className="w-full accent-yellow-400" />
        <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
          <span>500 (rápido)</span><span>10.000 (preciso)</span>
        </div>
      </div>

      <Button variant="gold" size="lg" onClick={runCalc} disabled={running} className="w-full">
        {running ? <><RefreshCw size={14} className="animate-spin" /> Calculando...</> : <><Play size={14} /> Calcular Equity</>}
      </Button>

      {result && !running && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="bg-bg-base rounded-xl p-4 border border-border-subtle text-center">
            <div className="text-[11px] text-text-muted mb-1">Equity do Herói</div>
            <div className={cn('text-4xl font-mono font-bold', result.equity >= 0.5 ? 'text-accent-emerald' : 'text-accent-crimson')}>
              {formatPercent(result.equity)}
            </div>
            <div className="text-[10px] text-text-muted mt-1">{result.totalRuns.toLocaleString()} iterações</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Vitórias', val: `${result.heroWinPct}%`, color: 'text-accent-emerald' },
              { label: 'Empates', val: `${result.tiePct}%`, color: 'text-text-muted' },
              { label: 'Derrotas', val: `${result.lossPct}%`, color: 'text-accent-crimson' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-bg-base rounded-lg p-2.5 border border-border-subtle">
                <div className="text-[10px] text-text-muted mb-1">{label}</div>
                <div className={cn('font-mono font-bold text-sm', color)}>{val}</div>
              </div>
            ))}
          </div>
          <div className="h-2 bg-bg-overlay rounded-full overflow-hidden">
            <div className="h-full bg-accent-emerald rounded-full transition-all" style={{ width: `${result.equity * 100}%` }} />
          </div>
          <p className="text-[10px] text-text-muted text-center">
            ±{Math.round(100 / Math.sqrt(result.totalRuns))}% margem de erro estimada
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ------- COMBINATORICS TRAINER -------
type ComboQuestion = {
  heroCards: CardType[]
  targetHand: string
  correctCombos: number
  totalCombos: number
  options: number[]
  explanation: string
}

function generateComboQuestion(): ComboQuestion {
  const HAND_POOL = ['AA','KK','QQ','JJ','TT','AKs','AKo','AQs','AQo','KQs','KQo']
  const targetHand = HAND_POOL[Math.floor(Math.random() * HAND_POOL.length)]
  const total = totalCombosForHand(targetHand)

  // Gerar 1-2 cartas heroicas aleatórias
  const numHero = Math.random() < 0.5 ? 1 : 2
  const heroCards = generateRandomCards(numHero)
  const remaining = countRemainingCombos(targetHand, heroCards)

  // Gerar opções (com uma correta e 3 plausíveis erradas)
  const optionsSet = new Set([remaining])
  const candidates = [0, 1, 2, 3, 4, 6, 8, 9, 12, 16]
  while (optionsSet.size < 4) {
    const c = candidates[Math.floor(Math.random() * candidates.length)]
    if (c !== remaining && c <= total) optionsSet.add(c)
  }
  const options = [...optionsSet].sort((a, b) => a - b)

  const removedCombos = total - remaining
  const explanation = removedCombos === 0
    ? `Você não segura nenhuma carta de ${targetHand}, então todos os ${total} combos são possíveis para o villain.`
    : `Você segura ${heroCards.map(c => `${c.rank}${['♠','♥','♦','♣'][['spades','hearts','diamonds','clubs'].indexOf(c.suit)]}`).join(' + ')}, que bloqueia ${removedCombos} combo(s) de ${targetHand}. Restam ${remaining} de ${total}.`

  return { heroCards, targetHand, correctCombos: remaining, totalCombos: total, options, explanation }
}

function CombinatoricsTrainer() {
  const [question, setQuestion] = useState<ComboQuestion>(() => generateComboQuestion())
  const [selected, setSelected] = useState<number | null>(null)
  const [streak, setStreak] = useState(0)

  const suitSymbols = ['♠','♥','♦','♣']
  const suitIdxs = ['spades','hearts','diamonds','clubs']

  const handleAnswer = (opt: number) => {
    if (selected !== null) return
    setSelected(opt)
    if (opt === question.correctCombos) setStreak(s => s + 1)
    else setStreak(0)
  }

  const next = () => {
    setQuestion(generateComboQuestion())
    setSelected(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-text-muted">Quantos combos de <span className="font-mono font-bold text-accent-gold">{question.targetHand}</span> villain pode ter?</p>
        {streak > 0 && <Badge variant="emerald" size="sm">🔥 {streak} seguidas</Badge>}
      </div>

      {/* Cartas do herói */}
      <div className="bg-bg-base rounded-xl p-3 border border-border-subtle">
        <div className="text-[10px] text-text-muted mb-2">Você segura:</div>
        <div className="flex gap-2">
          {question.heroCards.length === 0 ? (
            <span className="text-xs text-text-muted italic">Nenhuma carta (sem blockers)</span>
          ) : question.heroCards.map((c, i) => (
            <div key={i} className={cn(
              'px-3 py-2 rounded-lg border font-mono font-bold text-sm',
              ['spades','clubs'].includes(c.suit) ? 'text-text-secondary border-border-default bg-bg-elevated' : 'text-red-400 border-red-500/30 bg-red-500/5'
            )}>
              {c.rank}{suitSymbols[suitIdxs.indexOf(c.suit)]}
            </div>
          ))}
        </div>
      </div>

      {/* Opções */}
      <div className="grid grid-cols-2 gap-2">
        {question.options.map(opt => {
          const isCorrect = opt === question.correctCombos
          const isSelected = selected === opt
          return (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={selected !== null}
              className={cn(
                'py-4 rounded-xl text-xl font-mono font-bold border transition-all',
                selected === null ? 'bg-bg-overlay border-border-default hover:border-accent-gold/30 text-text-primary' :
                isCorrect ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' :
                isSelected ? 'bg-red-500/15 border-red-500/40 text-red-400' :
                'bg-bg-overlay border-border-subtle text-text-muted opacity-50'
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {selected !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className={cn('rounded-xl p-3 border text-[11px]',
            selected === question.correctCombos
              ? 'bg-emerald-500/8 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/8 border-red-500/30 text-red-300'
          )}>
            {selected === question.correctCombos ? '✅ Correto!' : `❌ Incorreto. Correto: ${question.correctCombos} combos`}
            <p className="text-text-secondary mt-1 text-[10px]">{question.explanation}</p>
          </div>
          <div className="bg-bg-base rounded-xl p-3 border border-border-subtle text-[10px] text-text-muted space-y-1">
            <div>Par (ex: AA) = C(4,2) = <strong className="text-text-primary">6 combos</strong></div>
            <div>Suited (ex: AKs) = 4 naipes = <strong className="text-text-primary">4 combos</strong></div>
            <div>Offsuit (ex: AKo) = 4×4-4 = <strong className="text-text-primary">12 combos</strong></div>
            <div>Cada carta que você segura <strong className="text-accent-gold">reduz</strong> os combos disponíveis</div>
          </div>
          <Button variant="gold" size="md" onClick={next} className="w-full">
            <RefreshCw size={13} />
            Próxima Questão
          </Button>
        </motion.div>
      )}
    </div>
  )
}

// ------- RAKE CALCULATOR -------
function RakeCalc() {
  const [rake, setRake] = useState(5)
  const [cap, setCap] = useState(3)
  const [avgPot, setAvgPot] = useState(20)
  const [handsPerHour, setHandsPerHour] = useState(70)
  const [bbSize, setBbSize] = useState(0.10) // R$ ou $

  const effectiveRakePerHand = Math.min(avgPot * rake / 100, cap)
  const rakePerHour = effectiveRakePerHand * handsPerHour
  const bbPerHour = rakePerHour / bbSize
  const bb100FromRake = (effectiveRakePerHand / (avgPot * bbSize / 2)) * 100 // BB/100 perdidos

  // Winrate necessário para cobrir rake
  const winrateNeeded = Math.round(bb100FromRake * 10) / 10

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-text-muted">Calcule o impacto do rake no seu winrate e quais mãos ficam marginais.</p>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Rake %', val: rake, set: setRake, min: 1, max: 10, step: 0.5 },
          { label: 'Cap (BB)', val: cap, set: setCap, min: 0.5, max: 10, step: 0.5 },
          { label: 'Pot médio (BB)', val: avgPot, set: setAvgPot, min: 5, max: 100, step: 5 },
          { label: 'Mãos/hora', val: handsPerHour, set: setHandsPerHour, min: 20, max: 120, step: 10 },
        ].map(({ label, val, set, min, max, step }) => (
          <div key={label}>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
              <span className="font-mono text-accent-gold text-[10px] font-bold">{val}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={val}
              onChange={e => set(Number(e.target.value))}
              className="w-full accent-yellow-400" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {[
          { label: 'Rake por mão', val: `${effectiveRakePerHand.toFixed(2)} BB`, color: 'text-accent-crimson', note: `(${rake}% × pot, cap ${cap}BB)` },
          { label: 'Rake por hora', val: `${rakePerHour.toFixed(1)} BB`, color: 'text-accent-crimson', note: `(${handsPerHour} mãos/h)` },
          { label: 'BB/100 perdidos', val: `${bb100FromRake.toFixed(1)} BB/100`, color: 'text-orange-400', note: 'para rake' },
          { label: 'Winrate mínimo', val: `${winrateNeeded}+ BB/100`, color: 'text-accent-emerald', note: 'para ser lucrativo' },
        ].map(({ label, val, color, note }) => (
          <div key={label} className="flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-base">
            <div>
              <div className="text-xs text-text-primary">{label}</div>
              <div className="text-[10px] text-text-muted">{note}</div>
            </div>
            <span className={cn('font-mono font-bold text-sm', color)}>{val}</span>
          </div>
        ))}
      </div>

      <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <Info size={13} className="text-accent-blue mt-0.5 shrink-0" />
          <p className="text-[11px] text-text-secondary leading-relaxed">
            <strong>Mãos marginais com alto rake:</strong> Suited connectors pequenos (T6s, 96s), small pairs fora de posição, e AXo fracos tornam-se -EV com rake &gt;4% sem cap. Prefira jogar em salas com rake cap menor.
          </p>
        </div>
      </div>
    </div>
  )
}

// ------- ICM DRILL -------
type ICMScenario = {
  id: string
  title: string
  description: string
  stacks: number[]
  payouts: number[]
  heroIdx: number
  heroHand: string
  heroPosition: string
  bbSize: number
  question: string
  correctAction: 'shove' | 'fold'
  explanation: string
  icmValues: number[]
}

const ICM_SCENARIOS: ICMScenario[] = [
  {
    id: 'i1',
    title: 'Bolha do Torneio',
    description: '4 jogadores, 3 pagam. Stacks muito diferentes.',
    stacks: [15, 35, 30, 20], // em BBs
    payouts: [50, 30, 20],
    heroIdx: 0,
    heroHand: 'A7o',
    heroPosition: 'BTN',
    bbSize: 1,
    question: 'Você é o short stack na bolha (BTN, 15bb). Todos foldaram. Você tem A7o. Shove ou Fold?',
    correctAction: 'shove',
    explanation: 'Com 15bb no BTN na bolha, A7o é um shove claro. Você está em território de push/fold e tem fold equity suficiente. ICM pressiona jogadores com stacks maiores a não chamar levianamente. A7o vs range de call dos blinds (~33%) tem ~56% de equity.',
    icmValues: [0, 0, 0, 0],
  },
  {
    id: 'i2',
    title: 'Final Table — Chip Leader',
    description: 'Final table de 5. Você é chip leader.',
    stacks: [60, 20, 15, 10, 5],
    payouts: [40, 25, 18, 12, 5],
    heroIdx: 0,
    heroHand: 'TT',
    heroPosition: 'UTG',
    bbSize: 1,
    question: 'Você é o chip leader (60bb) no UTG de um final table. Tem TT. Short stack (5bb) está no BTN. Call ou Fold vs sua raise se ele shove?',
    correctAction: 'shove',
    explanation: 'Mesmo sendo chip leader, TT é forte o suficiente para continuar. Com 60bb você não arrisca sua posição dominante — 5bb a mais não muda muito. TT tem ~70% de equity vs range de shove do short stack. ICM não muda essa decisão quando o risco é pequeno.',
    icmValues: [0, 0, 0, 0, 0],
  },
  {
    id: 'i3',
    title: 'Bolha — Big Stack vs Short',
    description: '4 players, 3 paid. Você é big stack.',
    stacks: [45, 5, 28, 22],
    payouts: [50, 30, 20],
    heroIdx: 0,
    heroHand: '44',
    heroPosition: 'CO',
    bbSize: 1,
    question: 'Você é o big stack (45bb) no CO na bolha. Short stack (5bb) está all-in no SB. BB tem 22bb. Você tem 44. Call ou Fold?',
    correctAction: 'fold',
    explanation: 'ICM diz FOLD aqui! Com 45bb você já está "na beira do dinheiro." Se chamar e perder, você vai para 40bb — ok. Mas se o short stack dobrar, você ainda tem 40bb. A questão é: o BB pode entrar também (squeeze). Com 44 vs dois players, equity é ruim. E perder chips ameaça sua posição dominante que garante o prêmio.',
    icmValues: [0, 0, 0, 0],
  },
  {
    id: 'i4',
    title: 'Push/Fold na Bolha — 8bb',
    description: 'MTT com 10 pagos, 11 players restantes.',
    stacks: [8, 40, 22, 30, 35, 28, 18, 15, 12, 50, 20],
    payouts: [35, 20, 15, 12, 8, 5, 3, 1.5, 1, 0.5],
    heroIdx: 0,
    heroHand: 'K9o',
    heroPosition: 'BTN',
    bbSize: 1,
    question: 'MTT, bolha (11 de 10 pagos). Você tem 8bb no BTN. SB tem 40bb, BB tem 22bb. Mão: K9o. Shove ou Fold?',
    correctAction: 'shove',
    explanation: 'Com apenas 8bb na bolha, foldar K9o seria muito tight. Você está morto se esperar — em 2-3 órbitas perderá o stack a blinds. K9o no BTN vs SB e BB tem equity suficiente (~52% vs range de call razoável de ~30%). A fold equity é alta pois nenhum dos dois quer ser o "assassino do short stack" na bolha.',
    icmValues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'i5',
    title: 'Final Table 3-Handed',
    description: '3 players, pay jump enorme para 2º e 1º.',
    stacks: [50, 30, 20],
    payouts: [55, 30, 15],
    heroIdx: 2,
    heroHand: 'ATs',
    heroPosition: 'BB',
    bbSize: 1,
    question: '3-handed final table. Você é o short stack (20bb) no BB. Chip leader (50bb) shove do BTN. ATs — Call ou Fold?',
    correctAction: 'shove',
    explanation: 'ATs com 20bb no BB vs BTN shove é um call claro mesmo com ICM. A diferença de equity entre 1º e 2º é grande, mas você está a 2 órbitas de ser eliminado. ATs tem ~55% vs range de shove do chip leader. ICM custo é real mas não é suficiente para foldar ATs aqui — você precisa acumular chips.',
    icmValues: [0, 0, 0],
  },
  {
    id: 'i6',
    title: 'Pay Jump — Fold para Prêmio',
    description: '5 players, pay jump enorme de 5º para 4º.',
    stacks: [8, 50, 45, 40, 38],
    payouts: [40, 25, 18, 12, 5],
    heroIdx: 0,
    heroHand: 'KJo',
    heroPosition: 'SB',
    bbSize: 1,
    question: 'Bolha de 5 (4 pagam). Você é o short stack (8bb) SB. BB tem 50bb. KJo — Shove ou Fold?',
    correctAction: 'shove',
    explanation: 'Com 8bb na bolha e KJo no SB, você DEVE shove. Esperar não é opção — em 2 órbitas você terá 5bb e qualquer hand vira call automático. KJo tem equity positiva vs BB call range. O risco ICM é real mas com 8bb sua "opção de esperar" não existe. Shove e torça por fold ou por equity.',
    icmValues: [0, 0, 0, 0, 0],
  },
  {
    id: 'i7',
    title: 'Chip Chop 3-Handed',
    description: '3 jogadores, decisão de chip chop vs continuar.',
    stacks: [70, 20, 10],
    payouts: [50, 30, 20],
    heroIdx: 1,
    heroHand: 'QQ',
    heroPosition: 'CO',
    bbSize: 1,
    question: 'Você tem 20bb (2º lugar de 3). Chip leader (70bb) abre, você tem QQ. Shove ou Fold considerando ICM?',
    correctAction: 'shove',
    explanation: 'QQ com 20bb 3-handed é um shove independente de ICM. Você está no "dead money zone" — precisa acumular ou vai ser eliminado. QQ tem ~65% vs range do chip leader. Se dobrar, você competi pelo 1º. Se perder, você tem ~0bb mas a short stack (10bb) ainda está viva — você ganha o 3º de qualquer forma.',
    icmValues: [0, 0, 0],
  },
  {
    id: 'i8',
    title: 'Laydown Premium — ICM Extremo',
    description: 'Final table heads-up, pay jump massivo.',
    stacks: [55, 45],
    payouts: [70, 30],
    heroIdx: 1,
    heroHand: 'QQ',
    heroPosition: 'BB',
    bbSize: 1,
    question: 'Heads-up, você tem 45bb (2º). Villain (55bb) all-in pré-flop. QQ — Call ou Fold? (Prêmio: 1º = R$10k, 2º = R$6k)',
    correctAction: 'shove',
    explanation: 'QQ heads-up é SEMPRE call. ICM não muda isso. Você tem ~80% equity vs range de shove heads-up (inclui K-x, A-x, pares menores). Se ganhar: +R$4k EV. ICM só pede laydowns de premium quando a diferença de EV é marginal — QQ tem equity esmagadora heads-up. Call sem hesitar.',
    icmValues: [0, 0],
  },
  {
    id: 'i9',
    title: 'Spot de Fold Premium — ICM Real',
    description: '4 players, 3 pagam. Chip leader vs short stack.',
    stacks: [5, 40, 35, 20],
    payouts: [50, 30, 20],
    heroIdx: 2,
    heroHand: 'JJ',
    heroPosition: 'UTG',
    bbSize: 1,
    question: 'Bolha (4 de 3 pagos). Short stack (5bb) all-in. Chip leader (40bb) cold call. Você tem JJ com 35bb. Shove/Call ou Fold?',
    correctAction: 'fold',
    explanation: 'FOLD com JJ! Este é o clássico spot ICM de laydown. Você está na bolha com 35bb — quasi-seguro de entrar no dinheiro se foldar. Se você entra no pote, fica exposto a chip leader (40bb) E ao short stack. Perder esse pote = você vai para ~10bb e corre risco. JJ vs 2 ranges simultâneos tem equity ruim. ICM diz: proteja o prêmio garantido.',
    icmValues: [0, 0, 0, 0],
  },
  {
    id: 'i10',
    title: 'Reshoving na Bolha',
    description: '4 players, 3 pagam. Reshove ICM spot.',
    stacks: [12, 38, 30, 20],
    payouts: [50, 30, 20],
    heroIdx: 0,
    heroHand: 'A9s',
    heroPosition: 'SB',
    bbSize: 1,
    question: 'Bolha (4 de 3 pagos). Você tem 12bb no SB. CO (38bb) open-raises para 2.5x. Você tem A9s. Shove ou Fold?',
    correctAction: 'shove',
    explanation: 'Reshove com A9s para 12bb vs CO open é correto. Você tem fold equity suficiente (CO precisará de ~40% equity para justificar call dado o ICM), e A9s tem ~50% equity quando chamado. Com 12bb, você não tem outra opção viável — min-3bet/fold desperdiça equity, limp é muito fraco. A9s é forte o suficiente para reshove nessa stack depth.',
    icmValues: [0, 0, 0, 0],
  },
]

function ICMDrillCalc() {
  const [scenarioIdx, setScenarioIdx] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [userAction, setUserAction] = useState<'shove' | 'fold' | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const scenario = ICM_SCENARIOS[scenarioIdx]
  const icmValues = calculateICM(scenario.stacks, scenario.payouts)

  const handleAnswer = (action: 'shove' | 'fold') => {
    if (answered) return
    setUserAction(action)
    setAnswered(true)
    setScore(s => ({
      correct: s.correct + (action === scenario.correctAction ? 1 : 0),
      total: s.total + 1,
    }))
  }

  const next = () => {
    setScenarioIdx(i => (i + 1) % ICM_SCENARIOS.length)
    setAnswered(false)
    setUserAction(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-text-primary">{scenario.title}</div>
          <div className="text-[11px] text-text-muted">{scenario.description}</div>
        </div>
        {score.total > 0 && (
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-accent-emerald">{score.correct}/{score.total}</div>
            <div className="text-[10px] text-text-muted">corretas</div>
          </div>
        )}
      </div>

      {/* Stacks */}
      <div className="bg-bg-base rounded-xl p-3 border border-border-subtle">
        <div className="text-[10px] text-text-muted mb-2 uppercase tracking-wider">Stacks (BB)</div>
        <div className="flex gap-1.5 flex-wrap">
          {scenario.stacks.map((s, i) => (
            <div key={i} className={cn(
              'px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border',
              i === scenario.heroIdx
                ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
                : 'bg-bg-elevated border-border-subtle text-text-muted'
            )}>
              {i === scenario.heroIdx ? `Você: ${s}` : s}
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-text-muted">
          Prêmios: {scenario.payouts.map((p, i) => `${i + 1}º: ${p}%`).join(' | ')}
        </div>
      </div>

      {/* ICM values */}
      <div className="bg-bg-base rounded-xl p-3 border border-border-subtle">
        <div className="text-[10px] text-text-muted mb-2 uppercase tracking-wider">Valores ICM (% do prêmio)</div>
        <div className="grid grid-cols-4 gap-1">
          {icmValues.map((v, i) => (
            <div key={i} className={cn(
              'text-center rounded-lg p-1.5 border',
              i === scenario.heroIdx ? 'bg-accent-gold/10 border-accent-gold/30' : 'bg-bg-elevated border-border-subtle'
            )}>
              <div className="text-[10px] text-text-muted">{i === scenario.heroIdx ? 'Você' : `P${i+1}`}</div>
              <div className={cn('text-xs font-mono font-bold', i === scenario.heroIdx ? 'text-accent-gold' : 'text-text-secondary')}>
                {(v * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pergunta */}
      <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-3">
        <p className="text-[11px] text-text-secondary leading-relaxed">{scenario.question}</p>
        <div className="mt-2">
          <span className="font-mono font-bold text-accent-gold">{scenario.heroHand}</span>
          <span className="text-[10px] text-text-muted ml-2">{scenario.heroPosition}</span>
        </div>
      </div>

      {/* Botões */}
      {!answered && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleAnswer('fold')}
            className="py-4 rounded-xl border border-border-default text-sm font-bold text-text-secondary bg-bg-overlay hover:border-red-500/30 hover:text-red-400 transition-all">
            Fold
          </button>
          <button onClick={() => handleAnswer('shove')}
            className="py-4 rounded-xl bg-accent-crimson/10 border border-accent-crimson/30 text-sm font-bold text-accent-crimson hover:bg-accent-crimson/20 transition-all">
            Shove (All-In)
          </button>
        </div>
      )}

      {/* Feedback */}
      {answered && userAction && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className={cn('rounded-xl p-3 border',
            userAction === scenario.correctAction
              ? 'bg-emerald-500/8 border-emerald-500/30' : 'bg-red-500/8 border-red-500/30'
          )}>
            <div className={cn('text-sm font-bold mb-2',
              userAction === scenario.correctAction ? 'text-emerald-400' : 'text-red-400'
            )}>
              {userAction === scenario.correctAction ? '✅ Correto!' : `❌ Incorreto — correto: ${scenario.correctAction.toUpperCase()}`}
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">{scenario.explanation}</p>
          </div>
          <Button variant="gold" size="md" onClick={next} className="w-full">
            <RefreshCw size={13} />
            Próximo Cenário ({((scenarioIdx + 1) % ICM_SCENARIOS.length) + 1}/{ICM_SCENARIOS.length})
          </Button>
        </motion.div>
      )}
    </div>
  )
}

// ------- ICM CALCULADORA BÁSICA -------
function ICMCalc() {
  const [stacks, setStacks] = useState<number[]>([30, 25, 25, 20])
  const [payouts, setPayouts] = useState<number[]>([50, 30, 20])
  const [heroIdx, setHeroIdx] = useState(0)
  const [results, setResults] = useState<number[] | null>(null)

  const totalStacks = stacks.reduce((a, b) => a + b, 0)
  const totalPayout = payouts.reduce((a, b) => a + b, 0)

  const updateStack = (i: number, val: number) => { setStacks(s => s.map((v, j) => j === i ? Math.max(1, val) : v)); setResults(null) }
  const updatePayout = (i: number, val: number) => { setPayouts(p => p.map((v, j) => j === i ? Math.max(1, val) : v)); setResults(null) }

  const addPlayer = () => { if (stacks.length >= 8) return; setStacks(s => [...s, 15]); setResults(null) }
  const removePlayer = () => {
    if (stacks.length <= 2) return
    setStacks(s => s.slice(0, -1))
    setHeroIdx(h => Math.min(h, stacks.length - 2))
    setResults(null)
  }
  const addPayout = () => { if (payouts.length >= stacks.length - 1) return; setPayouts(p => [...p, 5]); setResults(null) }
  const removePayout = () => { if (payouts.length <= 1) return; setPayouts(p => p.slice(0, -1)); setResults(null) }

  const calculate = () => setResults(calculateICM(stacks, payouts))

  const payoutOk = Math.abs(totalPayout - 100) <= 1

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-text-muted">Insira os stacks e a estrutura de prêmios para calcular o equity ICM de cada jogador.</p>

      {/* Jogadores */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-text-muted uppercase tracking-wider">Stacks (BB)</span>
          <div className="flex gap-1.5">
            <button onClick={removePlayer} disabled={stacks.length <= 2}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-border-subtle text-text-muted hover:text-accent-gold disabled:opacity-30 transition-all">−</button>
            <button onClick={addPlayer} disabled={stacks.length >= 8}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-border-subtle text-text-muted hover:text-accent-gold disabled:opacity-30 transition-all">+ Jogador</button>
          </div>
        </div>
        <div className="space-y-2">
          {stacks.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <button onClick={() => setHeroIdx(i)}
                className={cn(
                  'text-[10px] px-2 py-1.5 rounded-lg border font-mono font-bold w-12 flex-shrink-0 transition-all',
                  i === heroIdx ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold' : 'bg-bg-base border-border-subtle text-text-muted hover:border-accent-gold/20'
                )}>
                {i === heroIdx ? 'Você' : `P${i + 1}`}
              </button>
              <input type="number" value={s} min={1}
                onChange={e => updateStack(i, Number(e.target.value))}
                className="flex-1 bg-bg-base border border-border-default rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary focus:border-accent-gold focus:outline-none" />
              <span className="text-[10px] text-text-muted">BB</span>
              {results && (
                <span className={cn('text-xs font-mono font-bold w-12 text-right flex-shrink-0',
                  i === heroIdx ? 'text-accent-gold' : 'text-text-secondary'
                )}>
                  {(results[i] * 100).toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Prêmios */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-text-muted uppercase tracking-wider">
            Prêmios (%) <span className={cn('ml-1 font-mono', payoutOk ? 'text-accent-emerald' : 'text-accent-crimson')}>= {totalPayout}%</span>
          </span>
          <div className="flex gap-1.5">
            <button onClick={removePayout} disabled={payouts.length <= 1}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-border-subtle text-text-muted hover:text-accent-gold disabled:opacity-30 transition-all">−</button>
            <button onClick={addPayout} disabled={payouts.length >= stacks.length - 1}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-border-subtle text-text-muted hover:text-accent-gold disabled:opacity-30 transition-all">+ Lugar</button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {payouts.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-bg-base border border-border-subtle rounded-lg px-2 py-1.5">
              <span className="text-[10px] text-text-muted font-mono">{i + 1}º</span>
              <input type="number" value={p} min={1} max={100}
                onChange={e => updatePayout(i, Number(e.target.value))}
                className="w-14 bg-transparent text-sm font-mono text-text-primary text-center focus:outline-none" />
              <span className="text-[10px] text-text-muted">%</span>
            </div>
          ))}
        </div>
      </div>

      <Button variant="gold" size="lg" onClick={calculate} className="w-full" disabled={!payoutOk}>
        Calcular ICM
      </Button>

      {!payoutOk && <p className="text-[10px] text-accent-crimson text-center">Os prêmios devem somar 100%</p>}

      {results && payoutOk && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {stacks.map((s, i) => (
            <div key={i} className={cn(
              'p-3 rounded-xl border transition-all',
              i === heroIdx ? 'border-accent-gold/30 bg-accent-gold/5' : 'border-border-subtle bg-bg-base'
            )}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn('text-xs font-bold w-10', i === heroIdx ? 'text-accent-gold' : 'text-text-muted')}>
                  {i === heroIdx ? 'Você' : `P${i + 1}`}
                </span>
                <div className="flex-1 h-1.5 bg-bg-overlay rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', i === heroIdx ? 'bg-accent-gold' : 'bg-accent-blue')}
                    style={{ width: `${(s / totalStacks) * 100}%` }} />
                </div>
                <span className={cn('font-mono font-bold text-sm w-12 text-right', i === heroIdx ? 'text-accent-gold' : 'text-text-primary')}>
                  {(results[i] * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-text-muted">
                <span>{s} BB ({((s / totalStacks) * 100).toFixed(1)}% chips)</span>
                <span>ICM equity</span>
              </div>
            </div>
          ))}
          <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-3">
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Chips: <strong className="text-text-primary">{((stacks[heroIdx] / totalStacks) * 100).toFixed(1)}%</strong>
              {' '}→ ICM: <strong className="text-accent-gold">{(results[heroIdx] * 100).toFixed(1)}%</strong>.
              {' '}{stacks[heroIdx] / totalStacks > results[heroIdx]
                ? 'ICM penalty: chip leaders valem menos % por chip em torneios.'
                : 'ICM premium: short stacks têm equity proporcionalmente maior.'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// =============== COMPONENTE PRINCIPAL ===============
export default function Calculators() {
  const [activeCalc, setActiveCalc] = useState<CalcType>('potodds')
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null)

  const CALC_COMPONENTS: Record<CalcType, JSX.Element | null> = {
    potodds: <PotOddsCalc />,
    ev: <EVCalc />,
    mdf: <MDFCalc />,
    outs: <OutsCalc />,
    spr: <SPRCalc />,
    foldequity: <FoldEquityCalc />,
    equity: <EquityCalc />,
    combos: <CombinatoricsTrainer />,
    rake: <RakeCalc />,
    icmdrill: <ICMDrillCalc />,
    icm: <ICMCalc />,
  }

  return (
    <div className="page-scroll">
      <div className="px-4 py-4 pb-6 space-y-4">

        {/* ---- HEADER ---- */}
        <div>
          <h1 className="text-lg font-display font-bold text-text-primary">Calculadoras</h1>
          <p className="text-xs text-text-muted mt-0.5">Ferramentas matemáticas de poker</p>
        </div>

        {/* ---- SELETOR ---- */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {CALCULATORS.map(calc => (
            <button
              key={calc.id}
              onClick={() => !calc.isPremium && setActiveCalc(calc.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-body font-medium border transition-all',
                activeCalc === calc.id
                  ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold'
                  : calc.isPremium
                  ? 'bg-bg-base border-border-subtle text-text-muted opacity-60'
                  : 'bg-bg-base border-border-subtle text-text-secondary'
              )}
            >
              <span>{calc.icon}</span>
              <span>{calc.label}</span>
              {calc.isPremium && <span className="text-[9px] text-accent-gold">PRO</span>}
            </button>
          ))}
        </div>

        {/* ---- CALCULADORA ATIVA ---- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCalc}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4">
              <div className="mb-4">
                <h2 className="text-sm font-display font-bold text-text-primary">
                  {CALCULATORS.find(c => c.id === activeCalc)?.icon}{' '}
                  {CALCULATORS.find(c => c.id === activeCalc)?.label}
                </h2>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {CALCULATORS.find(c => c.id === activeCalc)?.description}
                </p>
              </div>
              {CALC_COMPONENTS[activeCalc] || (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🔒</div>
                  <div className="text-sm font-display font-bold text-accent-gold">Conteúdo Premium</div>
                  <div className="text-xs text-text-muted mt-1">Assine o plano Pro para acessar</div>
                </div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  )
}
