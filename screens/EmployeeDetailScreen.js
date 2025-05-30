import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  FlatList
} from 'react-native';
import { db } from '../firebaseConfig';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width } = Dimensions.get('window');

const EmployeeDetailScreen = ({ route, navigation }) => {
  const { employee } = route.params;
  const [employeeData, setEmployeeData] = useState(employee);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Function to refresh employee data
  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'employees', employee.id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setEmployeeData({
          id: docSnap.id,
          ...docSnap.data()
        });
      } else {
        Alert.alert('Error', 'Could not fetch the latest employee data');
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      Alert.alert('Error', 'Failed to update employee information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to fetch attendance history
  const fetchAttendanceHistory = async () => {
    setLoadingHistory(true);
    try {
      //console.log('Fetching attendance history for employee ID:', employee.id);
      
      // Try using orderBy query first
      try {
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('employeeId', '==', employee.id),
          orderBy('date', 'desc'),
          limit(10)
        );
        
        const querySnapshot = await getDocs(attendanceQuery);
        const attendanceData = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          //console.log('Processing attendance record:', data);
          
          // Process timestamps carefully
          let startTime = null;
          if (data.startTime) {
            startTime = data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
          }
          
          let endTime = null;
          if (data.endTime) {
            endTime = data.endTime.toDate ? data.endTime.toDate() : new Date(data.endTime);
          }
          
          attendanceData.push({
            id: doc.id,
            ...data,
            startTime,
            endTime
          });
        });
        
        //console.log(`Found ${attendanceData.length} attendance records with index query`);
        setAttendanceHistory(attendanceData);
      } catch (error) {
        // If orderBy fails due to missing index, try simple query
       // console.log('Falling back to simple query due to:', error.message);
        
        const simpleQuery = query(
          collection(db, 'attendance'),
          where('employeeId', '==', employee.id)
        );
        
        const querySnapshot = await getDocs(simpleQuery);
        const attendanceData = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          //console.log('Processing attendance record (fallback):', data);
          
          // Process timestamps carefully
          let startTime = null;
          if (data.startTime) {
            startTime = data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
          }
          
          let endTime = null;
          if (data.endTime) {
            endTime = data.endTime.toDate ? data.endTime.toDate() : new Date(data.endTime);
          }
          
          attendanceData.push({
            id: doc.id,
            ...data,
            startTime,
            endTime
          });
        });
        
        // Sort manually
        attendanceData.sort((a, b) => {
          const dateA = a.date || '';
          const dateB = b.date || '';
          return dateB.localeCompare(dateA);
        });
        
        //console.log(`Found ${attendanceData.length} attendance records with fallback query`);
        setAttendanceHistory(attendanceData.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    // Set screen title to employee name
    navigation.setOptions({
      title: employeeData?.employeeName || 'Employee Details'
    });
    
    // Fetch latest data when screen loads
    fetchEmployeeData();
    fetchAttendanceHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployeeData();
    fetchAttendanceHistory();
  };

  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Not available';
    
    // If it's a Firestore timestamp, convert to JS Date
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format time (for attendance records)
  const formatTime = (date) => {
    if (!date) return 'N/A';
    
    try {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return 'Invalid time';
    }
  };

  // Calculate work duration - Fixed
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    
    try {
      // Ensure we're working with JavaScript Date objects
      const start = startTime instanceof Date ? startTime : new Date(startTime);
      const end = endTime instanceof Date ? endTime : new Date(endTime);
      
      // Calculate difference in milliseconds
      const durationMs = end.getTime() - start.getTime();
      
      // Check if the calculation resulted in a valid number
      if (isNaN(durationMs) || durationMs < 0) {
        // console.log('Invalid duration calculation:', { 
        //   startTime: start.toString(), 
        //   endTime: end.toString(), 
        //   durationMs 
        // });
        return 'N/A';
      }
      
      // Calculate hours and minutes
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 'N/A';
    }
  };

const renderAttendanceItem = ({ item }) => {
  // Calculate duration directly here to ensure it works
  let durationText = 'N/A';
  if (item.startTime && item.endTime) {
    try {
      const start = item.startTime instanceof Date ? item.startTime : new Date(item.startTime);
      const end = item.endTime instanceof Date ? item.endTime : new Date(item.endTime);
      
      if (start && end && start.getTime && end.getTime) {
        const durationMs = end.getTime() - start.getTime();
        if (!isNaN(durationMs) && durationMs >= 0) {
          // If duration is less than a minute, show seconds
          if (durationMs < 60000) {
            const seconds = Math.floor(durationMs / 1000);
            durationText = `${seconds}s`;
          } else {
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            // Show hours only if there are any
            if (hours > 0) {
              durationText = `${hours}h ${minutes}m`;
            } else {
              durationText = `${minutes}m`;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error calculating duration in render:', e);
    }
  }
  
  // Add debug info
//   console.log('Duration calculation:', {
//     id: item.id,
//     startTime: item.startTime ? item.startTime.toString() : null,
//     endTime: item.endTime ? item.endTime.toString() : null,
//     calculatedDuration: durationText
//   });
  
  return (
    <View style={styles.attendanceCard}>
      <View style={styles.attendanceHeader}>
        <Text style={styles.attendanceDate}>{item.date || 'Unknown date'}</Text>
        <View style={[
          styles.attendanceStatus,
          item.endTime ? styles.completedStatus : styles.inProgressStatus
        ]}>
          <Text style={styles.attendanceStatusText}>
            {item.endTime ? 'Completed' : 'In Progress'}
          </Text>
        </View>
      </View>
      
      <View style={styles.timeDetails}>
        <View style={styles.timeBlock}>
          <Icon name="clock-start" size={16} color="#555" />
          <Text style={styles.timeLabel}>Clock In</Text>
          <Text style={styles.timeValue}>{formatTime(item.startTime)}</Text>
        </View>
        
        <View style={styles.timeBlock}>
          <Icon name="clock-end" size={16} color="#555" />
          <Text style={styles.timeLabel}>Clock Out</Text>
          <Text style={styles.timeValue}>{formatTime(item.endTime)}</Text>
        </View>
        
        <View style={styles.timeBlock}>
          <Icon name="clock-time-eight" size={16} color="#555" />
          <Text style={styles.timeLabel}>Duration</Text>
          <Text style={styles.timeValue}>{durationText}</Text>
        </View>
      </View>
      
      {item.location && (
        <View style={styles.locationInfo}>
          <Icon name="map-marker" size={14} color="#777" />
          <Text style={styles.locationText}>
            Lat: {item.location.latitude?.toFixed(4) || 'N/A'}, 
            Long: {item.location.longitude?.toFixed(4) || 'N/A'}
          </Text>
        </View>
      )}
    </View>
  );
};
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
        <Text style={styles.loadingText}>Loading employee details...</Text>
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
      {/* Employee Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <Icon name="account-circle" size={80} color="#1e88e5" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.employeeName}>
            {employeeData?.employeeName || 'Unknown'}
          </Text>
          <Text style={styles.department}>
            {employeeData?.department || 'No Department'}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIndicator,
              employeeData?.isActive ? styles.activeIndicator : styles.inactiveIndicator
            ]} />
            <Text style={styles.statusText}>
              {employeeData?.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      {/* Current Status Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <View style={styles.statusRow}>
          <Icon name="clock-outline" size={24} color="#555" />
          <View style={styles.statusDetail}>
            <Text style={styles.statusLabel}>Work Status</Text>
            <Text style={styles.statusValue}>
              {employeeData?.status === 'on_duty' ? 'On Duty' : 
               employeeData?.status === 'off_duty' ? 'Off Duty' : 
               'Unknown'}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Icon name="message-text-outline" size={24} color="#555" />
          <View style={styles.statusDetail}>
            <Text style={styles.statusLabel}>Status Message</Text>
            <Text style={styles.statusValue}>
              {employeeData?.statusMessage || 'No message'}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Icon name="update" size={24} color="#555" />
          <View style={styles.statusDetail}>
            <Text style={styles.statusLabel}>Last Updated</Text>
            <Text style={styles.statusValue}>
              {formatTimestamp(employeeData?.lastUpdated)}
            </Text>
          </View>
        </View>
      </View>

      {/* Live Location Map */}
      <View style={styles.sectionCard}>
        <View style={styles.mapHeader}>
          <Text style={styles.sectionTitle}>Live Location</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchEmployeeData}
          >
            <Icon name="refresh" size={20} color="#1e88e5" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        
        {employeeData?.currentLocation?.latitude && employeeData?.currentLocation?.longitude ? (
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: employeeData.currentLocation.latitude,
                longitude: employeeData.currentLocation.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker
                coordinate={{
                  latitude: employeeData.currentLocation.latitude,
                  longitude: employeeData.currentLocation.longitude,
                }}
                title={employeeData.employeeName || 'Employee'}
                description={employeeData.status === 'on_duty' ? 'Currently working' : 'Not on duty'}
              />
            </MapView>
            <View style={styles.coordinatesContainer}>
              <Text style={styles.coordinatesText}>
                Latitude: {employeeData.currentLocation.latitude.toFixed(6)}
              </Text>
              <Text style={styles.coordinatesText}>
                Longitude: {employeeData.currentLocation.longitude.toFixed(6)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noLocationContainer}>
            <Icon name="map-marker-off" size={64} color="#bdbdbd" />
            <Text style={styles.noLocationText}>
              No location data available for this employee
            </Text>
          </View>
        )}
      </View>

      {/* Work History Section */}
      <View style={styles.sectionCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Work History</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchAttendanceHistory}
          >
            <Icon name="refresh" size={20} color="#1e88e5" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        
        {loadingHistory ? (
          <View style={styles.historyLoading}>
            <ActivityIndicator size="small" color="#1e88e5" />
            <Text style={styles.historyLoadingText}>Loading history...</Text>
          </View>
        ) : attendanceHistory.length > 0 ? (
          <FlatList
            data={attendanceHistory}
            renderItem={renderAttendanceItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false} // Disable scrolling as we're in a ScrollView
          />
        ) : (
          <View style={styles.noHistoryContainer}>
            <Icon name="calendar-blank" size={48} color="#bdbdbd" />
            <Text style={styles.noHistoryText}>
              No work history available for this employee
            </Text>
          </View>
        )}
      </View>

      {/* Company Information */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Company Information</Text>
        <View style={styles.infoRow}>
          <Icon name="domain" size={24} color="#555" />
          <View style={styles.infoDetail}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>
              {employeeData?.companyName || 'Not specified'}
            </Text>
          </View>
        </View>
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
    color: '#666',
  },
  headerCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarContainer: {
    marginRight: 20,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  employeeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  department: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  activeIndicator: {
    backgroundColor: '#4caf50',
  },
  inactiveIndicator: {
    backgroundColor: '#e53935',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: 'white',
    padding: 20,
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusDetail: {
    marginLeft: 16,
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    color: '#333',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    marginLeft: 4,
    color: '#1e88e5',
    fontWeight: '500',
  },
  mapContainer: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 250,
  },
  coordinatesContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  coordinatesText: {
    fontSize: 14,
    color: '#666',
  },
  noLocationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  noLocationText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 16,
  },
  historyLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  historyLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  attendanceCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  attendanceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedStatus: {
    backgroundColor: '#e6f7e9',
  },
  inProgressStatus: {
    backgroundColor: '#fff8e1',
  },
  attendanceStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  timeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeBlock: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  locationText: {
    fontSize: 12,
    color: '#777',
    marginLeft: 4,
  },
  noHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  noHistoryText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoDetail: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  }
});

export default EmployeeDetailScreen;