import type { SushiKind } from './config';

export interface Phrase {
  jp: string;
  romaji: string;
  en: string;
}

export const PHRASES = {
  ready: { jp: 'よーい、どん！', romaji: 'Yōi, don!', en: 'Ready, go!' },
  oishii: { jp: 'おいしい！', romaji: 'Oishii!', en: 'Yummy!' },
  sugoi: { jp: 'すごい！', romaji: 'Sugoi!', en: 'Amazing!' },
  yatta: { jp: 'やった！', romaji: 'Yatta!', en: 'I did it!' },
  saikou: { jp: 'さいこう！', romaji: 'Saikō!', en: 'The best!' },
  karai: { jp: 'からい！', romaji: 'Karai!', en: 'Spicy!' },
  itai: { jp: 'いたい！', romaji: 'Itai!', en: 'Ouch!' },
  ganbatte: { jp: 'がんばって！', romaji: 'Ganbatte!', en: 'Do your best!' },
  otsukare: { jp: 'おつかれさま！', romaji: 'Otsukaresama!', en: 'Great work!' },
  matsuri: { jp: 'おまつりだ！', romaji: 'Omatsuri da!', en: "It's festival time!" },
  suzu: { jp: 'すず！', romaji: 'Suzu!', en: 'Bell!' },
  jikan: { jp: 'じかん＋3', romaji: 'Jikan +3', en: '+3 seconds!' },
  pause: { jp: 'ひとやすみ', romaji: 'Hitoyasumi', en: 'Taking a break' },
} as const satisfies Record<string, Phrase>;

export function comboPhrase(combo: number): Phrase {
  if (combo >= 75) return PHRASES.saikou;
  if (combo >= 50) return PHRASES.yatta;
  if (combo >= 20) return PHRASES.sugoi;
  return PHRASES.oishii;
}

export const SUSHI_NAMES: Readonly<Record<SushiKind, { jp: string; en: string }>> = {
  maguro: { jp: 'まぐろ', en: 'Tuna nigiri' },
  salmon: { jp: 'サーモン', en: 'Salmon nigiri' },
  tamago: { jp: 'たまご', en: 'Sweet egg' },
  maki: { jp: 'まきずし', en: 'Maki roll' },
  ikura: { jp: 'いくら', en: 'Salmon roe' },
  golden: { jp: 'きんのすし', en: 'Golden sushi' },
};
