import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl
} from 'react-native';
import { AuthContext } from '../auth-context';
import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc
} from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AdminScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminData, setAdminData] = useState(null);

  const fetchAdminData = async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setAdminData(docSnap.data());
      } else {
        Alert.alert('Error', 'Admin data not found');
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  const fetchEmployees = async () => {
    if (!user?.uid) return;

    try {
      // Fetch admin data first if needed
      if (!adminData) {
        await fetchAdminData();
      }

      // Get employees for the admin's company
      const companyName = adminData?.companyName?.toLowerCase();
      
      if (!companyName) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // First try fetching from employees collection
      try {
        const employeesQuery = query(
          collection(db, 'employees'),
          where('companyName', '==', companyName)
        );
        
        const querySnapshot = await getDocs(employeesQuery);
        const employeesList = [];
        
        querySnapshot.forEach((doc) => {
          employeesList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // If we found employees, use them
        if (employeesList.length > 0) {
          setEmployees(employeesList);
        } else {
          // Fallback to users collection with role=employee filter
          const usersQuery = query(
            collection(db, 'users'),
            where('companyName', '==', companyName),
            where('role', '==', 'employee')
          );
          
          const usersSnapshot = await getDocs(usersQuery);
          const usersList = [];
          
          usersSnapshot.forEach((doc) => {
            usersList.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setEmployees(usersList);
        }
      } catch (error) {
        console.error('Error fetching from employees collection:', error);
        
        // Fallback to users collection
        const usersQuery = query(
          collection(db, 'users'),
          where('companyName', '==', companyName),
          where('role', '==', 'employee')
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const usersList = [];
        
        usersSnapshot.forEach((doc) => {
          usersList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setEmployees(usersList);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

// Update your useEffect to include adminData dependency
useEffect(() => {
  if (user?.uid) {
    fetchAdminData().then(() => fetchEmployees());
  }
}, [user, adminData?.companyName]); // Add adminData?.companyName as dependency

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const handleAddEmployee = () => {
    navigation.navigate('CreateEmployee');
  };

  const handleViewLeaveRequests = () => {
    navigation.navigate('LeaveRequests');
  };

  const filteredEmployees = employees.filter(employee => {
    const query = searchQuery.toLowerCase();
    return (
      employee.name?.toLowerCase().includes(query) ||
      employee.email?.toLowerCase().includes(query) ||
      employee.employeeName?.toLowerCase().includes(query) ||
      employee.mobile?.toLowerCase().includes(query)
    );
  });

  const renderEmployee = ({ item }) => {
    // Handle data format from either employees or users collection
    const name = item.employeeName || item.name || 'Unknown';
    const email = item.email || 'No email';
    const phone = item.mobile || 'No phone';
    const isActive = item.isActive || false;

    return (
      <View style={styles.employeeCard}>
        <View style={styles.employeeAvatarContainer}>
          <Icon name="account" size={36} color="#1e88e5" />
        </View>
        
        <View style={styles.employeeDetails}>
          <Text style={styles.employeeName}>{name}</Text>
          <Text style={styles.employeeEmail}>{email}</Text>
          <Text style={styles.employeePhone}>{phone}</Text>
        </View>
        
        <View style={styles.employeeStatus}>
          <View style={[
            styles.statusIndicator,
            isActive ? styles.activeIndicator : styles.inactiveIndicator
          ]} />
          <Text style={styles.statusText}>
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.companyName}>
          {adminData?.companyDisplayName || adminData?.companyName || 'Your Company'}
        </Text>
        <Text style={styles.subtitle}>Employee Management Dashboard</Text>
      </View>
      
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAddEmployee}
        >
          <Icon name="account-plus" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Add Employee</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#66bb6a' }]}
          onPress={handleViewLeaveRequests}
        >
          <Icon name="calendar-clock" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Leave Requests</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      <View style={styles.employeeListContainer}>
        <Text style={styles.sectionTitle}>
          Employees ({filteredEmployees.length})
        </Text>
        
        {filteredEmployees.length > 0 ? (
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployee}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.employeeList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="account-group" size={64} color="#bdbdbd" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No employees match your search' : 'No employees found'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddEmployee}
              >
                <Text style={styles.addButtonText}>Add Employee</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#1e88e5',
    padding: 20,
    paddingBottom: 25,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    marginTop: -20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e88e5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 6,
    margin: 16,
    marginTop: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  employeeListContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  employeeList: {
    paddingBottom: 16,
  },
  employeeCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  employeeAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  employeeEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  employeePhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  employeeStatus: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  activeIndicator: {
    backgroundColor: '#4caf50',
  },
  inactiveIndicator: {
    backgroundColor: '#bdbdbd',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginVertical: 16,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#1e88e5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default AdminScreen;