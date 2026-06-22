import { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, BackHandler,
} from 'react-native';
import { WebView }      from 'react-native-webview';
import { Ionicons }     from '@expo/vector-icons';
import { COLORS }       from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback }  from 'react';

export default function VisitorWebScreen({ navigation, route }) {
  const { url, slug }  = route.params;
  const insets         = useSafeAreaInsets();
  const webRef         = useRef(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // Handle Android hardware back — navigate within WebView if possible
  useFocusEffect(useCallback(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [canGoBack]));

  function handleClose() {
    // Go back to scanner
    navigation.goBack();
  }

  if (error) {
    return (
      <View style={[s.root, s.center]}>
        <Ionicons name="wifi-outline" size={56} color={COLORS.textMuted} />
        <Text style={s.errTitle}>Couldn't load the form</Text>
        <Text style={s.errSub}>
          Check your internet connection and try again.
        </Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => { setError(false); setLoading(true); webRef.current?.reload(); }}>
          <Text style={s.retryText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.backLink} onPress={handleClose}>
          <Text style={s.backLinkText}>← Scan a different QR code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 6 }]}>
        {canGoBack ? (
          <TouchableOpacity style={s.headerBtn} onPress={() => webRef.current?.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.headerBtn} onPress={handleClose}>
            <Ionicons name="close" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle} numberOfLines={1}>Visitor Check-In</Text>
        <TouchableOpacity style={s.headerBtn} onPress={handleClose}>
          <Ionicons name="scan-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Progress bar while loading */}
      {loading && (
        <View style={s.progressBar}>
          <View style={s.progressFill} />
        </View>
      )}

      <WebView
        ref={webRef}
        source={{ uri: url }}
        style={s.webview}
        onLoadStart={() => { setLoading(true); setError(false); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        // Allow navigation within visitanthub.com; block arbitrary external sites
        onShouldStartLoadWithRequest={request => {
          const u = request.url;
          // Allow visitanthub.com and data:// and about:blank
          if (u.includes('visitanthub.com') || u.startsWith('data:') || u.startsWith('about:')) return true;
          // Block external URLs silently (e.g. payment redirects should still work on same domain)
          return false;
        }}
        // User-agent: standard mobile browser so the site doesn't get confused
        applicationNameForUserAgent="VisitantHubApp/1.0"
      />

      {/* Full-screen loading overlay on initial load */}
      {loading && (
        <View style={s.loadOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadText}>Loading check-in form…</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.background },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  webview:    { flex: 1 },

  header:     { flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 8, paddingBottom: 8,
                backgroundColor: COLORS.card,
                borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.text },

  progressBar:{ height: 3, backgroundColor: COLORS.border },
  progressFill:{ height: 3, backgroundColor: COLORS.primary, width: '60%' },

  loadOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.background,
                justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadText:   { color: COLORS.textMuted, fontSize: 14 },

  errTitle:   { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 20, textAlign: 'center' },
  errSub:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center',
                marginTop: 10, marginBottom: 28, lineHeight: 20 },
  retryBtn:   { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  retryText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  backLink:   { marginTop: 14 },
  backLinkText:{ color: COLORS.primary, fontSize: 14 },
});
