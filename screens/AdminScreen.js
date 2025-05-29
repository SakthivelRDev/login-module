// screens/AdminScreen.js
import React, { useContext } from 'react';
import { View, Button, Alert, StyleSheet, Text } from 'react-native';
import { AuthContext } from '../auth-context';

export default function AdminScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  if (!user || user.role !== 'admin') {
    Alert.alert('Access Denied', 'Only admins can access this screen.');
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Admin</Text>
      <Button title="Create Employee" onPress={() => navigation.navigate('CreateEmployee')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
});
