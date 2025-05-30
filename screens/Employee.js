import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { AuthContext } from '../auth-context';

const EmployeeScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setEmployeeData(docSnap.data());
          } else {
            Alert.alert('Error', 'Employee data not found');
          }
        } catch (error) {
          console.error('Error fetching employee data:', error);
          Alert.alert('Error', 'Failed to load employee data');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchEmployeeData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading employee data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Employee Dashboard</Text>
      
      {employeeData && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Name: {employeeData.name}</Text>
          <Text style={styles.infoText}>Email: {employeeData.email}</Text>
          <Text style={styles.infoText}>Mobile: {employeeData.mobile}</Text>
          <Text style={styles.infoText}>Company: {employeeData.companyName}</Text>
        </View>
      )}
      
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default EmployeeScreen;