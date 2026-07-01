import React from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { GameProvider } from './src/game/GameContext';
import { RootStackParamList } from './src/game/navigation';
import { colors } from './src/utils/theme';
import { HomeScreen } from './src/screens/HomeScreen';
import { LeagueSelectScreen } from './src/screens/LeagueSelectScreen';
import { TriviaGauntletScreen } from './src/screens/TriviaGauntletScreen';
import { BiddingFloorScreen } from './src/screens/BiddingFloorScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { TicketVaultScreen } from './src/screens/TicketVaultScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    primary: colors.pink,
    text: colors.white,
  },
};

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <GameProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="LeagueSelect" component={LeagueSelectScreen} />
          <Stack.Screen
            name="TriviaGauntlet"
            component={TriviaGauntletScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name="BiddingFloor"
            component={BiddingFloorScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name="Results"
            component={ResultsScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="TicketVault" component={TicketVaultScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
        </NavigationContainer>
      </GameProvider>
    </ErrorBoundary>
  );
}
