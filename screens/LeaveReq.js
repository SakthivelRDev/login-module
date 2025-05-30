import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { AuthContext } from '../auth-context';
import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, // Added this import
  updateDoc
} from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LeaveReq = () => {
  const { user } = useContext(AuthContext);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaveRequests = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      // Get admin's company name first - FIXED THIS LINE
      const adminDocRef = doc(db, 'users', user.uid);
      const adminDocSnap = await getDoc(adminDocRef);
      
      let companyName = '';
      
      if (adminDocSnap.exists()) {
        companyName = adminDocSnap.data().companyName;
      } else {
        throw new Error('Admin data not found');
      }

      // Query leave requests for the admin's company
      try {
        const leaveRequestsQuery = query(
          collection(db, 'leaves'),
          where('companyName', '==', companyName)
        );

        const querySnapshot = await getDocs(leaveRequestsQuery);
        const requests = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          requests.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : null
          });
        });

        // Sort manually if needed
        requests.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp - a.timestamp;
        });

        setLeaveRequests(requests);
      } catch (error) {
        console.error('Error querying leaves collection:', error);
        Alert.alert('Error', 'Failed to query leave requests');
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      Alert.alert('Error', 'Failed to load leave requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [user]);

  const handleApprove = async (id) => {
    try {
      await updateDoc(doc(db, 'leaves', id), {
        status: 'approved'
      });
      
      // Update local state
      setLeaveRequests(leaveRequests.map(req => 
        req.id === id ? { ...req, status: 'approved' } : req
      ));
      
      Alert.alert('Success', 'Leave request approved');
    } catch (error) {
      console.error('Error approving leave:', error);
      Alert.alert('Error', 'Failed to approve leave request');
    }
  };

  const handleReject = async (id) => {
    try {
      await updateDoc(doc(db, 'leaves', id), {
        status: 'rejected'
      });
      
      // Update local state
      setLeaveRequests(leaveRequests.map(req => 
        req.id === id ? { ...req, status: 'rejected' } : req
      ));
      
      Alert.alert('Success', 'Leave request rejected');
    } catch (error) {
      console.error('Error rejecting leave:', error);
      Alert.alert('Error', 'Failed to reject leave request');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaveRequests();
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderLeaveRequest = ({ item }) => {
    return (
      <View style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.employeeName}>{item.employeeName}</Text>
          <Text style={[
            styles.statusBadge, 
            item.status === 'approved' ? styles.approvedBadge : 
            item.status === 'rejected' ? styles.rejectedBadge : 
            styles.pendingBadge
          ]}>
            {item.status?.toUpperCase() || 'PENDING'}
          </Text>
        </View>
        
        <View style={styles.requestInfo}>
          <Text style={styles.leaveDate}>Date: {item.leaveDate || 'Not specified'}</Text>
          <Text style={styles.requestTimestamp}>Requested: {formatDate(item.timestamp)}</Text>
        </View>
        
        <Text style={styles.reasonTitle}>Reason:</Text>
        <Text style={styles.reasonText}>{item.reason || 'No reason provided'}</Text>
        
        {(!item.status || item.status === 'pending') && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item.id)}
            >
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item.id)}
            >
              <Icon name="close" size={20} color="#fff" />
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
        <Text style={styles.loadingText}>Loading leave requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Employee Leave Requests</Text>
      
      {leaveRequests.length > 0 ? (
        <FlatList
          data={leaveRequests}
          renderItem={renderLeaveRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="calendar-check" size={64} color="#bdbdbd" />
          <Text style={styles.emptyText}>No leave requests found</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    margin: 16,
    color: '#333',
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
  listContainer: {
    padding: 8,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  approvedBadge: {
    backgroundColor: '#e6f7e9',
    color: '#43a047',
  },
  rejectedBadge: {
    backgroundColor: '#ffebee',
    color: '#e53935',
  },
  pendingBadge: {
    backgroundColor: '#fff8e1',
    color: '#ffa000',
  },
  requestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leaveDate: {
    fontSize: 14,
    color: '#555',
  },
  requestTimestamp: {
    fontSize: 14,
    color: '#888',
  },
  reasonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#555',
  },
  reasonText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: '#43a047',
  },
  rejectButton: {
    backgroundColor: '#e53935',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#757575',
    marginVertical: 16,
    textAlign: 'center',
  },
  refreshButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#1e88e5',
    borderRadius: 6,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LeaveReq;