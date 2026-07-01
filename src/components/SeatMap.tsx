import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { BidAllocation, SeatTier } from '../game/types';
import { palette, seatAccents, spacing } from '../utils/theme';

interface SeatMapProps {
  /** Player's current bid per tier (used to light up the arc). */
  allocation: BidAllocation;
  /** Total credits the player has — used to scale the lit fraction. */
  credits: number;
  /** Tier the player has "won" (post-auction). Lights up with a gold halo. */
  wonSeatTier?: SeatTier | null;
  /** Aspect-locked height. The width fills the container. */
  width?: number;
  height?: number;
}

const VIEW_W = 320;
const VIEW_H = 200;

// Stadium geometry — three concentric ellipses representing tiers,
// stage as a glowing horizontal slab at the bottom.
const STAGE_Y = 178;
const STAGE_W = 200;

const TIERS: Array<{
  tier: SeatTier;
  rx: number;
  ry: number;
  cy: number;
  rowCount: number;
  label: string;
}> = [
  { tier: 'upper', rx: 150, ry: 96, cy: 165, rowCount: 4, label: 'UPPER DECK' },
  { tier: 'mid', rx: 122, ry: 76, cy: 165, rowCount: 3, label: 'MID LEVEL' },
  { tier: 'front', rx: 92, ry: 56, cy: 165, rowCount: 2, label: 'FRONT ROW' },
];

interface ArcDot {
  x: number;
  y: number;
}

/**
 * Sample dots along the upper half of an ellipse (the audience-facing arc).
 * `count` is per row; `rows` stack the same arc with growing radii so the
 * seating depth reads visually.
 */
function buildArcDots(cx: number, cy: number, rx: number, ry: number, count: number): ArcDot[] {
  const dots: ArcDot[] = [];
  for (let index = 0; index < count; index += 1) {
    const t: number = index / (count - 1);
    // sweep 200° -> 340° (upper arc, slightly inset from horizon)
    const angle: number = Math.PI * (1.1 + 0.8 * t);
    dots.push({
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    });
  }
  return dots;
}

/**
 * Stylized stadium cross-section. Three arcs fan above the stage, each
 * arc made of small seat dots so the audience reads as a real venue,
 * not a sandwich diagram. Active tier lights up; won tier glows.
 */
export function SeatMap({
  allocation,
  credits,
  wonSeatTier,
  width,
  height,
}: SeatMapProps): React.JSX.Element {
  const intensity = (tier: SeatTier): number => {
    if (credits <= 0) {
      return 0;
    }
    return Math.min(1, allocation[tier] / Math.max(1, credits));
  };

  const cx: number = VIEW_W / 2;

  return (
    <View style={styles.wrap}>
      <Svg width={width ?? '100%'} height={height ?? 200} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Defs>
          <RadialGradient id="venueGlow" cx="50%" cy="100%" r="80%">
            <Stop offset="0" stopColor={palette.purple} stopOpacity="0.45" />
            <Stop offset="1" stopColor={palette.ink900} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="stageGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.yellow} stopOpacity="1" />
            <Stop offset="1" stopColor={palette.yellowDeep} stopOpacity="0.7" />
          </LinearGradient>
          <RadialGradient id="stageBeam" cx="50%" cy="100%" r="55%">
            <Stop offset="0" stopColor={palette.yellow} stopOpacity="0.4" />
            <Stop offset="1" stopColor={palette.yellow} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Venue glow background */}
        <Rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#venueGlow)" />

        {/* Spotlight beam from stage */}
        <Path
          d={`M ${cx - STAGE_W / 2 + 20} ${STAGE_Y} L ${cx - 60} 0 L ${cx + 60} 0 L ${cx + STAGE_W / 2 - 20} ${STAGE_Y} Z`}
          fill="url(#stageBeam)"
          opacity={0.7}
        />

        {/* Seat tiers — outer first so inner draws on top */}
        {TIERS.map((tierDef) => {
          const lit: number = intensity(tierDef.tier);
          const accent = seatAccents[tierDef.tier];
          const isWon: boolean = wonSeatTier === tierDef.tier;
          const fillOpacity: number = Math.max(0.05, lit * 0.5);

          return (
            <React.Fragment key={tierDef.tier}>
              {/* Tier base band */}
              <Ellipse
                cx={cx}
                cy={tierDef.cy}
                rx={tierDef.rx}
                ry={tierDef.ry}
                fill={accent.line}
                fillOpacity={fillOpacity}
                stroke={accent.line}
                strokeWidth={isWon ? 2.5 : 1}
                strokeOpacity={isWon ? 1 : 0.5 + lit * 0.5}
              />
              {/* Seat dot rows along the audience-facing arc */}
              {Array.from({ length: tierDef.rowCount }).map((_, rowIndex) => {
                const ringRx: number = tierDef.rx * (0.74 + rowIndex * 0.08);
                const ringRy: number = tierDef.ry * (0.74 + rowIndex * 0.08);
                const dotCount: number = 14 + rowIndex * 3;
                return buildArcDots(cx, tierDef.cy, ringRx, ringRy, dotCount).map((dot, dotIndex) => (
                  <Circle
                    key={`${tierDef.tier}-${rowIndex}-${dotIndex}`}
                    cx={dot.x}
                    cy={dot.y}
                    r={1.5}
                    fill={accent.line}
                    fillOpacity={0.4 + lit * 0.55}
                  />
                ));
              })}
            </React.Fragment>
          );
        })}

        {/* Stage slab */}
        <Rect
          x={cx - STAGE_W / 2}
          y={STAGE_Y - 4}
          width={STAGE_W}
          height={14}
          rx={3}
          fill="url(#stageGrad)"
        />
        {/* Stage shadow */}
        <Ellipse cx={cx} cy={STAGE_Y + 14} rx={STAGE_W / 2 - 6} ry={3} fill="#000" opacity={0.6} />
      </Svg>

      {/* Tier labels rendered as plain text so they stay crisp at any size */}
      <View style={styles.labels} pointerEvents="none">
        {TIERS.slice()
          .reverse()
          .map((tier) => {
            const lit: number = intensity(tier.tier);
            const accent = seatAccents[tier.tier];
            const isWon: boolean = wonSeatTier === tier.tier;
            return (
              <View key={tier.tier} style={styles.labelRow}>
                <View
                  style={[
                    styles.labelDot,
                    {
                      backgroundColor: accent.line,
                      opacity: isWon ? 1 : 0.35 + lit * 0.5,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.labelText,
                    { color: isWon ? accent.label : palette.textMed, opacity: isWon ? 1 : 0.65 + lit * 0.35 },
                  ]}
                >
                  {tier.label}
                </Text>
              </View>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: VIEW_W / VIEW_H,
    overflow: 'hidden',
  },
  labels: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.sm,
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
});
