import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Alert, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons }  from '@expo/vector-icons';
import { COLORS }    from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');
const FRAME = SW * 0.68;

// Accept both production and any other visitanthub origin (e.g. local dev)
const QR_PATTERN = /(?:https?:\/\/[^/]+)?\/visit\/([A-Za-z0-9_-]+)/;

export default function VisitorScanScreen({ navigation }) {
  const insets                = useSafeAreaInsets();
  const [permission, request] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLockRef           = useRef(false);  // prevents double-fire

  useEffect(() => {
    // Reset scan lock when screen comes back into focus (e.g. after going back from WebView)
    const unsub = navigation.addListener('focus', () => {
      scanLockRef.current = false;
      setScanned(false);
    });
    return unsub;
  }, [navigation]);

  function handleBarcode({ data }) {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScanned(true);

    const match = QR_PATTERN.exec(data);
    if (!match) {
      Alert.alert(
        'Not a VisitantHub QR',
        'Please scan the QR code displayed at the company reception.',
        [{ text: 'Try Again', onPress: () => { scanLockRef.current = false; setScanned(false); } }]
      );
      return;
    }

    const slug = match[1];
    const url  = `https://visitanthub.com/visit/${slug}`;
    navigation.navigate('VisitorWeb', { url, slug });
  }

  // ── Permission not yet determined ─────────────────────────────────────────
  if (!permission) {
    return <View style={s.root} />;
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[s.root, s.center]}>
        <Ionicons name="camera-off-outline" size={56} color={COLORS.textMuted} />
        <Text style={s.permTitle}>Camera Access Needed</Text>
        <Text style={s.permSub}>
          VisitantHub needs your camera to scan the QR code at the office entrance.
        </Text>
        <TouchableOpacity style={s.permBtn} onPress={request}>
          <Text style={s.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()}>
          <Text style={s.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Scanner ───────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      {/* Dark overlay — top */}
      <View style={[s.shade, { height: (SW - FRAME) / 2 }]} />

      {/* Middle row: left shade | frame | right shade */}
      <View style={{ flexDirection: 'row', height: FRAME }}>
        <View style={[s.shade, { width: (SW - FRAME) / 2 }]} />
        {/* Transparent scanning frame */}
        <View style={s.frame}>
          <View style={[s.corner, s.topLeft]} />
          <View style={[s.corner, s.topRight]} />
          <View style={[s.corner, s.bottomLeft]} />
          <View style={[s.corner, s.bottomRight]} />
        </View>
        <View style={[s.shade, { width: (SW - FRAME) / 2 }]} />
      </View>

      {/* Dark overlay — bottom */}
      <View style={[s.shade, { flex: 1 }]} />

      {/* ── UI chrome ──────────────────────────────────────────────────── */}

      {/* Header (back button + title) */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scan QR Code</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Instruction label below the frame */}
      <View style={s.labelWrap} pointerEvents="none">
        <Text style={s.labelText}>
          Point your camera at the QR code{'\n'}displayed at the office entrance
        </Text>
        {scanned && (
          <Text style={[s.labelText, { color: COLORS.success, marginTop: 8, fontWeight: '700' }]}>
            QR code detected ✓
          </Text>
        )}
      </View>
    </View>
  );
}

const CORNER = 24;
const BORDER = 3;

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#000' },
  center:      { justifyContent: 'center', alignItems: 'center', padding: 32 },
  shade:       { backgroundColor: 'rgba(0,0,0,0.62)' },
  frame:       {
    width: FRAME, height: FRAME,
    borderRadius: 4,
  },
  corner:      {
    position:   'absolute',
    width:      CORNER,
    height:     CORNER,
    borderColor: '#fff',
  },
  topLeft:     { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER,
                 borderTopLeftRadius: 6 },
  topRight:    { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER,
                 borderTopRightRadius: 6 },
  bottomLeft:  { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER,
                 borderBottomLeftRadius: 6 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER,
                 borderBottomRightRadius: 6 },

  // Header
  header:      { position: 'absolute', top: 0, left: 0, right: 0,
                 flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: 12, paddingBottom: 12 },
  closeBtn:    { width: 44, height: 44, borderRadius: 22,
                 backgroundColor: 'rgba(0,0,0,0.45)',
                 alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },

  // Instruction label
  labelWrap:   { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center' },
  labelText:   { color: 'rgba(255,255,255,0.85)', fontSize: 15,
                 textAlign: 'center', lineHeight: 22 },

  // Permission screen
  permTitle:   { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 20, textAlign: 'center' },
  permSub:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center',
                 marginTop: 10, marginBottom: 28, lineHeight: 20 },
  permBtn:     { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14,
                 borderRadius: 10 },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backLink:    { marginTop: 16 },
  backLinkText:{ color: COLORS.primary, fontSize: 14 },
});
