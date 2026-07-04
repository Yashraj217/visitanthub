import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS }  from '../constants/fonts';

export default function StatCard({ label, value, color, icon, onPress }) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={[s.card, { borderTopColor: color || COLORS.primary }]}
      onPress={onPress} activeOpacity={0.75}>
      <Text style={s.icon}>{icon}</Text>
      <Text style={[s.value, { color: color || COLORS.primary }]}>{value ?? '—'}</Text>
      <Text style={s.label}>{label}</Text>
      {onPress && <Text style={[s.tap, { color: color || COLORS.primary }]}>View →</Text>}
    </Container>
  );
}

const s = StyleSheet.create({
  card:  { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
           borderTopWidth: 3, alignItems: 'center',
           shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
           shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  icon:  { fontSize: 22, marginBottom: 6 },
  value: { fontSize: 28, fontFamily: FONTS.bold, marginBottom: 2 },
  label: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular, textAlign: 'center' },
  tap:   { fontSize: 11, fontFamily: FONTS.semiBold, marginTop: 6, opacity: 0.7 },
});
