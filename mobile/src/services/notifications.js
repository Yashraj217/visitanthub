import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || projectId === 'YOUR_EAS_PROJECT_ID') {
    console.log('[Push] No EAS projectId configured — skipping push registration');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;
    await api.post('/auth/push-token', { push_token: pushToken });
    console.log('[Push] Token registered:', pushToken);
    return pushToken;
  } catch (err) {
    console.log('[Push] Failed to register token:', err.message);
    return null;
  }
}
