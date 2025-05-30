import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !name || !mobile || !companyName) {
      return Alert.alert('Error', 'All fields are required');
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      // Convert company name to lowercase before storing
      const normalizedCompanyName = companyName.trim().toLowerCase();

      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        name,
        mobile,
        companyName: normalizedCompanyName,
        companyDisplayName: companyName.trim(), // Optional: keep original formatting for display
        role: 'admin', // ✅ default role
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', `Admin registered: ${email}`);
      setEmail('');
      setPassword('');
      setName('');
      setMobile('');
      setCompanyName('');
    } catch (error) {
      let message = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') message = 'Email already in use';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email format';
      else if (error.code === 'auth/weak-password') message = 'Password too weak';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Register Admin</Text>
        
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full Name"
          style={styles.input}
        />
        
        <TextInput
          value={mobile}
          onChangeText={setMobile}
          placeholder="Mobile Number"
          keyboardType="phone-pad"
          style={styles.input}
        />
        
        <TextInput
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Company Name"
          style={styles.input}
        />
        
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />
        
        <Button title={loading ? 'Registering...' : 'Register'} onPress={handleRegister} disabled={loading} />
        
        <View style={styles.loginContainer}>
          <Text>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginText}>Click here to login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 20 
  },
  title: { 
    fontSize: 24, 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 10, 
    marginBottom: 15, 
    borderRadius: 5 
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;