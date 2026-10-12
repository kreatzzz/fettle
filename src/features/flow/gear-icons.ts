import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { EquipmentId } from '@/domain/equipment';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

/** One glyph per piece of equipment, for the gear tiles. */
export const GEAR_ICONS: Record<EquipmentId, Icon> = {
  dumbbells: 'dumbbell',
  barbell: 'weight-lifter',
  plates: 'weight',
  'ez-bar': 'arm-flex',
  kettlebell: 'kettlebell',
  rack: 'gate',
  bench: 'bench',
  'pull-up-bar': 'human-handsup',
  'dip-station': 'human-handsdown',
  'smith-machine': 'table-furniture',
  cable: 'cable-data',
  'lat-pulldown': 'arrow-collapse-down',
  'leg-press': 'seat-recline-normal',
  'leg-curl': 'seat-flat',
  'leg-extension': 'seat-flat-angled',
  bands: 'infinity',
  'ab-wheel': 'tire',
  treadmill: 'run-fast',
  bike: 'bike',
  rower: 'rowing',
};
