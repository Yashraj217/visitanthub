import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const LABELS = {
  pending:   'Pending',
  approved:  'In Progress',
  completed: 'Done',
  rejected:  'Cancelled',
};

export default function StatusBadge({ status }) {
  const theme = COLORS.status[status] || COLORS.status.pending;
  return (
    <View style={[s.badge, { backgroundColor: theme.bg }]}>
      <View style={[s.dot, { backgroundColor: theme.dot }]} />
      <Text style={[s.text, { color: theme.text }]}>
        {LABELS[status] || status}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5,
           paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  text:  { fontSize: 12, fontWeight: '600' },
});
