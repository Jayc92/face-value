/**
 * League visual identity. Each league gets a mark (single typographic glyph
 * shown inside a panel), an accent color, and a tagline. We deliberately
 * avoid emoji to keep the surface looking like a real event brand.
 */
import { League } from '../game/types';
import { palette } from './theme';

export interface LeagueVisual {
  mark: string;
  accent: string;
  accentSoft: string;
  tagline: string;
}

export const LEAGUE_VISUALS: Record<League, LeagueVisual> = {
  rock: {
    mark: 'RK',
    accent: palette.pink,
    accentSoft: 'rgba(255, 45, 120, 0.16)',
    tagline: 'Distortion. Decibels. Front row.',
  },
  hiphop: {
    mark: 'HH',
    accent: palette.yellow,
    accentSoft: 'rgba(255, 233, 77, 0.14)',
    tagline: 'The cypher never sleeps.',
  },
  pop: {
    mark: 'P★',
    accent: palette.pinkSoft,
    accentSoft: 'rgba(255, 107, 161, 0.18)',
    tagline: 'Stadium hooks, neon lights.',
  },
  country: {
    mark: 'CN',
    accent: palette.warning,
    accentSoft: 'rgba(255, 170, 61, 0.16)',
    tagline: 'Dust on the boots, song in the air.',
  },
  sports: {
    mark: 'SP',
    accent: palette.purple,
    accentSoft: 'rgba(123, 77, 255, 0.18)',
    tagline: 'Buzzer-beaters and bad calls.',
  },
};
