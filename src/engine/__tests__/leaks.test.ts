import { describe, it, expect } from 'vitest'
import {
  recordDecision, rankLeaks, trend, dueLeaks, labelFor, drillTarget, leakRate, dateStr, type LeakStat,
} from '../coach/leaks'
import type { Grade } from '../coach/types'

const day = (s: string) => new Date(`${s}T12:00:00`)
const dec = (grade: Grade, ctx = 'PF_OPEN_HJ', ev: number | null = null) => ({
  ctx, tag: grade === 'best' || grade === 'good' ? '' : `${ctx}_TOO_LOOSE`, grade, evLossBB: ev,
})

function apply(seq: Grade[], ctx = 'PF_OPEN_HJ', start = '2026-10-01'): LeakStat {
  let s: LeakStat | undefined
  seq.forEach((g, i) => {
    const d = new Date(day(start).getTime() + i * 60_000)
    s = recordDecision(s, dec(g, ctx), d)
  })
  return s as LeakStat
}

describe('taxa de erro por contexto', () => {
  it('conta decisoes boas e ruins, com taxa correta', () => {
    const s = apply(['best', 'good', 'mistake', 'best', 'inaccuracy'])
    expect(s.n).toBe(5)
    expect(s.leaks).toBe(2)
    expect(leakRate(s)).toBeCloseTo(0.4, 10)
    expect(s.recent).toBe('00101')
    expect(s.lastTag).toBe('PF_OPEN_HJ_TOO_LOOSE')
  })

  it('so guarda as ultimas 20 e soma a perda estimada', () => {
    let s: LeakStat | undefined
    for (let i = 0; i < 30; i++) s = recordDecision(s, dec('mistake', 'POST_FLOP_FACING', 1.5), day('2026-10-01'))
    expect(s!.recent).toHaveLength(20)
    expect(s!.evLossBB).toBeCloseTo(45, 5)
  })

  it('perda nula/desconhecida nao entra na soma', () => {
    const s = recordDecision(undefined, dec('mistake', 'PF_OPEN_CO', null), day('2026-10-01'))
    expect(s.evLossBB).toBe(0)
  })
})

describe('ranking e tendencia', () => {
  it('amostra pequena e contextos sem vazamento ficam de fora; pior taxa vem primeiro', () => {
    const stats: Record<string, LeakStat> = {
      a: apply(['mistake', 'mistake', 'mistake', 'mistake', 'best', 'best', 'best', 'best', 'best', 'best'], 'PF_OPEN_UTG'),
      b: apply(['mistake', 'best', 'best', 'best', 'best', 'best', 'best', 'best', 'best', 'best'], 'PF_OPEN_CO'),
      c: apply(['best', 'best', 'best', 'best', 'best'], 'PF_OPEN_BTN'),
      d: apply(['mistake', 'mistake'], 'PF_OPEN_SB'), // n < 4
    }
    const r = rankLeaks(stats).map((s) => s.ctx)
    expect(r).toEqual(['PF_OPEN_UTG', 'PF_OPEN_CO'])
  })

  it('tendencia: melhorando, piorando e sem amostra', () => {
    const bad = Array<Grade>(10).fill('mistake')
    const good = Array<Grade>(10).fill('best')
    expect(trend(apply([...bad, ...good]))).toBe('down')
    expect(trend(apply([...good, ...bad]))).toBe('up')
    expect(trend(apply([...good, ...good]))).toBe('flat')
    expect(trend(apply(['mistake', 'best']))).toBeNull()
  })
})

describe('revisao espacada', () => {
  it('vazamento agenda revisao para amanha', () => {
    const s = recordDecision(undefined, dec('mistake'), day('2026-10-01'))
    expect(s.nextReview).toBe('2026-10-02')
    expect(dueLeaks({ x: s }, '2026-10-01')).toHaveLength(0)
    expect(dueLeaks({ x: s }, '2026-10-02')).toHaveLength(1)
  })

  it('acertar na hora da revisao dobra o intervalo; errar de novo volta para 1 dia', () => {
    let s = recordDecision(undefined, dec('mistake'), day('2026-10-01'))
    s = recordDecision(s, dec('best'), day('2026-10-02')) // revisao no dia certo
    expect(s.interval).toBe(2)
    expect(s.nextReview).toBe('2026-10-04')
    s = recordDecision(s, dec('best'), day('2026-10-04'))
    expect(s.interval).toBe(4)
    s = recordDecision(s, dec('mistake'), day('2026-10-08'))
    expect(s.interval).toBe(1)
    expect(s.nextReview).toBe('2026-10-09')
  })

  it('acertar antes da hora nao mexe no agendamento', () => {
    let s = recordDecision(undefined, dec('mistake'), day('2026-10-01'))
    s = recordDecision(s, dec('best'), day('2026-10-01'))
    expect(s.nextReview).toBe('2026-10-02')
    expect(s.interval).toBe(1)
  })

  it('contexto que nunca vazou nunca aparece para revisar', () => {
    const s = apply(['best', 'best', 'best', 'best'])
    expect(s.nextReview).toBe('')
    expect(dueLeaks({ x: s }, '2030-01-01')).toHaveLength(0)
  })

  it('dateStr usa a data local', () => {
    expect(dateStr(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05')
  })
})

describe('rotulos e destino do treino', () => {
  it('rotulos em portugues', () => {
    expect(labelFor('PF_OPEN_HJ')).toBe('Abrir o pote no HJ')
    expect(labelFor('PF_OPEN_BB')).toContain('Opção do BB')
    expect(labelFor('PF_VSRAISE_BB')).toBe('Defender o BB contra aumento')
    expect(labelFor('PF_VSRAISE_CO')).toBe('Responder a aumento no CO')
    expect(labelFor('PF_VS3BET_BTN')).toBe('Responder a 3-bet no BTN')
    expect(labelFor('POST_TURN_FACING')).toContain('turn')
    expect(labelFor('PF_PUSH_6max_UTG1_10BB')).toBe('Push/fold 6-max, UTG+1, 10bb')
    expect(labelFor('PF_CALLSHOVE_sng6_BB_5BB')).toBe('Pagar all-in 6-max SNG, BB, 5bb')
    expect(labelFor('QUALQUER')).toBe('QUALQUER')
  })

  it('cada tipo leva ao treino certo', () => {
    expect(drillTarget('PF_PUSH_6max_UTG_10BB')).toEqual({
      path: '/pushfold', state: { formatId: '6max', stack: 10, autoStart: true },
    })
    expect(drillTarget('PF_OPEN_CO').state).toMatchObject({ scenario: 'open_raise', autoStart: true })
    expect(drillTarget('PF_VSRAISE_BB').state).toMatchObject({ scenario: 'bb_defense' })
    expect(drillTarget('PF_VSRAISE_HJ').state).toMatchObject({ scenario: 'vs_raise' })
    expect(drillTarget('PF_VS3BET_CO').state).toMatchObject({ scenario: '4bet' })
    expect(drillTarget('POST_RIVER_OPEN')).toEqual({ path: '/postflop', state: null })
  })
})
