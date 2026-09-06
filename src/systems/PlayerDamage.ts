export type DamageSource = 'enemy-bullet' | 'bomb' | 'mine' | 'beam' | 'enemy-contact' | 'asteroid' | 'unknown';

export interface PlayerDamageContext {
  amount: number;
  source: DamageSource;
}

export type PlayerDamageResult =
  | { outcome: 'ignored'; source: DamageSource; hullDamage: 0 }
  | { outcome: 'absorbed'; source: DamageSource; hullDamage: 0 }
  | { outcome: 'damaged'; source: DamageSource; hullDamage: number }
  | { outcome: 'fatal'; source: DamageSource; hullDamage: number };

export type PlayerHitResult = Extract<PlayerDamageResult, { outcome: 'absorbed' | 'damaged' }>;
export type PlayerFatalResult = Extract<PlayerDamageResult, { outcome: 'fatal' }>;

export function normalizeDeathCause(value: unknown): DamageSource | null {
  switch (value) {
    case 'enemy-bullet':
    case 'bomb':
    case 'mine':
    case 'beam':
    case 'enemy-contact':
    case 'asteroid':
    case 'unknown':
      return value;
    default:
      return null;
  }
}
