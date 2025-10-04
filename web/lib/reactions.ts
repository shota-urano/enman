export const REACTION_PRESETS = ['👍', '❤️', '🎉', '👇'] as const;

export const MAX_CUSTOM_REACTION_LENGTH = 6;

export function countEmojiUnits(value: string): number {
  return Array.from(value).length;
}
