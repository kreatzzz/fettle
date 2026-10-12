/**
 * Anatomical front and back figure. Every muscle is its own tappable region,
 * filled by estimated fatigue on the night stage. Artwork: ./art.ts.
 */
import { memo } from "react";
import { Platform, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { useTheme } from "@/design";
import type { FatigueLevel } from "@/domain/fatigue";
import type { MuscleId } from "@/domain/muscles";
import { BACK, BACK_OUTLINE, FRONT, FRONT_OUTLINE, type ArtRegion, type ArtSlug } from "./art";

const SLUG_TO_MUSCLE: Partial<Record<ArtSlug, MuscleId>> = {
  chest: "chest",
  obliques: "obliques",
  abs: "abs",
  biceps: "biceps",
  triceps: "triceps",
  neck: "neck",
  trapezius: "traps",
  deltoids: "shoulders",
  adductors: "adductors",
  quadriceps: "quads",
  tibialis: "tibialis",
  calves: "calves",
  forearm: "forearms",
  "upper-back": "upper-back",
  "lower-back": "lower-back",
  gluteal: "glutes",
  hamstring: "hamstrings",
};

/**
 * On web, react-native-svg turns onPress into RN responder props that React DOM
 * rejects on <g>. There the ref is a WebShape whose elementRef is the DOM node,
 * so attach a plain click handler to it instead.
 */
function pressProps(handler?: () => void): object {
  if (!handler) return {};
  if (Platform.OS !== "web") return { onPress: handler };
  return {
    ref: (el: unknown) => {
      type Dom = { onclick: (() => void) | null; style: { cursor: string } };
      const shape = el as { elementRef?: { current: Dom | null } } | null;
      const node = shape?.elementRef?.current;
      if (!node) return;
      node.onclick = handler;
      node.style.cursor = "pointer";
    },
  };
}

// Figure bounds inside the 724 × 1448 source canvas, trimmed to the body.
// Measured from the rendered paths: the back skull reaches y≈97, the feet y≈1351.
const FRONT_BOX = "40 85 644 1280";
const BACK_BOX = "764 85 644 1280";
const ASPECT = 644 / 1280;

type Props = {
  levels: Partial<Record<MuscleId, FatigueLevel>>;
  selected?: MuscleId | null;
  onSelect?: (m: MuscleId) => void;
  /** Figure height in points; width follows the body's aspect. */
  height?: number;
  side?: "both" | "front" | "back";
};

export const MuscleMap = memo(function MuscleMap({ levels, selected, onSelect, height = 340, side = "both" }: Props) {
  const width = height * ASPECT;
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
      {side !== "back" ? (
        <Figure regions={FRONT} outline={FRONT_OUTLINE} viewBox={FRONT_BOX} width={width} height={height} levels={levels} selected={selected} onSelect={onSelect} />
      ) : null}
      {side !== "front" ? (
        <Figure regions={BACK} outline={BACK_OUTLINE} viewBox={BACK_BOX} width={width} height={height} levels={levels} selected={selected} onSelect={onSelect} />
      ) : null}
    </View>
  );
});

function Figure({
  regions,
  outline,
  viewBox,
  width,
  height,
  levels,
  selected,
  onSelect,
}: Omit<Props, "height" | "side"> & { regions: ArtRegion[]; outline: string; viewBox: string; width: number; height: number }) {
  const { colors } = useTheme();
  const { stage, fatigue } = colors;
  const fillFor = (m: MuscleId) => fatigue[levels[m] ?? 0];
  const selectedRegions = selected ? regions.filter((r) => SLUG_TO_MUSCLE[r.slug] === selected) : [];

  return (
    <Svg width={width} height={height} viewBox={viewBox}>
      {/* Silhouette shows through the gaps between muscles as separation lines.
          Hair is drawn in the head color: on the back view it is the whole skull. */}
      <Path d={outline} fill={stage.outline} stroke={stage.outline} strokeWidth={6} />
      {regions.map((region) => {
        // The front hair cap draws a hairline we don't want; on the back it is the skull.
        if (region.slug === "hair" && regions === FRONT) return null;
        const muscle = SLUG_TO_MUSCLE[region.slug];
        if (!muscle) {
          return (
            <G key={region.slug}>
              {region.paths.map((d, i) => (
                <Path key={i} d={d} fill={region.slug === "head" || region.slug === "hair" ? stage.skin : stage.joint} />
              ))}
            </G>
          );
        }
        const dim = selected && selected !== muscle;
        return (
          <G key={region.slug} {...pressProps(onSelect ? () => onSelect(muscle) : undefined)} opacity={dim ? 0.55 : 1}>
            {region.paths.map((d, i) => (
              <Path key={i} d={d} fill={fillFor(muscle)} />
            ))}
          </G>
        );
      })}
      {selectedRegions.map((region) => (
        <G key={`sel-${region.slug}`} pointerEvents="none">
          {region.paths.map((d, i) => (
            <Path key={i} d={d} fill="none" stroke={stage.selected} strokeWidth={5} strokeLinejoin="round" />
          ))}
        </G>
      ))}
    </Svg>
  );
}
