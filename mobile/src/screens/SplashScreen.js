import { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Dimensions, Modal } from 'react-native';

const { width } = Dimensions.get('window');
const ICON_SIZE = width * 0.30;

export default function SplashScreen({ onDone }) {
  const scale         = useRef(new Animated.Value(0.4)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const textOpacity   = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 55,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 300,
        delay: 80,
        useNativeDriver: true,
      }),
      Animated.delay(900),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start(() => onDone?.());
  }, []);

  return (
    <Modal
      visible
      transparent={false}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[s.root, { opacity: screenOpacity }]}>
        <Animated.View style={{ transform: [{ scale }], opacity: logoOpacity }}>
          <Image
            source={require('../../assets/icon.png')}
            style={s.icon}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={[s.textBox, { opacity: textOpacity }]}>
          <Text style={s.appName}>VisitantHub</Text>
          <Text style={s.tagline}>Visitor Management</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE * 0.22,
  },
  textBox: {
    alignItems: 'center',
    marginTop: 28,
  },
  appName: {
    fontSize: 30,
    fontFamily: 'Poppins_700Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    letterSpacing: 0.3,
  },
});
