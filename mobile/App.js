import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider }         from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator             from './src/navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export const navigationRef = createNavigationContainerRef();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider navigationRef={navigationRef}>
          <StatusBar style="auto" />
          <AppNavigator navigationRef={navigationRef} />
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
