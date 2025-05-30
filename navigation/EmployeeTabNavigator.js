import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import EmployeeScreen from '../screens/Employee';
import EmployeeProfile from '../screens/EmployeeProfile';

const Tab = createBottomTabNavigator();

const EmployeeTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1e88e5',
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#1e88e5',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen 
        name="Attendance" 
        component={EmployeeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="clock-time-four" color={color} size={24} />
          ),
          headerShown: false, // Hide header since EmployeeScreen has its own header
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={EmployeeProfile} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={24} />
          ),
          title: 'My Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default EmployeeTabNavigator;