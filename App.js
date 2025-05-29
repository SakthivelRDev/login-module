// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { AuthProvider } from './auth-context';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AdminScreen from './screens/AdminScreen';
import CreateEmployeeScreen from './screens/CreateEmployeeScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="CreateEmployee" component={CreateEmployeeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}