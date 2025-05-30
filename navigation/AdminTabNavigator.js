import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import AdminScreen from '../screens/AdminScreen';
import AdminProfile from '../screens/AdminProfile';
import LeaveReq from '../screens/LeaveReq';

const Tab = createBottomTabNavigator();

const AdminTabNavigator = () => {
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
        name="Dashboard" 
        component={AdminScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" color={color} size={24} />
          ),
          title: 'Employee Dashboard',
        }}
      />
      <Tab.Screen 
        name="LeaveRequests" 
        component={LeaveReq} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-clock" color={color} size={24} />
          ),
          title: 'Leave Requests',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={AdminProfile} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-cog" color={color} size={24} />
          ),
          title: 'Admin Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;