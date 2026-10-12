import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Card, Chip, ChoiceTile, Screen, SectionLabel, StatTile, Text, TextField, space, useTheme } from '@/design';
import { EQUIPMENT, EQUIPMENT_GROUPS, type EquipmentId } from '@/domain/equipment';
import { EXERCISES, isAvailable } from '@/domain/exercises';
import { GEAR_ICONS } from '@/features/flow/gear-icons';
import { useActivePlace, useApp } from '@/store/app-store';

const ALL = Object.keys(EQUIPMENT) as EquipmentId[];

export default function GearScreen() {
  const { colors } = useTheme();
  const profile = useApp((s) => s.profile);
  const places = useApp((s) => s.places);
  const setActive = useApp((s) => s.setActivePlace);
  const toggle = useApp((s) => s.toggleEquipment);
  const addPlace = useApp((s) => s.addPlace);
  const deletePlace = useApp((s) => s.deletePlace);
  const place = useActivePlace();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const unlocked = place ? EXERCISES.filter((e) => isAvailable(e, place.equipment)).length : 0;

  return (
    <Screen title="Gear" right={profile ? <Avatar name={profile.name} onPress={() => router.push('/profile')} /> : null}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginBottom: space[3] }}>
        {places.map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            selected={p.id === place?.id}
            onPress={() => setActive(p.id)}
            leading={<Ionicons name={p.kind === 'gym' ? 'business-outline' : 'home-outline'} size={14} color={p.id === place?.id ? colors.onInk : colors.text} />}
          />
        ))}
        <Chip label="Add place" onPress={() => setAdding(true)} leading={<Ionicons name="add" size={14} color={colors.text} />} />
      </View>

      {adding ? (
        <Card style={{ gap: space[4] }}>
          <TextField label="Place name" value={name} onChangeText={setName} placeholder="Office gym" />
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <Button
              label="Add"
              disabled={!name.trim()}
              onPress={() => {
                addPlace(name.trim(), /gym|club|fitness/i.test(name) ? 'gym' : 'home');
                setName('');
                setAdding(false);
              }}
              style={{ flex: 1 }}
            />
            <Button variant="secondary" label="Cancel" onPress={() => setAdding(false)} />
          </View>
        </Card>
      ) : null}

      {place ? (
        <>
          <View style={{ flexDirection: 'row', gap: space[4] }}>
            <StatTile label="Items" value={`${place.equipment.length}`} unit={`of ${ALL.length}`} category="body" />
            <StatTile label="Exercises unlocked" value={`${unlocked}`} unit={`of ${EXERCISES.length}`} category="training" />
          </View>

          {EQUIPMENT_GROUPS.map((group) => (
            <View key={group} style={{ gap: space[4], marginTop: space[4] }}>
              <SectionLabel>{group}</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space[3] }}>
                {ALL.filter((id) => EQUIPMENT[id].group === group).map((id) => (
                  <ChoiceTile
                    key={id}
                    compact
                    title={EQUIPMENT[id].label}
                    selected={place.equipment.includes(id)}
                    onPress={() => toggle(place.id, id)}
                    icon={(c) => <MaterialCommunityIcons name={GEAR_ICONS[id]} size={22} color={c} />}
                  />
                ))}
                {/* Spacers keep the last row aligned to the 3-column grid. */}
                {gridSpacers(ALL.filter((id) => EQUIPMENT[id].group === group).length)}
              </View>
            </View>
          ))}

          <Text variant="footnote" tone="secondary" style={{ textAlign: 'center', paddingHorizontal: space[6], marginTop: space[5] }}>
            Workouts at {place.name} only use what{'’'}s checked. Bodyweight moves are always available.
          </Text>
          {places.length > 1 ? <Button variant="destructive" label={`Remove ${place.name}`} onPress={() => deletePlace(place.id)} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

function gridSpacers(count: number, columns = 3) {
  const missing = (columns - (count % columns)) % columns;
  return Array.from({ length: missing }, (_, i) => <View key={`spacer-${i}`} style={{ width: '31%' }} />);
}
