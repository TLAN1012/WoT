import type { BattleResult, CampaignProgress } from './types'

const STORAGE_KEY = 'wot-campaign-progress-v1'

const DEFAULT_PROGRESS: CampaignProgress = {
  unlockedStage: 0,
  stars: {},
}

export function loadProgress(): CampaignProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...DEFAULT_PROGRESS, stars: {} }
    const parsed = JSON.parse(stored) as CampaignProgress
    return {
      unlockedStage: Number.isFinite(parsed.unlockedStage) ? parsed.unlockedStage : 0,
      stars: parsed.stars ?? {},
    }
  } catch {
    return { ...DEFAULT_PROGRESS, stars: {} }
  }
}

export function recordResult(result: BattleResult, stageIndex: number): CampaignProgress {
  const progress = loadProgress()
  if (result.victory) {
    progress.stars[result.stageId] = Math.max(progress.stars[result.stageId] ?? 0, result.stars)
    progress.unlockedStage = Math.max(progress.unlockedStage, stageIndex + 1)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  return progress
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function calculateStars(victory: boolean, rounds: number, swiftRound: number, fallenAllies: number): number {
  if (!victory) return 0
  return 1 + Number(rounds <= swiftRound) + Number(fallenAllies === 0)
}
