import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { AuthContext } from '../auth-context';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AdminProfile = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfileData = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Fetch user profile data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <Icon name="account-tie" size={80} color="#1e88e5" />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile?.name || 'Admin'}</Text>
            <Text style={styles.company}>{profile?.companyDisplayName || profile?.companyName || 'Company'}</Text>
            <Text style={styles.role}>Administrator</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Icon name="email-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{profile?.email || 'No email'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="phone-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{profile?.mobile || 'No phone'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="shield-account-outline" size={20} color="#666" />
            <Text style={styles.detailText}>Admin ID: {profile?.uid?.substring(0, 8) || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Admin Tools */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Admin Tools</Text>
        
        <TouchableOpacity 
          style={styles.toolButton}
          onPress={() => navigation.navigate('CreateEmployee')}
        >
          <Icon name="account-plus" size={24} color="#1e88e5" />
          <Text style={styles.toolButtonText}>Create New Employee</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.toolButton}
          onPress={() => navigation.navigate('LeaveRequests')}
        >
          <Icon name="calendar-clock" size={24} color="#1e88e5" />
          <Text style={styles.toolButtonText}>Manage Leave Requests</Text>
        </TouchableOpacity>
      </View>

      {/* Account Actions */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity 
          style={[styles.toolButton, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Icon name="logout" size={24} color="#e53935" />
          <Text style={[styles.toolButtonText, styles.signOutText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  company: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  role: {
    fontSize: 14,
    color: '#1e88e5',
    marginTop: 4,
    fontWeight: 'bold',
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  toolButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  signOutButton: {
    backgroundColor: '#ffebee',
  },
  signOutText: {
    color: '#e53935',
  }
});

export default AdminProfile;