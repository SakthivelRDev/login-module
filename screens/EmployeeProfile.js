import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  FlatList
} from 'react-native';
import { AuthContext } from '../auth-context';
import { db } from '../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const EmployeeProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
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
      
      // Fetch attendance history - with error handling
      try {
        // First try to get recent records without orderBy to avoid index issues
        const simpleAttendanceQuery = query(
          collection(db, 'attendance'),
          where('employeeId', '==', user.uid)
        );
        
        const attendanceSnapshot = await getDocs(simpleAttendanceQuery);
        const attendanceData = [];
        
        attendanceSnapshot.forEach(doc => {
          const data = doc.data();
          attendanceData.push({
            id: doc.id,
            ...data,
            startTime: data.startTime?.toDate ? data.startTime.toDate() : null,
            endTime: data.endTime?.toDate ? data.endTime.toDate() : null
          });
        });
        
        // Sort locally to avoid index requirements
        attendanceData.sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return b.date.localeCompare(a.date);
        });
        
        setAttendanceHistory(attendanceData);
      } catch (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        setAttendanceHistory([]);
      }
      
      // Fetch leave history - with error handling
      try {
        const leaveQuery = query(
          collection(db, 'leaves'),
          where('employeeId', '==', user.uid)
        );
        
        const leaveSnapshot = await getDocs(leaveQuery);
        const leaveData = [];
        
        leaveSnapshot.forEach(doc => {
          const data = doc.data();
          leaveData.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : null
          });
        });
        
        // Sort locally
        leaveData.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp - a.timestamp;
        });
        
        setLeaveHistory(leaveData);
      } catch (leaveError) {
        console.error('Error fetching leaves:', leaveError);
        setLeaveHistory([]);
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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <Icon name="account-circle" size={80} color="#1e88e5" />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile?.name || 'Employee'}</Text>
            <Text style={styles.company}>{profile?.companyDisplayName || profile?.companyName || 'Company'}</Text>
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
            <Icon name="badge-account-outline" size={20} color="#666" />
            <Text style={styles.detailText}>ID: {profile?.uid?.substring(0, 8) || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Attendance History */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Recent Attendance</Text>
        {attendanceHistory.length > 0 ? (
          attendanceHistory.slice(0, 5).map((item, index) => (
            <View key={item.id || index} style={styles.historyItem}>
              <View style={styles.dateContainer}>
                <Text style={styles.date}>{item.date || 'Unknown date'}</Text>
                <Text style={styles.status}>
                  {item.endTime ? 'Completed' : 'In Progress'}
                </Text>
              </View>
              <View style={styles.timeContainer}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <Text style={styles.time}>{formatTime(item.startTime)}</Text>
                </View>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>End</Text>
                  <Text style={styles.time}>{formatTime(item.endTime)}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No attendance records found</Text>
        )}
      </View>

      {/* Leave History */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Leave Requests</Text>
        {leaveHistory.length > 0 ? (
          leaveHistory.slice(0, 5).map((item, index) => (
            <View key={item.id || index} style={styles.leaveItem}>
              <View style={styles.leaveHeader}>
                <Text style={styles.leaveDate}>{item.leaveDate || 'Unknown date'}</Text>
                <Text style={[
                  styles.leaveStatus, 
                  item.status === 'approved' ? styles.approved : 
                  item.status === 'rejected' ? styles.rejected : 
                  styles.pending
                ]}>
                  {item.status?.toUpperCase() || 'PENDING'}
                </Text>
              </View>
              <Text style={styles.leaveReason}>{item.reason || 'No reason provided'}</Text>
              <Text style={styles.leaveTimestamp}>
                Requested on: {formatDate(item.timestamp)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No leave requests found</Text>
        )}
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
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 14,
    color: '#1e88e5',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeBlock: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  time: {
    fontSize: 16,
    color: '#333',
  },
  leaveItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leaveDate: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  leaveStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  approved: {
    backgroundColor: '#e6f7e9',
    color: '#43a047',
  },
  rejected: {
    backgroundColor: '#ffebee',
    color: '#e53935',
  },
  pending: {
    backgroundColor: '#fff8e1',
    color: '#ffa000',
  },
  leaveReason: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  leaveTimestamp: {
    fontSize: 12,
    color: '#888',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
});

export default EmployeeProfile;