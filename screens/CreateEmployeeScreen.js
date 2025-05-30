import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, Button, Alert, StyleSheet, Text, ActivityIndicator, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { AuthContext } from '../auth-context';

export default function CreateEmployeeScreen() {
  const { user } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyDisplayName, setCompanyDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  // Get the admin's company name when component mounts
  useEffect(() => {
    const getAdminCompanyName = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Use lowercase version for internal operations
            setCompanyName(userData.companyName || '');
            // Use display version for user interface
            setCompanyDisplayName(userData.companyDisplayName || userData.companyName || '');
          }
        } catch (error) {
          console.error("Error fetching admin data:", error);
        }
      }
    };
    
    getAdminCompanyName();
  }, [user]);

  if (!user || user.role !== 'admin') {
    Alert.alert('Access Denied', 'Only admins can create employees.');
    return null;
  }

  const handleCreateEmployee = async () => {
    if (!email || !password || !name || !mobile || !companyName) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = userCredential.user;

      // Normalize company name to lowercase
      const normalizedCompanyName = companyName.trim().toLowerCase();

      // ✅ Save role and additional fields to Firestore
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        name,
        mobile,
        companyName: normalizedCompanyName,
        companyDisplayName: companyDisplayName || companyName,
        role: 'employee',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      Alert.alert('Success', `Employee created. UID: ${uid}`);
      setEmail('');
      setPassword('');
      setName('');
      setMobile('');
      // Don't reset company name as it's likely the same for multiple employees
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

  // Handle manual company name change (if allowed)
  const handleCompanyNameChange = (text) => {
    setCompanyDisplayName(text);
    setCompanyName(text.toLowerCase());
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.header}>Create Employee</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Employee Full Name"
          onChangeText={setName}
          value={name}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Employee Mobile Number"
          keyboardType="phone-pad"
          onChangeText={setMobile}
          value={mobile}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Company Name"
          onChangeText={handleCompanyNameChange}
          value={companyDisplayName}
          editable={true} // Set to false if you want to prevent admins from changing company name
        />
        
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
          <ActivityIndicator size="large" color="#3498db" />
        ) : (
          <Button title="Create Employee" onPress={handleCreateEmployee} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: { 
    padding: 20, 
    flex: 1, 
    justifyContent: 'center' 
  },
  header: { 
    fontSize: 24, 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
});