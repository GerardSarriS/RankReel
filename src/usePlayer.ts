import { useSyncExternalStore } from 'react'
import { player } from './engine/Player'

export const usePlayerTime = () => useSyncExternalStore(player.subscribe, player.getTime)
export const usePlayerPlaying = () => useSyncExternalStore(player.subscribe, player.isPlaying)
export const usePlayerMuted = () => useSyncExternalStore(player.subscribe, player.isMuted)
export const usePlayerDuration = () => useSyncExternalStore(player.subscribe, player.getDuration)
