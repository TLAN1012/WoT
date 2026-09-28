import type { HexCoord, TileDefinition } from './types'

export const hexKey = ({ q, r }: HexCoord): string => `${q},${r}`

export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

export function hexNeighbors(hex: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map(({ q, r }) => ({ q: hex.q + q, r: hex.r + r }))
}

export function createHexField(width: number, height: number, overrides: TileDefinition[]): TileDefinition[] {
  const overrideMap = new Map(overrides.map((tile) => [hexKey(tile), tile.terrain]))
  const tiles: TileDefinition[] = []

  for (let r = 0; r < height; r += 1) {
    for (let q = 0; q < width; q += 1) {
      tiles.push({ q, r, terrain: overrideMap.get(`${q},${r}`) ?? 'plain' })
    }
  }

  return tiles
}

export function reachableHexes(
  origin: HexCoord,
  movement: number,
  tiles: TileDefinition[],
  occupied: Set<string>,
): HexCoord[] {
  const tileMap = new Map(tiles.map((tile) => [hexKey(tile), tile]))
  const frontier: Array<{ hex: HexCoord; cost: number }> = [{ hex: origin, cost: 0 }]
  const bestCost = new Map<string, number>([[hexKey(origin), 0]])
  const reachable: HexCoord[] = []

  while (frontier.length > 0) {
    const current = frontier.shift()
    if (!current) break

    for (const neighbor of hexNeighbors(current.hex)) {
      const key = hexKey(neighbor)
      const tile = tileMap.get(key)
      if (!tile || tile.terrain === 'water' || occupied.has(key)) continue

      const cost = tile.terrain === 'marsh' ? movement : current.cost + 1
      if (cost > movement || cost >= (bestCost.get(key) ?? Number.POSITIVE_INFINITY)) continue

      bestCost.set(key, cost)
      frontier.push({ hex: neighbor, cost })
      reachable.push(neighbor)
    }
  }

  return reachable
}

export function shortestStep(
  origin: HexCoord,
  target: HexCoord,
  movement: number,
  tiles: TileDefinition[],
  occupied: Set<string>,
): HexCoord {
  const choices = reachableHexes(origin, movement, tiles, occupied)
  choices.push(origin)
  return choices.sort((a, b) => hexDistance(a, target) - hexDistance(b, target))[0] ?? origin
}
