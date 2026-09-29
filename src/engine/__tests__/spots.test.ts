import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { buildBank, loadSpots } from '../spots'
import { FORMATOS, spotRefs, nearestStack, posDisplay, spotAleatorio, formatoPorId } from '../spotCatalog'
import { gradePushFold, explainPushFold } from '../coach/pushfold'
import { mulberry32 } from '../cards'

const COMBOS = (h: string) => (h[0] === h[1] ? 6 : h.endsWith('s') ? 4 : 12)

describe('banco de spots empacotado', () => {
  it('tem os 2574 spots e o catalogo cobre todos', async () => {
    const bank = await loadSpots()
    expect(bank.size).toBe(2574)
    let cobertos = 0
    for (const f of FORMATOS) {
      for (const stack of f.stacks) {
        for (const ref of spotRefs(f, stack)) {
          const s = bank.get(ref.id)
          expect(s, `faltou ${ref.id}`).toBeDefined()
          expect(s!.acao).toBe(ref.acao)
          cobertos++
        }
      }
    }
    expect(cobertos).toBe(2574)
  })

  it('pct bate com a media de frequencias ponderada por combos (tolerancia da quantizacao)', async () => {
    const bank = await loadSpots()
    const all169: string[] = []
    const R = 'AKQJT98765432'
    for (let i = 0; i < 13; i++)
      for (let j = i; j < 13; j++) {
        if (i === j) all169.push(R[i] + R[j])
        else all169.push(R[i] + R[j] + 's', R[i] + R[j] + 'o')
      }
    for (const id of ['HU:2:SB', 'HU:10:BB', '6max:10:BTN', 'sng9_top2:5:BB_vs_CO']) {
      const s = bank.get(id)!
      const pct = (all169.reduce((a, h) => a + s.freq(h) * COMBOS(h), 0) / 1326) * 100
      expect(Math.abs(pct - s.pct), id).toBeLessThan(1)
    }
  })

  const SRC = 'C:/Users/desen/Documents/Apps/Poker/treinador-poker/poker-generator/builder/linhas_supabase.json'
  it.skipIf(!existsSync(SRC))('decodificado fica a 1/63 do JSON original em todos os spots', async () => {
    const rows = JSON.parse(readFileSync(SRC, 'utf8')) as { id: string; pct: number; range: Record<string, number> }[]
    const bank = await loadSpots()
    for (const r of rows) {
      const s = bank.get(r.id)!
      expect(s.pct).toBe(r.pct)
      for (const [h, f] of Object.entries(r.range)) {
        expect(Math.abs(s.freq(h) - f)).toBeLessThanOrEqual(1 / 63)
      }
    }
  }, 60_000)

  it('buildBank: mao desconhecida vale 0 e id inexistente e undefined', () => {
    const bank = buildBank({ v: 1, hands: ['AA'], spots: { x: ['p', 1, 'A'] } })
    expect(bank.get('x')!.freq('KK')).toBe(0)
    expect(bank.get('nada')).toBeUndefined()
  })
})

describe('catalogo', () => {
  it('nearestStack arredonda para baixo na grade', () => {
    expect(nearestStack(1)).toBe(2)
    expect(nearestStack(11)).toBe(10)
    expect(nearestStack(18)).toBe(15)
    expect(nearestStack(100)).toBe(25)
  })
  it('nomes de posicao do banco viram os da mesa', () => {
    expect(posDisplay('UTG1')).toBe('UTG+1')
    expect(posDisplay('MP')).toBe('UTG+2')
    expect(posDisplay('BTN')).toBe('BTN')
  })
  it('spotAleatorio respeita o stack e o formato', () => {
    const f = formatoPorId('9max')
    for (let i = 0; i < 50; i++) {
      const { ref, stack } = spotAleatorio(f, 10, mulberry32(i))
      expect(stack).toBe(10)
      expect(ref.id.startsWith('9max:10:')).toBe(true)
    }
  })
})

describe('nota do coach push/fold', () => {
  it('72o UTG 6max 10bb: shove e erro, fold e certo', async () => {
    const s = (await loadSpots()).get('6max:10:UTG')!
    expect(gradePushFold(s, '72o', true).grade).toBe('mistake')
    expect(gradePushFold(s, '72o', false).grade).toBe('correct')
  })
  it('AA all-in em 6max 10bb UTG e certo; foldar e erro', async () => {
    const s = (await loadSpots()).get('6max:10:UTG')!
    expect(gradePushFold(s, 'AA', true).grade).toBe('correct')
    expect(gradePushFold(s, 'AA', false).grade).toBe('mistake')
  })
  it('spot dividido: a acao minoritaria e aceitavel, nao erro', async () => {
    const bank = await loadSpots()
    let achou = false
    for (const id of bank.ids()) {
      const s = bank.get(id)!
      for (const h of ['A5s', 'K9o', '66', 'T8s', 'Q9s', 'J7s', '98o', '44']) {
        const f = s.freq(h)
        if (f > 0.1 && f < 0.45) {
          expect(gradePushFold(s, h, true).grade).toBe('acceptable')
          expect(gradePushFold(s, h, true).mixed).toBe(true)
          expect(gradePushFold(s, h, false).grade).toBe('correct')
          achou = true
        }
        if (achou) break
      }
      if (achou) break
    }
    expect(achou).toBe(true)
  })
  it('explicacao traz a jogada correta e a nota de ICM so quando ha ICM', async () => {
    const bank = await loadSpots()
    const hu = formatoPorId('hu')
    const ref = spotRefs(hu, 10)[0]
    const s = bank.get(ref.id)!
    const ev = gradePushFold(s, 'AA', true)
    const txt = explainPushFold(s, ref, hu, 10, 'AA', ev).join(' ')
    expect(txt).toContain('Jogada correta: ALL-IN')
    expect(txt).not.toContain('ICM')

    const sng = formatoPorId('sng6')
    const ref2 = spotRefs(sng, 10)[1]
    const s2 = bank.get(ref2.id)!
    const txt2 = explainPushFold(s2, ref2, sng, 10, 'AA', gradePushFold(s2, 'AA', true)).join(' ')
    expect(txt2).toContain('ICM')
  })
})
