// ============================================================
// POKERMIND PRO - MESA JOGAVEL (treino contra bots)
// Cash 6-max, 9-max e Heads-up; Sit&Go (6 e 9) e MTT (campo simulado).
// ============================================================
import { useMemo, useRef, useState } from 'react'
import { History, LogOut, Play, RotateCcw, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, Badge, SectionHeader } from '@/components/ui'
import PokerTableView from '@/components/table/PokerTableView'
import ActionBar from '@/components/table/ActionBar'
import HandLog from '@/components/table/HandLog'
import CoachToast from '@/components/table/CoachToast'
import HandReviewSheet from '@/components/table/HandReviewSheet'
import TournamentHeader from '@/components/table/TournamentHeader'
import BottomBarScreen from '@/components/layout/BottomBarScreen'
import { useElementHeight } from '@/hooks/useElementHeight'
import { useRunoutBoard } from '@/hooks/useRunoutBoard'
import { useTableEngine, fmtChips, type Speed, type CoachMode, type TableOptions } from '@/hooks/useTableEngine'
import { pickProfiles, profileOf } from '@/engine/bots/profiles'
import { isLeak } from '@/engine/coach/types'
import {
  mttConfig, sngConfig, startTournament, prizeInBuyIns, type TournamentConfig,
} from '@/engine/game/tournament'

const BB_CHIPS = 2 // cash: 1 bb = 2 fichas, para permitir SB de 0,5 bb
const NAMES = ['Lucas', 'Marina', 'Rafa', 'Bia', 'Téo', 'Duda', 'Gui', 'Nina', 'Caio', 'Lia']

interface ModeDef {
  id: string
  label: string
  sub: string
  seats: number
  tournament?: TournamentConfig
}

const CASH_MODES: ModeDef[] = [
  { id: 'cash6', label: 'Cash 6-max', sub: 'Mesa clássica de 6, blinds 0,5/1', seats: 6 },
  { id: 'cash9', label: 'Cash 9-max', sub: 'Mesa cheia, ranges mais apertados', seats: 9 },
  { id: 'hu', label: 'Heads-up', sub: '1 contra 1, muitas decisões por minuto', seats: 2 },
]

const TOURNEY_MODES: ModeDef[] = [
  { id: 'sng6', label: 'Sit&Go 6-max', sub: '6 jogadores, paga 2 (65/35), blinds sobem a cada 10 mãos', seats: 6, tournament: sngConfig(6) },
  { id: 'sng9', label: 'Sit&Go 9-max', sub: '9 jogadores, paga 2 (65/35), blinds sobem a cada 10 mãos', seats: 9, tournament: sngConfig(9) },
  { id: 'mtt27', label: 'MTT 27 jogadores', sub: '3 mesas simuladas, paga 4, mesa final e bolha', seats: 9, tournament: mttConfig(27) },
  { id: 'mtt54', label: 'MTT 54 jogadores', sub: '6 mesas simuladas, paga 8, mesa final e bolha', seats: 9, tournament: mttConfig(54) },
]

const MODES = [...CASH_MODES, ...TOURNEY_MODES]

const SPEEDS: { id: Speed; label: string }[] = [
  { id: 'slow', label: 'Lenta' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Rápida' },
]

const COACH_MODES: { id: CoachMode; label: string; hint: string }[] = [
  { id: 'live', label: 'Ao vivo', hint: 'Aviso rápido após cada jogada, sem interromper' },
  { id: 'after', label: 'Só revisão', hint: 'Sem avisos; você revisa a mão quando quiser' },
  { id: 'off', label: 'Desligado', hint: 'Jogo livre, sem notas' },
]

interface Config {
  mode: ModeDef
  buyInBB: number
  speed: Speed
  autoNext: boolean
  showProfiles: boolean
  coach: CoachMode
  showHud: boolean
  /** Segundos para agir; 0 = sem limite. */
  timebank: number
}

interface Summary {
  label: string
  hands: number
  /** Cash: saldo em bb. Torneio: texto do resultado. */
  netBB?: number
  result?: string
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

function ModeButton({ m, active, onClick }: { m: ModeDef; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left p-3 rounded-xl border transition-colors',
        active ? 'bg-accent-gold/10 border-accent-gold/40' : 'bg-bg-elevated border-border-default hover:border-border-strong',
      )}
    >
      <p className="text-sm font-display font-bold text-text-primary">{m.label}</p>
      <p className="text-[11px] text-text-muted">{m.sub}</p>
    </button>
  )
}

export default function PlayTable() {
  const [config, setConfig] = useState<Config | null>(null)
  const [last, setLast] = useState<Summary | null>(null)
  const [run, setRun] = useState(0)

  // form do setup
  const [modeId, setModeId] = useState('cash6')
  const [buyInBB, setBuyInBB] = useState(100)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [autoNext, setAutoNext] = useState(true)
  const [showProfiles, setShowProfiles] = useState(true)
  const [coach, setCoach] = useState<CoachMode>('live')
  const [showHud, setShowHud] = useState(true)
  const [timebank, setTimebank] = useState(0)

  const selected = MODES.find((m) => m.id === modeId) as ModeDef

  if (config) {
    return (
      <TableGame
        key={`${config.mode.id}-${config.buyInBB}-${run}`}
        config={config}
        onRestart={() => setRun((r) => r + 1)}
        onExit={(s) => {
          setLast(s)
          setConfig(null)
        }}
      />
    )
  }

  return (
    <BottomBarScreen
      bar={
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => setConfig({ mode: selected, buyInBB, speed, autoNext, showProfiles, coach, showHud, timebank })}
        >
          <Play size={16} /> Sentar na mesa
        </Button>
      }
    >
      <SectionHeader title="Jogar" subtitle="Mesa completa contra bots com estilos diferentes. Treine leitura e decisões em jogo." />

      {last && (
        <Card className="p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-text-muted">Última sessão, {last.label}</p>
            <p className="text-xs text-text-secondary">{last.hands} mãos{last.result ? `, ${last.result}` : ''}</p>
          </div>
          {last.netBB !== undefined && (
            <Badge variant={last.netBB >= 0 ? 'emerald' : 'crimson'} size="md">
              {last.netBB >= 0 ? '+' : ''}{last.netBB.toFixed(1)} bb
            </Badge>
          )}
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-text-muted font-body">Cash</p>
          <div className="grid gap-2">
            {CASH_MODES.map((m) => (
              <ModeButton key={m.id} m={m} active={m.id === modeId} onClick={() => setModeId(m.id)} />
            ))}
          </div>
          <p className="text-xs text-text-muted font-body pt-1">Torneios (turbo: os blinds sobem por número de mãos)</p>
          <div className="grid gap-2">
            {TOURNEY_MODES.map((m) => (
              <ModeButton key={m.id} m={m} active={m.id === modeId} onClick={() => setModeId(m.id)} />
            ))}
          </div>
        </div>

        {!selected.tournament && (
          <div>
            <p className="text-xs text-text-muted mb-2 font-body">Stack inicial</p>
            <div className="flex gap-2">
              {[50, 100, 200].map((b) => (
                <Chip key={b} active={b === buyInBB} onClick={() => setBuyInBB(b)}>{b} bb</Chip>
              ))}
            </div>
          </div>
        )}
        {selected.tournament && (
          <p className="text-[11px] text-text-muted">
            Todos começam com 1.500 fichas (75 bb). Buy-in = 1; prêmios em buy-ins. No MTT só a sua mesa é jogada: o resto do campo
            é simulado e a mesa se reabastece.
          </p>
        )}

        <div>
          <p className="text-xs text-text-muted mb-2 font-body">Velocidade dos bots</p>
          <div className="flex gap-2">
            {SPEEDS.map((s) => (
              <Chip key={s.id} active={s.id === speed} onClick={() => setSpeed(s.id)}>{s.label}</Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-text-muted mb-2 font-body">Tempo para agir</p>
          <div className="flex gap-2">
            {[0, 30, 15].map((t) => (
              <Chip key={t} active={t === timebank} onClick={() => setTimebank(t)}>
                {t === 0 ? 'Sem limite' : `${t}s`}
              </Chip>
            ))}
          </div>
          {timebank > 0 && (
            <p className="text-[11px] text-text-muted mt-1.5">
              Ao estourar o tempo o app dá check (ou fold, se houver aposta) e essa jogada não é avaliada.
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-text-muted mb-2 font-body">Coach</p>
          <div className="flex gap-2">
            {COACH_MODES.map((c) => (
              <Chip key={c.id} active={c.id === coach} onClick={() => setCoach(c.id)}>{c.label}</Chip>
            ))}
          </div>
          <p className="text-[11px] text-text-muted mt-1.5">{COACH_MODES.find((c) => c.id === coach)?.hint}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip active={autoNext} onClick={() => setAutoNext((v) => !v)}>
            Próxima mão automática: {autoNext ? 'sim' : 'não'}
          </Chip>
          <Chip active={showProfiles} onClick={() => setShowProfiles((v) => !v)}>
            Mostrar estilo dos bots: {showProfiles ? 'sim' : 'não'}
          </Chip>
          <Chip active={showHud} onClick={() => setShowHud((v) => !v)}>
            HUD dos bots: {showHud ? 'sim' : 'não'}
          </Chip>
        </div>

      </Card>
    </BottomBarScreen>
  )
}

function TableGame({
  config, onExit, onRestart,
}: { config: Config; onExit: (s: Summary) => void; onRestart: () => void }) {
  const [unit, setUnit] = useState<'bb' | 'chips'>('bb')
  const [logOpen, setLogOpen] = useState(false)

  const options: TableOptions = useMemo(() => {
    const base = {
      speed: config.speed,
      autoNext: config.autoNext,
      timebankSec: config.timebank,
      coach: config.coach,
      modeId: config.mode.id,
      modeLabel: config.mode.label,
    }
    if (config.mode.tournament) {
      const start = startTournament(config.mode.tournament, 'Você', () => pickProfiles(1)[0])
      return {
        ...base,
        players: start.players,
        cfg: start.cfg,
        buyIn: 0,
        tournament: { config: config.mode.tournament, initial: start.tour },
      }
    }
    const buyIn = config.buyInBB * BB_CHIPS
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
    return { ...base, players, cfg: { sb: 1, bb: BB_CHIPS, ante: 0 }, buyIn }
    // configuracao fixa durante a sessao
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { game, archive, session, heroId, heroTurn, act, nextHand, reviews, lastGrade, hud, saveReview, tour, timeLeft } =
    useTableEngine(options)
  // numero da mao aberta na revisao (null = fechada)
  const [reviewHand, setReviewHand] = useState<number | null>(null)
  const coachOn = config.coach !== 'off'
  const openReview = reviews.find((r) => r.game.handNumber === reviewHand) ?? null
  const latest = reviews[0]
  const latestLeaks = latest ? latest.decisions.filter((d) => isLeak(d.grade)).length : 0

  const bb = game.cfg.bb
  const hero = game.seats[heroId]
  const waitingFor = game.toAct >= 0 ? game.seats[game.toAct] : null
  const runout = useRunoutBoard(game)
  // durante o runout (all-in) o resultado espera o board terminar de sair
  const result = game.over && runout.done ? game.result : null
  const heroNet = result ? result.net[heroId] : 0
  const netBB = session.net / bb
  const logGames = game.handNumber > 0 && !archive.some((a) => a.handNumber === game.handNumber) ? [game, ...archive] : archive

  // resumo do torneio ao terminar (colocacao, premio, ROI)
  const place = tour?.heroPlace ?? null
  const prize = tour && place ? prizeInBuyIns(tour.config, place) : 0
  const tourText = tour && place ? `${place}º de ${tour.config.fieldSize}, prêmio ${prize.toFixed(2)} buy-ins` : undefined

  // A mesa ocupa o espaco que sobra entre o cabecalho e a barra de acoes (fixa na base).
  const areaRef = useRef<HTMLDivElement>(null)
  const areaH = useElementHeight(areaRef)

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full">
      <div className="shrink-0 px-4 pt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="gold">{config.mode.label}</Badge>
          {!tour && (
            <>
              <Badge>0,5/1</Badge>
              <Badge variant={netBB >= 0 ? 'emerald' : 'crimson'}>
                {netBB >= 0 ? '+' : ''}{netBB.toFixed(1)} bb
              </Badge>
            </>
          )}
          <span className="text-[11px] text-text-muted font-mono hidden sm:inline">{session.hands} mãos</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {coachOn && latest && (
            <button
              onClick={() => setReviewHand(latest.game.handNumber)}
              className={cn(
                'px-2 py-1 rounded-lg text-[11px] font-mono border',
                latestLeaks > 0
                  ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold'
                  : 'border-border-default text-text-secondary',
              )}
            >
              Revisar #{latest.game.handNumber}{latestLeaks > 0 ? ` (${latestLeaks})` : ''}
            </button>
          )}
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
            onClick={() =>
              onExit({ label: config.mode.label, hands: session.hands, netBB: tour ? undefined : netBB, result: tourText })
            }
            className="p-1.5 rounded-lg border border-border-default text-text-secondary"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {tour && <TournamentHeader tour={tour} game={game} heroId={heroId} />}
      </div>

      {/* espaco flexivel: a mesa se ajusta ao que sobra (28px = folga dos assentos do topo) */}
      <div ref={areaRef} className="flex-1 min-h-0 px-4 pt-5 flex items-center justify-center overflow-hidden">
        <PokerTableView
          game={game}
          heroId={heroId}
          unit={unit}
          showProfiles={config.showProfiles}
          hud={hud}
          showHud={config.showHud}
          availableHeight={Math.max(0, areaH - 28)}
          board={runout.board}
          revealDone={runout.done}
        />
      </div>

      {/* Barra de acao FIXA, sempre na mesma posicao, colada acima do menu inferior:
          o aviso do coach e as acoes nunca mudam de lugar entre as ruas. */}
      <div
        className="relative shrink-0 px-4 pt-1 pb-3 border-t border-border-subtle"
        style={{ backgroundColor: 'rgb(var(--c-bg-base))' }}
      >
      {/* contagem regressiva do timebank: linha sobre a borda da barra (nao muda a altura dela) */}
      {timeLeft !== null && config.timebank > 0 && (
        <>
          <div className="absolute -top-px inset-x-0 h-1 bg-white/10">
            <div
              className={cn('h-full transition-[width] duration-200', timeLeft <= 5 ? 'bg-accent-crimson' : 'bg-accent-gold')}
              style={{ width: `${Math.min(100, (timeLeft / config.timebank) * 100)}%` }}
            />
          </div>
          <span className={cn('absolute right-4 top-2 text-[10px] font-mono', timeLeft <= 5 ? 'text-accent-crimson' : 'text-text-muted')}>
            {Math.ceil(timeLeft)}s
          </span>
        </>
      )}
      {config.coach === 'live' && (
        <CoachToast
          last={lastGrade}
          onOpen={() => lastGrade && setReviewHand(lastGrade.d.handNumber)}
        />
      )}

      <div className="min-h-[64px]">
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

            {tour?.done && place ? (
              <div
                className={cn(
                  'rounded-xl border p-4 text-center space-y-1',
                  prize > 0 ? 'bg-accent-gold/10 border-accent-gold/40' : 'bg-bg-elevated border-border-default',
                )}
              >
                <Trophy size={20} className={cn('mx-auto', prize > 0 ? 'text-accent-gold' : 'text-text-muted')} />
                <p className="text-base font-display font-bold text-text-primary">
                  {place === 1 ? 'Campeão!' : `Você terminou em ${place}º`} de {tour.config.fieldSize}
                </p>
                <p className="text-xs text-text-secondary">
                  {prize > 0
                    ? `Prêmio: ${prize.toFixed(2)} buy-ins (resultado ${prize - 1 >= 0 ? '+' : ''}${(prize - 1).toFixed(2)})`
                    : `Fora do dinheiro (pagam ${tour.config.payouts.length})`}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button variant="primary" onClick={onRestart}>
                    <RotateCcw size={14} /> Jogar de novo
                  </Button>
                  <Button
                    onClick={() => onExit({ label: config.mode.label, hands: session.hands, result: tourText })}
                  >
                    Sair
                  </Button>
                </div>
              </div>
            ) : game.gameOver ? (
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
      </div>

      {logOpen && <HandLog games={logGames} unit={unit} onClose={() => setLogOpen(false)} />}
      {openReview && (
        <HandReviewSheet
          review={openReview}
          onClose={() => setReviewHand(null)}
          onSave={(flag) => saveReview(openReview.game.handNumber, flag)}
        />
      )}
    </div>
  )
}
