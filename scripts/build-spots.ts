// Converte linhas_supabase.json (treinador-poker) no arquivo compacto do app.
// Uso: npx tsx scripts/build-spots.ts <caminho/linhas_supabase.json>
// Saida: src/data/spots/pushfold.json
//   { v, hands: [169 maos], spots: { id: [acao, pct, "169 chars"] } }
// Cada frequencia (0..1) vira 1 caractere base64 (0..63): erro maximo 1/126.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const EXPECTED_SPOTS = 2574

interface Row {
  id: string
  acao: 'push' | 'call'
  pct: number
  range: Record<string, number>
}

const input = process.argv[2]
if (!input) {
  console.error('Uso: npx tsx scripts/build-spots.ts <linhas_supabase.json>')
  process.exit(1)
}

const rows: Row[] = JSON.parse(readFileSync(input, 'utf8'))
if (rows.length !== EXPECTED_SPOTS) {
  throw new Error(`Esperava ${EXPECTED_SPOTS} spots, veio ${rows.length}`)
}

const hands = Object.keys(rows[0].range)
if (hands.length !== 169) throw new Error(`Primeiro spot tem ${hands.length} maos`)
const handSet = new Set(hands)

const spots: Record<string, [string, number, string]> = {}
for (const r of rows) {
  const keys = Object.keys(r.range)
  if (keys.length !== 169 || keys.some((k) => !handSet.has(k))) {
    throw new Error(`Spot ${r.id}: conjunto de maos diferente do primeiro`)
  }
  if (r.acao !== 'push' && r.acao !== 'call') throw new Error(`Spot ${r.id}: acao ${r.acao}`)
  if (spots[r.id]) throw new Error(`Spot duplicado: ${r.id}`)
  let enc = ''
  for (const h of hands) {
    const f = r.range[h]
    if (!(f >= 0 && f <= 1)) throw new Error(`Spot ${r.id} mao ${h}: freq ${f} fora de 0..1`)
    enc += ALPHABET[Math.round(f * 63)]
  }
  spots[r.id] = [r.acao === 'push' ? 'p' : 'c', r.pct, enc]
}

const out = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../src/data/spots/pushfold.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ v: 1, hands, spots }))
console.log(`OK: ${Object.keys(spots).length} spots -> ${out}`)
