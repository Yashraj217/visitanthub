import { useEffect, useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer }   from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { useAuth }          from '../context/AuthContext';
import { navigateToVisit }  from '../context/NotificationContext';
import { COLORS }           from '../constants/colors';

import LoginScreen          from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

import AdminDashboardScreen  from '../screens/admin/DashboardScreen';
import AdminVisitsScreen     from '../screens/admin/VisitsScreen';
import AdminVisitDetail      from '../screens/admin/VisitDetailScreen';
import AdminEmployeesScreen  from '../screens/admin/EmployeesScreen';

import AssocDashboardScreen from '../screens/associate/DashboardScreen';
import AssocVisitsScreen    from '../screens/associate/VisitsScreen';
import AssocVisitDetail     from '../screens/associate/VisitDetailScreen';

import VisitorHistoryScreen from '../screens/VisitorHistoryScreen';
import MoreScreen from '../screens/MoreScreen';
import VisitorScanScreen from '../screens/visitor/VisitorScanScreen';
import VisitorWebScreen  from '../screens/visitor/VisitorWebScreen';

const Stack    = createNativeStackNavigator();
const AdminTab = createBottomTabNavigator();
const AssocTab = createBottomTabNavigator();

function tabIcon(name) {
  return ({ focused, color, size }) => (
    <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />
  );
}

function AdminTabs() {
  return (
    <AdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { borderTopColor: COLORS.border, backgroundColor: COLORS.card },
      }}
    >
      <AdminTab.Screen name="Dashboard" component={AdminDashboardScreen}
        options={{ tabBarIcon: tabIcon('grid'), tabBarLabel: 'Dashboard' }} />
      <AdminTab.Screen name="Visits" component={AdminVisitsScreen}
        options={{ tabBarIcon: tabIcon('clipboard'), tabBarLabel: 'Visits' }} />
      <AdminTab.Screen name="Employees" component={AdminEmployeesScreen}
        options={{ tabBarIcon: tabIcon('people'), tabBarLabel: 'Associates' }} />
      <AdminTab.Screen name="More" component={MoreScreen}
        options={{ tabBarIcon: tabIcon('ellipsis-horizontal-circle'), tabBarLabel: 'More' }} />
    </AdminTab.Navigator>
  );
}

function AssocTabs() {
  return (
    <AssocTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { borderTopColor: COLORS.border, backgroundColor: COLORS.card },
      }}
    >
      <AssocTab.Screen name="Dashboard" component={AssocDashboardScreen}
        options={{ tabBarIcon: tabIcon('grid'), tabBarLabel: 'Dashboard' }} />
      <AssocTab.Screen name="MyVisits" component={AssocVisitsScreen}
        options={{ tabBarIcon: tabIcon('clipboard'), tabBarLabel: 'My Visits' }} />
      <AssocTab.Screen name="More" component={MoreScreen}
        options={{ tabBarIcon: tabIcon('ellipsis-horizontal-circle'), tabBarLabel: 'More' }} />
    </AssocTab.Navigator>
  );
}

export default function AppNavigator({ navigationRef }) {
  const { user, loading } = useAuth();

  const handleReady = useCallback(() => {
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) navigateToVisit(response, navigationRef);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={handleReady}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login"          component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="VisitorScan"    component={VisitorScanScreen}
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', headerShown: false }} />
            <Stack.Screen name="VisitorWeb"     component={VisitorWebScreen}
              options={{ headerShown: false }} />
          </>
        ) : user.role === 'company_admin' ? (
          <>
            <Stack.Screen name="AdminTabs"      component={AdminTabs} />
            <Stack.Screen name="VisitDetail"    component={AdminVisitDetail}
              options={{ headerShown: true, title: 'Visit Details', headerBackTitle: 'Back',
                headerTintColor: COLORS.primary }} />
            <Stack.Screen name="VisitorHistory" component={VisitorHistoryScreen}
              options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="AssocTabs"      component={AssocTabs} />
            <Stack.Screen name="VisitDetail"    component={AssocVisitDetail}
              options={{ headerShown: true, title: 'Visit Details', headerBackTitle: 'Back',
                headerTintColor: COLORS.primary }} />
            <Stack.Screen name="VisitorHistory" component={VisitorHistoryScreen}
              options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
