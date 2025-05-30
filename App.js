// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { AuthProvider } from './auth-context';
import  HomeScreen  from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AdminScreen from './screens/AdminScreen';
//import EmployeeScreen from './screens/Employee';
import CreateEmployeeScreen from './screens/CreateEmployeeScreen';
import EmployeeTabNavigator from './navigation/EmployeeTabNavigator';
import AdminTabNavigator from './navigation/AdminTabNavigator';
import EmployeeDetailScreen from './screens/EmployeeDetailScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName='Home'>
           <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Welcome' }} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen 
                    
            name="Admin" 
            component={AdminTabNavigator} 
            options={{ 
              headerShown: false,
              title: 'Admin Dashboard'
            }} 
          />
          <Stack.Screen 
  name="EmployeeDetail" 
  component={EmployeeDetailScreen}
  options={{
    title: 'Employee Details',
    headerTintColor: '#fff',
    headerStyle: {
      backgroundColor: '#1e88e5',
    }
  }}
/>
                    <Stack.Screen 
            name="Employee" 
            component={EmployeeTabNavigator} 
            options={{ 
              headerShown: false,
              title: 'Employee Dashboard'
            }} 
          />
          <Stack.Screen name="CreateEmployee" component={CreateEmployeeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}