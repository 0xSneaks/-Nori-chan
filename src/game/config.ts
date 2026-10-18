/** Logical playfield (portrait). Rendering scales this to the screen. */
export const VIEW_W = 360;
export const VIEW_H = 640;

/** Street area between the shop fronts. */
export const STREET_LEFT = 45;
export const STREET_RIGHT = 315;
export const LANE_COUNT = 3;
export const LANE_X: readonly number[] = [90, 180, 270];

export const PLAYER_Y = 520;
export const PLAYER_R = 22;
/** Seconds for a lane switch to visually settle (logic lane changes instantly). */
export const LANE_SWITCH_TIME = 0.12;

export const JUMP_DURATION = 0.6;
export const JUMP_HEIGHT = 70;
/** Above this height Koinu clears low obstacles and wasabi. */
export const JUMP_CLEAR_Z = 18;

export const RUN_SECONDS = 60;
export const START_SPEED = 250; // px/s
export const MAX_SPEED = 440; // px/s
/** Distance in px between spawned rows. */
export const ROW_SPACING = 120;
/** Rows spawn above the tallest supported view so they never pop in on screen. */
export const SPAWN_Y = -230;
/** Tall phones see up to this much extra street above the standard 360x640 field. */
export const MAX_EXTRA_VIEW = 180;
export const DESPAWN_Y = VIEW_H + 60;

export const STUN_SECONDS = 0.7;
/** Speed multiplier while stunned. */
export const STUN_SLOW = 0.55;
export const INVULN_SECONDS = 1.2;

export const COMBO_WINDOW = 2.4; // seconds without a pickup before the combo drops
export const COMBO_STEP = 5; // pickups per multiplier step
export const COMBO_STEP_BONUS = 0.5;
export const MAX_MULTIPLIER = 4;

export const MAGNET_SECONDS = 5;
export const MAGNET_RADIUS = 120;
export const TIME_BONUS_SECONDS = 3;
export const MAX_TIME_BONUSES = 3;

/** Festival bonus stages: start times (seconds elapsed) and length. */
export const FESTIVAL_BONUS_STARTS: readonly number[] = [18, 40];
export const FESTIVAL_BONUS_SECONDS = 5;

export type SushiKind = 'maguro' | 'salmon' | 'tamago' | 'maki' | 'ikura' | 'golden';

export const SUSHI_POINTS: Readonly<Record<SushiKind, number>> = {
  maguro: 10,
  salmon: 12,
  tamago: 8,
  maki: 15,
  ikura: 25,
  golden: 50,
};

export const HIT_PENALTY = 15;
