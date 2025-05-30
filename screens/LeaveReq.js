import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import { AuthContext } from '../auth-context';
import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc
} from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LeaveReq = () => {
  const { user } = useContext(AuthContext);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [responseAction, setResponseAction] = useState('');
  const [responseReason, setResponseReason] = useState('');

  const fetchLeaveRequests = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      // Get admin's company name first
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

  const showResponseModal = (id, action) => {
    setSelectedRequestId(id);
    setResponseAction(action);
    setResponseReason('');
    setResponseModalVisible(true);
  };

  const submitResponse = async () => {
    if (!responseReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your decision.');
      return;
    }

    try {
      await updateDoc(doc(db, 'leaves', selectedRequestId), {
        status: responseAction,
        adminResponse: responseReason,
        responseDate: new Date()
      });
      
      // Update local state
      setLeaveRequests(leaveRequests.map(req => 
        req.id === selectedRequestId ? { 
          ...req, 
          status: responseAction,
          adminResponse: responseReason,
          responseDate: new Date()
        } : req
      ));
      
      // Close modal and reset values
      setResponseModalVisible(false);
      setSelectedRequestId(null);
      setResponseAction('');
      setResponseReason('');
      
      Alert.alert('Success', `Leave request ${responseAction}`);
    } catch (error) {
      console.error(`Error ${responseAction} leave:`, error);
      Alert.alert('Error', `Failed to ${responseAction} leave request`);
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

  // Function to get icon based on leave type
  const getLeaveTypeIcon = (leaveType) => {
    switch(leaveType) {
      case 'sick_leave':
        return "medical-bag";
      case 'govt_holiday':
        return "flag";
      case 'personal_leave':
        return "account";
      case 'other':
      default:
        return "dots-horizontal-circle";
    }
  };

  // Function to get formatted leave type name
  const getLeaveTypeName = (leaveType) => {
    switch(leaveType) {
      case 'sick_leave':
        return "Sick Leave";
      case 'govt_holiday':
        return "Government Holiday";
      case 'personal_leave':
        return "Personal Leave";
      case 'other':
        return "Other";
      default:
        return leaveType || "Not specified";
    }
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
          <View style={styles.dateContainer}>
            <Text style={styles.leaveDate}>Date: {item.leaveDate || 'Not specified'}</Text>
            <Text style={styles.requestTimestamp}>Requested: {formatDate(item.timestamp)}</Text>
          </View>
          
          {item.leaveType && (
            <View style={styles.leaveTypeTag}>
              <Icon 
                name={getLeaveTypeIcon(item.leaveType)} 
                size={14} 
                color="#1e88e5" 
              />
              <Text style={styles.leaveTypeText}>
                {getLeaveTypeName(item.leaveType)}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.reasonTitle}>Reason:</Text>
        <Text style={styles.reasonText}>{item.reason || 'No reason provided'}</Text>
        
        {item.adminResponse && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseTitle}>Admin Response:</Text>
            <Text style={styles.responseText}>{item.adminResponse}</Text>
            {item.responseDate && (
              <Text style={styles.responseDate}>
                Responded on: {formatDate(item.responseDate instanceof Date ? item.responseDate : new Date(item.responseDate))}
              </Text>
            )}
          </View>
        )}
        
        {(!item.status || item.status === 'pending') && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => showResponseModal(item.id, 'approved')}
            >
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => showResponseModal(item.id, 'rejected')}
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

      {/* Response Modal */}
      <Modal
        visible={responseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setResponseModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {responseAction === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
            </Text>
            
            <Text style={styles.modalSubtitle}>
              Please provide a reason for your decision:
            </Text>
            
            <TextInput
              style={styles.responseInput}
              value={responseReason}
              onChangeText={setResponseReason}
              placeholder="Enter your response reason"
              multiline={true}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setResponseModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  responseAction === 'approved' ? styles.submitApproveButton : styles.submitRejectButton
                ]}
                onPress={submitResponse}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flex: 1,
  },
  leaveDate: {
    fontSize: 14,
    color: '#555',
  },
  requestTimestamp: {
    fontSize: 14,
    color: '#888',
  },
  leaveTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  leaveTypeText: {
    fontSize: 12,
    color: '#1e88e5',
    marginLeft: 4,
    fontWeight: '500',
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
  responseContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#555',
  },
  responseText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  responseDate: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
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
  
  // Modal Styles
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    height: 100,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  submitApproveButton: {
    backgroundColor: '#43a047',
  },
  submitRejectButton: {
    backgroundColor: '#e53935',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default LeaveReq;