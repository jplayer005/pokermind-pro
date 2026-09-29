// ============================================================
// POKERMIND PRO - MESA JOGAVEL (treino contra bots)
// Cash 6-max, 9-max e Heads-up. Sit&Go e MTT entram na proxima fase.
// ============================================================
import { useMemo, useState } from 'react'
import { History, LogOut, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, Badge, SectionHeader } from '@/components/ui'
import PokerTableView from '@/components/table/PokerTableView'
import ActionBar from '@/components/table/ActionBar'
import HandLog from '@/components/table/HandLog'
import { useTableEngine, fmtChips, type Speed, type TableOptions } from '@/hooks/useTableEngine'
import { pickProfiles, profileOf } from '@/engine/bots/profiles'

const BB_CHIPS = 2 // 1 bb = 2 fichas, para permitir SB de 0,5 bb
const NAMES = ['Lucas', 'Marina', 'Rafa', 'Bia', 'Téo', 'Duda', 'Gui', 'Nina', 'Caio', 'Lia']

interface ModeDef {
  id: string
  label: string
  sub: string
  seats: number
}

const MODES: ModeDef[] = [
  { id: 'cash6', label: 'Cash 6-max', sub: 'Mesa clássica de 6, blinds 0,5/1', seats: 6 },
  { id: 'cash9', label: 'Cash 9-max', sub: 'Mesa cheia, ranges mais apertados', seats: 9 },
  { id: 'hu', label: 'Heads-up', sub: '1 contra 1, muitas decisões por minuto', seats: 2 },
]

const SPEEDS: { id: Speed; label: string }[] = [
  { id: 'slow', label: 'Lenta' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Rápida' },
]

interface Config {
  mode: ModeDef
  buyInBB: number
  speed: Speed
  autoNext: boolean
  showProfiles: boolean
}

interface Summary {
  label: string
  hands: number
  netBB: number
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs border transition-colors',
        active
          ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
          : 'bg-bg-elevated border-border-default text-text-secondary hover:border-border-strong',
      )}
    >
      {children}
    </button>
  )
}

export default function PlayTable() {
  const [config, setConfig] = useState<Config | null>(null)
  const [last, setLast] = useState<Summary | null>(null)

  // form do setup
  const [modeId, setModeId] = useState('cash6')
  const [buyInBB, setBuyInBB] = useState(100)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [autoNext, setAutoNext] = useState(true)
  const [showProfiles, setShowProfiles] = useState(true)

  if (config) {
    return (
      <TableGame
        key={`${config.mode.id}-${config.buyInBB}`}
        config={config}
        onExit={(s) => {
          setLast(s)
          setConfig(null)
        }}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <SectionHeader title="Jogar" subtitle="Mesa completa contra bots com estilos diferentes. Treine leitura e decisões em jogo." />

      {last && (
        <Card className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-text-muted">Última sessão, {last.label}</p>
            <p className="text-xs text-text-secondary">{last.hands} mãos</p>
          </div>
          <Badge variant={last.netBB >= 0 ? 'emerald' : 'crimson'} size="md">
            {last.netBB >= 0 ? '+' : ''}{last.netBB.toFixed(1)} bb
          </Badge>
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-text-muted font-body">Modo</p>
          <div className="grid gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setModeId(m.id)}
                className={cn(
                  'text-left p-3 rounded-xl border transition-colors',
                  m.id === modeId
                    ? 'bg-accent-gold/10 border-accent-gold/40'
                    : 'bg-bg-elevated border-border-default hover:border-border-strong',
                )}
              >
                <p className="text-sm font-display font-bold text-text-primary">{m.label}</p>
                <p className="text-[11px] text-text-muted">{m.sub}</p>
              </button>
            ))}
            {['Sit&Go', 'MTT'].map((t) => (
              <div key={t} className="p-3 rounded-xl border border-border-subtle bg-bg-base/50 opacity-60 flex items-center justify-between">
                <p className="text-sm font-display font-bold text-text-secondary">{t}</p>
                <Badge>em breve</Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-text-muted mb-2 font-body">Stack inicial</p>
          <div className="flex gap-2">
            {[50, 100, 200].map((b) => (
              <Chip key={b} active={b === buyInBB} onClick={() => setBuyInBB(b)}>{b} bb</Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-text-muted mb-2 font-body">Velocidade dos bots</p>
          <div className="flex gap-2">
            {SPEEDS.map((s) => (
              <Chip key={s.id} active={s.id === speed} onClick={() => setSpeed(s.id)}>{s.label}</Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip active={autoNext} onClick={() => setAutoNext((v) => !v)}>
            Próxima mão automática: {autoNext ? 'sim' : 'não'}
          </Chip>
          <Chip active={showProfiles} onClick={() => setShowProfiles((v) => !v)}>
            Mostrar estilo dos bots: {showProfiles ? 'sim' : 'não'}
          </Chip>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() =>
            setConfig({ mode: MODES.find((m) => m.id === modeId) as ModeDef, buyInBB, speed, autoNext, showProfiles })
          }
        >
          <Play size={16} /> Sentar na mesa
        </Button>
      </Card>
    </div>
  )
}

function TableGame({ config, onExit }: { config: Config; onExit: (s: Summary) => void }) {
  const [unit, setUnit] = useState<'bb' | 'chips'>('bb')
  const [logOpen, setLogOpen] = useState(false)
  const bb = BB_CHIPS

  const options: TableOptions = useMemo(() => {
    const buyIn = config.buyInBB * bb
    const bots = config.mode.seats - 1
    const profiles = pickProfiles(bots)
    const names = [...NAMES].sort(() => Math.random() - 0.5)
    // o heroi senta em um lugar sorteado; os bots preenchem o resto
    const heroSeat = Math.floor(Math.random() * config.mode.seats)
    let b = 0
    const players = Array.from({ length: config.mode.seats }, (_, i) =>
      i === heroSeat
        ? { name: 'Você', isHero: true, profile: 'tag', stack: buyIn }
        : { name: names[b], profile: profiles[b++], stack: buyIn },
    )
    return {
      players,
      cfg: { sb: 1, bb, ante: 0 },
      buyIn,
      speed: config.speed,
      autoNext: config.autoNext,
    }
    // configuracao fixa durante a sessao
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { game, archive, session, heroId, heroTurn, act, nextHand } = useTableEngine(options)
  const hero = game.seats[heroId]
  const waitingFor = game.toAct >= 0 ? game.seats[game.toAct] : null
  const result = game.over ? game.result : null
  const heroNet = result ? result.net[heroId] : 0
  const netBB = session.net / bb
  const logGames = game.handNumber > 0 && !archive.some((a) => a.handNumber === game.handNumber) ? [game, ...archive] : archive

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="gold">{config.mode.label}</Badge>
          <Badge>0,5/1</Badge>
          <Badge variant={netBB >= 0 ? 'emerald' : 'crimson'}>
            {netBB >= 0 ? '+' : ''}{netBB.toFixed(1)} bb
          </Badge>
          <span className="text-[11px] text-text-muted font-mono hidden sm:inline">{session.hands} mãos</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setUnit((u) => (u === 'bb' ? 'chips' : 'bb'))}
            className="px-2 py-1 rounded-lg text-[11px] font-mono border border-border-default text-text-secondary"
          >
            {unit === 'bb' ? 'bb' : 'fichas'}
          </button>
          <button
            aria-label="Histórico"
            onClick={() => setLogOpen(true)}
            className="p-1.5 rounded-lg border border-border-default text-text-secondary"
          >
            <History size={14} />
          </button>
          <button
            aria-label="Sair da mesa"
            onClick={() => onExit({ label: config.mode.label, hands: session.hands, netBB })}
            className="p-1.5 rounded-lg border border-border-default text-text-secondary"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <PokerTableView game={game} heroId={heroId} unit={unit} showProfiles={config.showProfiles} />

      <div className="min-h-[120px]">
        {heroTurn ? (
          <ActionBar game={game} unit={unit} onAct={act} />
        ) : result ? (
          <div className="space-y-2">
            <div
              className={cn(
                'rounded-xl border p-3 text-center',
                heroNet > 0
                  ? 'bg-accent-emerald/10 border-accent-emerald/30'
                  : heroNet < 0
                    ? 'bg-accent-crimson/10 border-accent-crimson/30'
                    : 'bg-bg-elevated border-border-default',
              )}
            >
              <p className="text-sm font-display font-bold text-text-primary">
                {heroNet > 0 ? 'Você ganhou' : heroNet < 0 ? 'Você perdeu' : 'Mão neutra'}{' '}
                {heroNet !== 0 && `${fmtChips(Math.abs(heroNet), bb, unit)}${unit === 'bb' ? ' bb' : ''}`}
              </p>
              {result.winners[0] && (
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {game.seats[result.winners[0].seat].isHero ? 'Você' : game.seats[result.winners[0].seat].name}
                  {result.winners[0].handName ? `: ${result.winners[0].handName}` : ' leva o pote'}
                </p>
              )}
            </div>
            {game.gameOver ? (
              <p className="text-xs text-center text-text-muted">Mesa encerrada.</p>
            ) : (
              <Button variant="primary" size="lg" className="w-full" onClick={nextHand}>
                Próxima mão
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border-default bg-bg-elevated/60 p-4 text-center text-xs text-text-secondary">
            {hero?.folded
              ? 'Você deu fold. Acompanhe a mão.'
              : waitingFor
                ? `Aguardando ${waitingFor.name}${profileOf(waitingFor.profile) && config.showProfiles ? ` (${profileOf(waitingFor.profile).label})` : ''}...`
                : 'Distribuindo...'}
          </div>
        )}
      </div>

      {logOpen && <HandLog games={logGames} unit={unit} onClose={() => setLogOpen(false)} />}
    </div>
  )
}
