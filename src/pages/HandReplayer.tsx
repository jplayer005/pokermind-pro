// ============================================================
// POKERMIND PRO — HAND REPLAYER
// Reprodutor visual de mãos com mesa, animações e timeline
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHandsStore } from '@/store'
import { SavedHand, Card, ReplayerPlayer, ReplayerAction } from '@/types'
import PlayingCard from '@/components/poker/PlayingCard'
import { Button, Card as UICard, Badge, SectionHeader, EmptyState } from '@/components/ui'
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
  Plus, Trash2, Tag, FileText, Clock, Users, Eye, EyeOff,
  BookOpen, Download, Share2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// DADOS MOCK DE MÃOS DEMONSTRAÇÃO
// ============================================================

const makeCard = (s: string): Card => {
  const rank = s[0] as Card['rank']
  const suitMap: Record<string, Card['suit']> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }
  return { rank, suit: suitMap[s[1]] }
}

const DEMO_HANDS: SavedHand[] = [
  {
    id: 'demo_001',
    title: 'BTN vs BB — Blefe no river',
    date: Date.now() - 2 * 24 * 60 * 60 * 1000,
    heroCards: [makeCard('Ah'), makeCard('Kd')],
    board: [makeCard('Qs'), makeCard('Jc'), makeCard('2h'), makeCard('7d'), makeCard('3s')],
    players: [
      { name: 'Herói', position: 'BTN', stack: 100, cards: [makeCard('Ah'), makeCard('Kd')], isHero: true },
      { name: 'Vilão', position: 'BB', stack: 100, isHero: false },
    ],
    actions: [
      { player: 'Herói', action: 'raise', amount: 2.5, street: 'preflop', timestamp: 0 },
      { player: 'Vilão', action: 'call', amount: 2.5, street: 'preflop', timestamp: 1 },
      { player: 'Vilão', action: 'check', street: 'flop', timestamp: 2 },
      { player: 'Herói', action: 'raise', amount: 3, street: 'flop', timestamp: 3 },
      { player: 'Vilão', action: 'call', amount: 3, street: 'flop', timestamp: 4 },
      { player: 'Vilão', action: 'check', street: 'turn', timestamp: 5 },
      { player: 'Herói', action: 'raise', amount: 8, street: 'turn', timestamp: 6 },
      { player: 'Vilão', action: 'call', amount: 8, street: 'turn', timestamp: 7 },
      { player: 'Vilão', action: 'check', street: 'river', timestamp: 8 },
      { player: 'Herói', action: 'raise', amount: 22, street: 'river', timestamp: 9 },
      { player: 'Vilão', action: 'fold', street: 'river', timestamp: 10 },
    ],
    pot: 48.5,
    result: 16.5,
    notes: 'Blefe bem executado com nutstraight blocker no river.',
    tags: ['blefe', 'river', 'btn'],
  },
  {
    id: 'demo_002',
    title: 'UTG vs BTN — Value 3bet pot',
    date: Date.now() - 5 * 24 * 60 * 60 * 1000,
    heroCards: [makeCard('Kh'), makeCard('Ks')],
    board: [makeCard('Kc'), makeCard('7d'), makeCard('2s'), makeCard('9h'), makeCard('Jc')],
    players: [
      { name: 'Herói', position: 'UTG', stack: 100, cards: [makeCard('Kh'), makeCard('Ks')], isHero: true },
      { name: 'Vilão', position: 'BTN', stack: 100, isHero: false },
    ],
    actions: [
      { player: 'Herói', action: 'raise', amount: 2.5, street: 'preflop', timestamp: 0 },
      { player: 'Vilão', action: '3bet', amount: 8, street: 'preflop', timestamp: 1 },
      { player: 'Herói', action: 'call', amount: 8, street: 'preflop', timestamp: 2 },
      { player: 'Herói', action: 'check', street: 'flop', timestamp: 3 },
      { player: 'Vilão', action: 'raise', amount: 6, street: 'flop', timestamp: 4 },
      { player: 'Herói', action: 'call', amount: 6, street: 'flop', timestamp: 5 },
      { player: 'Herói', action: 'check', street: 'turn', timestamp: 6 },
      { player: 'Vilão', action: 'raise', amount: 18, street: 'turn', timestamp: 7 },
      { player: 'Herói', action: 'call', amount: 18, street: 'turn', timestamp: 8 },
      { player: 'Herói', action: 'check', street: 'river', timestamp: 9 },
      { player: 'Vilão', action: 'raise', amount: 45, street: 'river', timestamp: 10 },
      { player: 'Herói', action: 'call', amount: 45, street: 'river', timestamp: 11 },
    ],
    pot: 162,
    result: 81,
    notes: 'Set de reis slow-played contra BTN agressivo.',
    tags: ['set', 'value', 'utg'],
  },
]

// ============================================================
// POSIÇÕES NA MESA (coordenadas %)
// ============================================================

const TABLE_SEATS: Record<string, { top: string; left: string }> = {
  BTN: { top: '72%', left: '72%' },
  SB:  { top: '72%', left: '28%' },
  BB:  { top: '20%', left: '28%' },
  UTG: { top: '10%', left: '50%' },
  HJ:  { top: '20%', left: '72%' },
  CO:  { top: '50%', left: '85%' },
}

// ============================================================
// COMPONENTE: MESA DE POKER
// ============================================================

interface PokerTableProps {
  hand: SavedHand
  currentStep: number
  showVillainCards: boolean
}

function PokerTable({ hand, currentStep, showVillainCards }: PokerTableProps) {
  const actionsUpToNow = hand.actions.slice(0, currentStep)
  const currentStreet = actionsUpToNow.length > 0
    ? actionsUpToNow[actionsUpToNow.length - 1].street
    : 'preflop'
  const boardCount = ({ preflop: 0, flop: 3, turn: 4, river: 5 } as Record<string, number>)[currentStreet]
  const potAtStep = actionsUpToNow.reduce((acc, a) => acc + (a.amount || 0), 1.5)

  return (
    <div className="relative w-full" style={{ paddingBottom: '56%' }}>
      <div
        className="absolute inset-0 rounded-[50%] border-4 border-[#1a3a2a] shadow-2xl overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at center, #1b4332 0%, #0d2818 100%)' }}
      >
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
        <div className="absolute inset-4 rounded-[50%] border border-[#2d6a4f] opacity-40" />

        {/* POT */}
        <motion.div
          key={potAtStep}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10"
        >
          <div className="text-xs text-emerald-400/70 mb-0.5 font-mono">POT</div>
          <div className="text-lg font-bold text-yellow-400 font-mono">{potAtStep.toFixed(1)} BB</div>
        </motion.div>

        {/* BOARD CARDS */}
        <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1 z-10">
          {hand.board.slice(0, 5).map((card, i) => (
            <motion.div
              key={i}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={i < boardCount ? { rotateY: 0, opacity: 1 } : { rotateY: 90, opacity: 0.2 }}
              transition={{ duration: 0.4 }}
            >
              <PlayingCard card={i < boardCount ? card : undefined} size="sm" faceDown={i >= boardCount} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* JOGADORES */}
      {hand.players.map((player) => {
        const seat = TABLE_SEATS[player.position]
        if (!seat) return null
        const lastAction = [...actionsUpToNow].reverse().find(a => a.player === player.name)

        return (
          <div
            key={player.name}
            className="absolute z-20"
            style={{ top: seat.top, left: seat.left, transform: 'translate(-50%, -50%)' }}
          >
            <div className={cn('flex flex-col items-center gap-1', player.isHero && 'scale-110')}>
              <div className="flex gap-0.5 mb-0.5">
                {(player.isHero || showVillainCards) && player.cards?.map((c, i) => (
                  <PlayingCard key={i} card={c} size="xs" />
                ))}
                {!player.isHero && !showVillainCards && (
                  <><PlayingCard size="xs" faceDown /><PlayingCard size="xs" faceDown /></>
                )}
              </div>

              <div className={cn(
                'px-2 py-1 rounded-lg text-center min-w-[56px]',
                player.isHero ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-bg-elevated border border-border-default'
              )}>
                <div className={cn('text-[10px] font-bold', player.isHero ? 'text-yellow-400' : 'text-text-primary')}>
                  {player.name}
                </div>
                <div className="text-[9px] text-text-muted">{player.position}</div>
                <div className="text-[10px] text-emerald-400 font-mono">{player.stack} BB</div>
              </div>

              <AnimatePresence>
                {lastAction && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      lastAction.action === 'fold' && 'bg-red-500/20 text-red-400',
                      lastAction.action === 'call' && 'bg-emerald-500/20 text-emerald-400',
                      lastAction.action === 'check' && 'bg-blue-500/20 text-blue-400',
                      (lastAction.action === 'raise' || lastAction.action === '3bet') && 'bg-yellow-500/20 text-yellow-400',
                      lastAction.action === 'shove' && 'bg-red-600/30 text-red-300',
                    )}
                  >
                    {lastAction.action}{lastAction.amount ? ` ${lastAction.amount}` : ''}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// COMPONENTE: TIMELINE DE AÇÕES
// ============================================================

interface TimelineProps {
  actions: ReplayerAction[]
  currentStep: number
  onStep: (step: number) => void
}

function ActionTimeline({ actions, currentStep, onStep }: TimelineProps) {
  const streets = ['preflop', 'flop', 'turn', 'river'] as const
  const streetColors = {
    preflop: 'text-blue-400', flop: 'text-emerald-400',
    turn: 'text-yellow-400', river: 'text-red-400',
  }
  const actionColors: Record<string, string> = {
    fold: 'bg-red-500/20 text-red-300 border-red-500/30',
    call: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    check: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    raise: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    '3bet': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    shove: 'bg-red-600/30 text-red-200 border-red-600/40',
  }

  return (
    <div className="space-y-2">
      {streets.map((street) => {
        const streetActions = actions
          .map((a, i) => ({ ...a, index: i }))
          .filter(a => a.street === street)
        if (streetActions.length === 0) return null
        return (
          <div key={street}>
            <div className={cn('text-xs font-bold uppercase mb-1', streetColors[street])}>{street}</div>
            <div className="flex flex-wrap gap-1">
              {streetActions.map((action) => (
                <motion.button
                  key={action.index}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStep(action.index + 1)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-all',
                    actionColors[action.action] || 'bg-bg-elevated text-text-muted border-border-default',
                    action.index < currentStep ? 'opacity-100' : 'opacity-40',
                    action.index + 1 === currentStep && 'ring-1 ring-white/40 scale-105'
                  )}
                >
                  <span className="text-[10px] opacity-60">{action.player.slice(0, 3)}</span>
                  <span className="font-bold uppercase">{action.action}</span>
                  {action.amount && <span>{action.amount}bb</span>}
                </motion.button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// COMPONENTE: MODAL DE NOVA MÃO
// ============================================================

function NewHandModal({ onClose, onSave }: { onClose: () => void; onSave: (hand: SavedHand) => void }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput('') }
  }

  const handleSave = () => {
    if (!title.trim()) return
    const hand: SavedHand = {
      id: `hand_${Date.now()}`,
      title,
      date: Date.now(),
      heroCards: [makeCard('Ah'), makeCard('Kd')],
      board: [makeCard('Qs'), makeCard('Jc'), makeCard('2h'), makeCard('7d'), makeCard('3s')],
      players: [
        { name: 'Herói', position: 'BTN', stack: 100, cards: [makeCard('Ah'), makeCard('Kd')], isHero: true },
        { name: 'Vilão', position: 'BB', stack: 100, isHero: false },
      ],
      actions: DEMO_HANDS[0].actions,
      pot: 48.5, result: 16.5, notes, tags,
    }
    onSave(hand)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="bg-bg-surface border border-border-default rounded-2xl p-5 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-text-primary mb-4">Nova Mão</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Título</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ex: BTN vs BB river bleff..."
              className="w-full bg-bg-elevated border border-border-default rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-yellow-500/50" />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Anotações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="O que aconteceu nessa mão?" rows={3}
              className="w-full bg-bg-elevated border border-border-default rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-yellow-500/50" />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Tags</label>
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="blefe, value, hero..."
                className="flex-1 bg-bg-elevated border border-border-default rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-yellow-500/50" />
              <Button size="sm" onClick={addTag}>+</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(t => (
                  <span key={t} onClick={() => setTags(tags.filter(x => x !== t))}
                    className="px-2 py-0.5 bg-yellow-500/15 text-yellow-400 text-xs rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-400 transition-colors">
                    #{t} ×
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant="gold" className="flex-1" onClick={handleSave} disabled={!title.trim()}>Salvar Mão</Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function HandReplayer() {
  const { savedHands, saveHand, deleteHand } = useHandsStore()
  const [selectedHand, setSelectedHand] = useState<SavedHand | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showVillainCards, setShowVillainCards] = useState(false)
  const [showNewHandModal, setShowNewHandModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'replay'>('list')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const allHands = [...DEMO_HANDS, ...savedHands]

  useEffect(() => {
    if (isPlaying && selectedHand) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= selectedHand.actions.length) { setIsPlaying(false); return prev }
          return prev + 1
        })
      }, 1200)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, selectedHand])

  const handleSelectHand = (hand: SavedHand) => {
    setSelectedHand(hand); setCurrentStep(0); setIsPlaying(false)
    setShowVillainCards(false); setActiveTab('replay')
  }

  const currentAction = selectedHand?.actions[currentStep - 1]
  const streetLabels: Record<string, string> = {
    preflop: '🃏 Pré-Flop', flop: '🟢 Flop', turn: '🔵 Turn', river: '🔴 River'
  }

  return (
    <div className="page-scroll">
      <div className="p-4 max-w-2xl mx-auto pb-24">
        <SectionHeader
          title="Replayer de Mãos"
          subtitle="Revise e analise suas mãos jogadas"
          action={
            <Button size="sm" variant="gold" onClick={() => setShowNewHandModal(true)}>
              + Nova Mão
            </Button>
          }
        />

        {/* TABS */}
        <div className="flex gap-1 bg-bg-elevated rounded-xl p-1 mb-4">
          {(['list', 'replay'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('flex-1 py-2 text-sm font-semibold rounded-lg transition-all',
                activeTab === tab ? 'bg-yellow-500 text-bg-base' : 'text-text-muted hover:text-text-primary')}>
              {tab === 'list' ? '📋 Biblioteca' : '▶️ Reprodutor'}
            </button>
          ))}
        </div>

        {/* TAB: LISTA */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            {allHands.length === 0 ? (
              <EmptyState icon="📋" title="Sem mãos salvas" description="Salve suas mãos para revisar depois" />
            ) : (
              allHands.map(hand => (
                <motion.div key={hand.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelectHand(hand)}
                  className={cn('glass rounded-2xl p-4 cursor-pointer border transition-all',
                    selectedHand?.id === hand.id
                      ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border-subtle hover:border-border-default')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-text-primary truncate">{hand.title}</h3>
                        <Badge variant={hand.result > 0 ? 'emerald' : 'crimson'} size="sm">
                          {hand.result > 0 ? '+' : ''}{hand.result.toFixed(1)} BB
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">
                          {hand.heroCards.map((c, i) => <PlayingCard key={i} card={c} size="xs" />)}
                        </div>
                        <span className="text-text-muted text-xs">em</span>
                        <div className="flex gap-0.5">
                          {hand.board.slice(0, 3).map((c, i) => <PlayingCard key={i} card={c} size="xs" />)}
                          {hand.board.length > 3 && <span className="text-xs text-text-muted self-center">+{hand.board.length - 3}</span>}
                        </div>
                      </div>
                      {hand.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hand.tags.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-bg-elevated text-text-muted rounded-full">#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1 text-[10px] text-text-muted">
                        <Clock size={10} />{new Date(hand.date).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-text-muted">
                        <FileText size={10} />{hand.actions.length} ações
                      </div>
                      {!hand.id.startsWith('demo_') && (
                        <button onClick={e => { e.stopPropagation(); deleteHand(hand.id) }}
                          className="p-1 text-text-muted hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* TAB: REPRODUTOR */}
        {activeTab === 'replay' && (
          <div>
            {!selectedHand ? (
              <EmptyState icon="▶️" title="Selecione uma mão"
                description="Escolha uma mão na biblioteca para reproduzir" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary">{selectedHand.title}</h3>
                  <Button size="sm" variant="ghost"
                    onClick={() => setShowVillainCards(v => !v)}>
                    {showVillainCards ? <><EyeOff size={14} /> Ocultar</> : <><Eye size={14} /> Revelar</>}
                  </Button>
                </div>

                <UICard>
                  <PokerTable hand={selectedHand} currentStep={currentStep} showVillainCards={showVillainCards} />
                </UICard>

                <AnimatePresence mode="wait">
                  {currentAction && (
                    <motion.div key={currentAction.street}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                      className="glass rounded-xl p-3 border border-border-subtle">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-text-primary">
                          {streetLabels[currentAction.street] || currentAction.street}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">{currentAction.player}:</span>
                          <span className={cn('text-sm font-bold uppercase',
                            currentAction.action === 'fold' && 'text-red-400',
                            currentAction.action === 'call' && 'text-emerald-400',
                            currentAction.action === 'check' && 'text-blue-400',
                            (currentAction.action === 'raise' || currentAction.action === '3bet') && 'text-yellow-400',
                          )}>
                            {currentAction.action}{currentAction.amount ? ` ${currentAction.amount} BB` : ''}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CONTROLES */}
                <UICard className="p-4">
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>Passo {currentStep} / {selectedHand.actions.length}</span>
                      <span>{Math.round((currentStep / Math.max(selectedHand.actions.length, 1)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                      <motion.div className="h-full bg-yellow-500 rounded-full"
                        animate={{ width: `${(currentStep / Math.max(selectedHand.actions.length, 1)) * 100}%` }}
                        transition={{ duration: 0.3 }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => { setCurrentStep(0); setIsPlaying(false) }}
                      className="p-2.5 rounded-xl bg-bg-elevated text-text-muted hover:text-text-primary transition-colors">
                      <SkipBack size={18} />
                    </button>
                    <button onClick={() => setCurrentStep(c => Math.max(0, c - 1))} disabled={currentStep === 0}
                      className="p-2.5 rounded-xl bg-bg-elevated text-text-muted hover:text-text-primary transition-colors disabled:opacity-30">
                      <ChevronLeft size={18} />
                    </button>
                    <motion.button whileTap={{ scale: 0.92 }}
                      onClick={() => setIsPlaying(p => !p)}
                      className="p-4 rounded-full bg-yellow-500 text-bg-base shadow-lg">
                      {isPlaying ? <Pause size={22} /> : <Play size={22} />}
                    </motion.button>
                    <button onClick={() => setCurrentStep(c => Math.min(selectedHand.actions.length, c + 1))}
                      disabled={currentStep >= selectedHand.actions.length}
                      className="p-2.5 rounded-xl bg-bg-elevated text-text-muted hover:text-text-primary transition-colors disabled:opacity-30">
                      <ChevronRight size={18} />
                    </button>
                    <button onClick={() => setCurrentStep(selectedHand.actions.length)}
                      className="p-2.5 rounded-xl bg-bg-elevated text-text-muted hover:text-text-primary transition-colors">
                      <SkipForward size={18} />
                    </button>
                  </div>
                </UICard>

                {/* TIMELINE */}
                <UICard>
                  <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Sequência de Ações</h4>
                  <ActionTimeline actions={selectedHand.actions} currentStep={currentStep} onStep={setCurrentStep} />
                </UICard>

                {/* RESULTADO */}
                {currentStep === selectedHand.actions.length && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={cn('rounded-2xl p-4 border text-center',
                      selectedHand.result > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30')}>
                    <div className="text-sm text-text-muted mb-1">Resultado Final</div>
                    <div className={cn('text-3xl font-bold font-mono',
                      selectedHand.result > 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {selectedHand.result > 0 ? '+' : ''}{selectedHand.result.toFixed(1)} BB
                    </div>
                    <div className="text-xs text-text-muted mt-1">Pot total: {selectedHand.pot.toFixed(1)} BB</div>
                  </motion.div>
                )}

                {/* NOTAS */}
                {selectedHand.notes && (
                  <UICard>
                    <h4 className="text-xs font-bold text-text-muted uppercase mb-2">Anotações</h4>
                    <p className="text-sm text-text-secondary leading-relaxed">{selectedHand.notes}</p>
                  </UICard>
                )}

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1">
                    <Download size={14} /> Exportar
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1">
                    <Share2 size={14} /> Compartilhar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNewHandModal && (
          <NewHandModal onClose={() => setShowNewHandModal(false)} onSave={saveHand} />
        )}
      </AnimatePresence>
    </div>
  )
}
