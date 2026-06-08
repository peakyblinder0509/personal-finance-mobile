import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

// AppStack — shown only when logged in (gated in app/_layout.tsx).
// This is the Bottom Tab Navigator: one tab per top-level area of the app.
export default function AppTabsLayout() {
  const scheme = useColorScheme();

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: Colors[scheme].tint }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          // The screen renders its own header (with the alerts badge), so hide
          // the native one to avoid a duplicate title.
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          // AccountsScreen renders its own net-worth header; hide the native one.
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
