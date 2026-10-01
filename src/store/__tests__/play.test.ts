import { describe, it, expect, beforeEach } from 'vitest'
import { TABLE_XP_DAILY_CAP, type PlaySession } from '@/engine/progress'

const stores = async () => {
  const m = await import('@/store')
  return { play: m.usePlayStore, user: m.useUserStore, training: m.useTrainingStore, max: m.MAX_PLAY_SESSIONS }
}

const sess = (i: number): PlaySession => ({
  id: `s${i}`, endedAt: i, modeId: 'cash6', label: 'Cash 6-max', hands: 5, netBB: 1, decisions: 4, correct: 3, leaks: 1,
})

describe('mesa alimenta o progresso', () => {
  beforeEach(async () => {
    const { play, user, training } = await stores()
    play.getState().reset()
    const st = user.getState().profile.stats
    user.getState().updateStats({ xp: 0, level: 1, totalQuestions: 0, totalCorrect: 0, accuracy: 0, currentStreak: 0, lastStudyDate: '', lastStudyDates: [] })
    expect(st).toBeDefined()
    training.setState({ totalQuestionsToday: 0 })
  })

  it('credita XP, acertos, meta diaria e sequencia por mão', async () => {
    const { play, user, training } = await stores()
    play.getState().creditHand(['best', 'good', 'mistake'])
    const stats = user.getState().profile.stats
    expect(stats.xp).toBe(5)
    expect(stats.totalQuestions).toBe(3)
    expect(stats.totalCorrect).toBe(2)
    expect(stats.accuracy).toBeCloseTo(2 / 3, 6)
    expect(stats.currentStreak).toBeGreaterThanOrEqual(1)
    expect(training.getState().totalQuestionsToday).toBe(3)
  })

  it('mão sem decisões não muda nada', async () => {
    const { play, user } = await stores()
    play.getState().creditHand([])
    expect(user.getState().profile.stats.xp).toBe(0)
  })

  it('teto diário: depois de atingido, só conta na meta, sem XP', async () => {
    const { play, user, training } = await stores()
    // cada mão de 3 ótimas = 9 XP
    for (let i = 0; i < 30; i++) play.getState().creditHand(['best', 'best', 'best'])
    expect(user.getState().profile.stats.xp).toBe(TABLE_XP_DAILY_CAP)
    expect(training.getState().totalQuestionsToday).toBe(90)
  })

  it('guarda no máximo 50 sessões, as mais novas primeiro', async () => {
    const { play, max } = await stores()
    for (let i = 0; i < max + 5; i++) play.getState().recordSession(sess(i))
    const list = play.getState().sessions
    expect(list).toHaveLength(max)
    expect(list[0].id).toBe(`s${max + 4}`)
  })
})
