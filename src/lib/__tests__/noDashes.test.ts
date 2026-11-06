import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Regra do projeto: nenhum travessao (U+2014) nem meia-risca (U+2013) em texto de interface, dados ou comentarios. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sources(p)
    return /\.(ts|tsx)$/.test(name) ? [p] : []
  })
}

describe('sem travessoes no codigo-fonte', () => {
  it('nenhum arquivo de src (fora dos testes) tem travessao ou meia-risca', () => {
    const offenders = sources('src').filter((f) => /[–—]/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
