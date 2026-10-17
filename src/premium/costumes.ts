/** Festival cosmetics. Purely visual — they never change hitboxes, speed or scoring. */
export type CostumeId = 'none' | 'hachimaki' | 'happi' | 'kitsune' | 'yukata' | 'chochin';

export interface Costume {
  id: CostumeId;
  name: string;
  jp: string;
  /** Best festival score needed to unlock (0 = available immediately with festival access). */
  unlockScore: number;
}

export const COSTUMES: readonly Costume[] = [
  { id: 'none', name: 'Just Koinu', jp: 'そのまま', unlockScore: 0 },
  { id: 'hachimaki', name: 'Sushi-chef headband', jp: 'はちまき', unlockScore: 0 },
  { id: 'happi', name: 'Festival happi coat', jp: 'はっぴ', unlockScore: 2000 },
  { id: 'kitsune', name: 'Fox mask', jp: 'きつねのおめん', unlockScore: 4000 },
  { id: 'yukata', name: 'Yukata ribbon', jp: 'ゆかたリボン', unlockScore: 6500 },
  { id: 'chochin', name: 'Lantern hat', jp: 'ちょうちんぼうし', unlockScore: 9000 },
];

export function unlockedCostumes(bestFestivalScore: number): CostumeId[] {
  return COSTUMES.filter((c) => bestFestivalScore >= c.unlockScore).map((c) => c.id);
}

export function isCostumeId(v: string): v is CostumeId {
  return COSTUMES.some((c) => c.id === v);
}
