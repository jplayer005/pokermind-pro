// Converte tabela_preflop.json (treinador-poker) no arquivo compacto do app.
// Uso: npx tsx scripts/build-equity-table.ts <caminho/tabela_preflop.json>
// Saida: src/data/spots/equity169.json  { v, hands: [169], q: base64 de Uint16 (equity x 10000) }
// t[A][B] = equity % da mao A contra a mao B (Monte Carlo). O ruido do MC quebra a simetria
// (e(A,B) + e(B,A) != 100): aqui a tabela e simetrizada e a diagonal vale 50.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const input = process.argv[2]
if (!input) {
  console.error('Uso: npx tsx scripts/build-equity-table.ts <tabela_preflop.json>')
  process.exit(1)
}

const raw: Record<string, Record<string, number>> = JSON.parse(readFileSync(input, 'utf8'))
const hands = Object.keys(raw)
if (hands.length !== 169) throw new Error(`Esperava 169 maos, veio ${hands.length}`)
for (const a of hands) {
  const row = raw[a]
  if (Object.keys(row).length !== 169) throw new Error(`Linha ${a} com ${Object.keys(row).length} colunas`)
  for (const b of hands) {
    const v = row[b]
    if (!(v >= 0 && v <= 100)) throw new Error(`Equity invalida em ${a} vs ${b}: ${v}`)
  }
}

const n = hands.length
const buf = Buffer.alloc(n * n * 2)
let maxAsym = 0
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    const ab = raw[hands[i]][hands[j]]
    const ba = raw[hands[j]][hands[i]]
    maxAsym = Math.max(maxAsym, Math.abs(ab + ba - 100))
    const sym = i === j ? 50 : (ab + (100 - ba)) / 2
    buf.writeUInt16LE(Math.round(sym * 100), (i * n + j) * 2)
  }
}

const out = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../src/data/spots/equity169.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ v: 1, hands, q: buf.toString('base64') }))
console.log(`OK: ${n}x${n} -> ${out} (assimetria maxima da origem: ${maxAsym.toFixed(2)} pontos)`)
