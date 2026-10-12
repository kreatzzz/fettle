export type EquipmentId =
  | "dumbbells" | "barbell" | "plates" | "ez-bar" | "kettlebell"
  | "rack" | "bench" | "pull-up-bar" | "dip-station" | "smith-machine"
  | "cable" | "lat-pulldown" | "leg-press" | "leg-curl" | "leg-extension"
  | "bands" | "ab-wheel" | "treadmill" | "bike" | "rower";

export type EquipmentGroup = "Free weights" | "Stations" | "Machines" | "Light & other" | "Cardio";

export const EQUIPMENT: Record<EquipmentId, { label: string; group: EquipmentGroup }> = {
  dumbbells: { label: "Dumbbells", group: "Free weights" },
  barbell: { label: "Barbell", group: "Free weights" },
  plates: { label: "Plates", group: "Free weights" },
  "ez-bar": { label: "EZ bar", group: "Free weights" },
  kettlebell: { label: "Kettlebell", group: "Free weights" },
  rack: { label: "Squat rack", group: "Stations" },
  bench: { label: "Bench", group: "Stations" },
  "pull-up-bar": { label: "Pull-up bar", group: "Stations" },
  "dip-station": { label: "Dip station", group: "Stations" },
  "smith-machine": { label: "Smith machine", group: "Stations" },
  cable: { label: "Cable station", group: "Machines" },
  "lat-pulldown": { label: "Lat pulldown", group: "Machines" },
  "leg-press": { label: "Leg press", group: "Machines" },
  "leg-curl": { label: "Leg curl", group: "Machines" },
  "leg-extension": { label: "Leg extension", group: "Machines" },
  bands: { label: "Resistance bands", group: "Light & other" },
  "ab-wheel": { label: "Ab wheel", group: "Light & other" },
  treadmill: { label: "Treadmill", group: "Cardio" },
  bike: { label: "Bike", group: "Cardio" },
  rower: { label: "Rower", group: "Cardio" },
};

export const EQUIPMENT_GROUPS: EquipmentGroup[] = ["Free weights", "Stations", "Machines", "Light & other", "Cardio"];

export type Place = { id: string; name: string; kind: "home" | "gym"; equipment: EquipmentId[] };

/** Presets pre-fill a place; the list stays editable. */
export const PLACE_PRESETS: { key: string; label: string; detail: string; kind: Place["kind"]; equipment: EquipmentId[] }[] = [
  { key: "none", label: "Bodyweight", detail: "No equipment", kind: "home", equipment: [] },
  { key: "minimal", label: "Minimal", detail: "Dumbbells and bands", kind: "home", equipment: ["dumbbells", "bands"] },
  { key: "home", label: "Home setup", detail: "Dumbbells, bench, bands", kind: "home", equipment: ["dumbbells", "bench", "bands", "pull-up-bar"] },
  {
    key: "gym",
    label: "Full gym",
    detail: "Everything",
    kind: "gym",
    equipment: (Object.keys(EQUIPMENT) as EquipmentId[]).filter((e) => e !== "ab-wheel"),
  },
];

export function presetEquipment(key: string): EquipmentId[] {
  return [...(PLACE_PRESETS.find((p) => p.key === key)?.equipment ?? [])];
}
