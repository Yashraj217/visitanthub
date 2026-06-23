import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as Notifications from 'expo-notifications';
import { createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider }         from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator             from './src/navigation';
import AnimatedSplash           from './src/screens/SplashScreen';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export const navigationRef = createNavigationContainerRef();

export const FONTS = {
  regular:  'Poppins_400Regular',
  semiBold: 'Poppins_600SemiBold',
  bold:     'Poppins_700Bold',
};

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold });

  // Hide the native static splash as soon as fonts are ready
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider navigationRef={navigationRef}>
          <StatusBar style="light" />
          <AppNavigator navigationRef={navigationRef} />
          {!splashDone && fontsLoaded && (
            <AnimatedSplash onDone={() => setSplashDone(true)} />
          )}
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
