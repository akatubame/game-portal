/// <reference lib="webworker" />
import { chooseMove } from '../game/evaluator'
import { chooseHardMove } from '../game/hardSearch'
import type { Difficulty, Position } from '../game/types'

self.onmessage = (event: MessageEvent<{ position: Position; difficulty: Difficulty }>) => {
  const { position, difficulty } = event.data
  const started = performance.now()
  const move = difficulty === 'hard'
    ? chooseHardMove(position, 2500).move
    : chooseMove(position, difficulty)
  const target = difficulty === 'easy' ? 180 : difficulty === 'normal' ? 700 : 0
  const wait = Math.max(0, target - (performance.now() - started))
  setTimeout(() => self.postMessage(move), wait)
}
