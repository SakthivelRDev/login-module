import React, { useState, useContext } from 'react';
import { View, TextInput, Button, Alert, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { AuthContext } from '../auth-context';

export default function CreateEmployeeScreen() {
  const { user } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || user.role !== 'admin') {
    Alert.alert('Access Denied', 'Only admins can create employees.');
    return null;
  }

  const handleCreateEmployee = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Email and password are required.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      // ✅ Save role to Firestore
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        role: 'employee', // ✅ default role
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', `Employee created. UID: ${uid}`);
      setEmail('');
      setPassword('');
    } catch (error) {
      let msg = 'Failed to create employee.';
      if (error.code === 'auth/email-already-in-use') msg = 'This email is already in use.';
      else if (error.code === 'auth/invalid-email') msg = 'Invalid email format.';
      else if (error.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create Employee</Text>
      <TextInput
        style={styles.input}
        placeholder="Employee Email"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        value={email}
      />
      <TextInput
        style={styles.input}
        placeholder="Employee Password"
        secureTextEntry
        onChangeText={setPassword}
        value={password}
      />
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Create Employee" onPress={handleCreateEmployee} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  header: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
});
