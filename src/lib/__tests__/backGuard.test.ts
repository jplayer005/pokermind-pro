import { describe, it, expect } from 'vitest'
import { setBackGuard, backHandledByScreen } from '../backGuard'

describe('guarda do botão Voltar', () => {
  it('sem guarda, o Voltar segue o fluxo normal', () => {
    expect(backHandledByScreen()).toBe(false)
  })

  it('com guarda, devolve o que ela decidir e remove ao desmontar', () => {
    let calls = 0
    const off = setBackGuard(() => { calls++; return true })
    expect(backHandledByScreen()).toBe(true)
    expect(calls).toBe(1)
    off()
    expect(backHandledByScreen()).toBe(false)
  })

  it('remover uma guarda antiga não derruba a nova', () => {
    const offOld = setBackGuard(() => true)
    const offNew = setBackGuard(() => false)
    offOld()
    // a nova continua registrada (devolve false, mas ainda e chamada)
    let called = false
    offNew()
    setBackGuard(() => { called = true; return true })
    expect(backHandledByScreen()).toBe(true)
    expect(called).toBe(true)
  })
})
