import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions
} from 'react-native';
import { AuthContext } from '../auth-context';
import { db } from '../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Circle } from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;

// Custom Progress Component that uses Expo's SVG
const CircularProgress = ({ percentage, color, size = 80, title, subtitle }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="#E0E0E0"
            fill="transparent"
          />
          {/* Progress Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke={color}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
      <Text style={{ marginTop: 4, fontSize: 14, fontWeight: '500', color: '#555' }}>{title}</Text>
      <Text style={{ fontSize: 12, color: '#777' }}>{subtitle}</Text>
    </View>
  );
};

const EmployeeProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Month selection state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState(null);
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : null,
            leaveDate: data.leaveDate || '',
            status: data.status || 'pending'
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

  // Calculate monthly statistics based on attendance and leave data
  const calculateMonthlyStats = () => {
    // Even if no data is available, we still want to show month information
    // Get days in selected month
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    
    // Initialize counters
    let workDays = 0;
    let leaveDays = 0;
    let pendingLeaveDays = 0;
    let absentDays = 0;
    let weekendDays = 0;
    
    // Count business days and weekends in month
    let businessDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(selectedYear, selectedMonth, i);
      // Check if weekend (0 = Sunday, 6 = Saturday)
      if (date.getDay() === 0 || date.getDay() === 6) {
        weekendDays++;
      } else {
        businessDays++;
      }
    }
    
    // Create a map of all dates in the month
    const dateMap = {};
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const date = new Date(selectedYear, selectedMonth, i);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      dateMap[dateStr] = { 
        worked: false, 
        leave: false, 
        leaveStatus: null,
        isWeekend: isWeekend
      };
    }
    
    // Mark attendance dates
    attendanceHistory.forEach(record => {
      if (!record.date) return;
      
      // Check if this record is for the selected month
      const recordDate = new Date(record.date);
      if (recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear) {
        dateMap[record.date].worked = true;
      }
    });
    
    // Mark leave dates
    leaveHistory.forEach(leave => {
      if (!leave.leaveDate) return;
      
      // Check if this leave is for the selected month
      const leaveDate = new Date(leave.leaveDate);
      if (leaveDate.getMonth() === selectedMonth && leaveDate.getFullYear() === selectedYear) {
        dateMap[leave.leaveDate].leave = true;
        dateMap[leave.leaveDate].leaveStatus = leave.status;
      }
    });
    
    // Count days in each category
    Object.entries(dateMap).forEach(([dateStr, day]) => {
      // Skip weekend days in the main calculation
      if (day.isWeekend) return;
      
      const date = new Date(dateStr);
      const isPastDay = date <= new Date();
      
      // Skip future days for absence calculation
      if (!isPastDay) return;
      
      if (day.worked) {
        workDays++;
      } else if (day.leave) {
        if (day.leaveStatus === 'approved') {
          leaveDays++;
        } else if (day.leaveStatus === 'pending') {
          pendingLeaveDays++;
        } else {
          // If rejected, count as absent
          absentDays++;
        }
      } else {
        // Not worked and no leave = absent
        absentDays++;
      }
    });
    
    // Calculate percentages - only based on business days that have passed
    const currentDate = new Date();
    const isCurrentMonth = currentDate.getMonth() === selectedMonth && 
                           currentDate.getFullYear() === selectedYear;
    
    // If this is current month, only consider days up to today
    const pastBusinessDays = isCurrentMonth 
      ? Object.entries(dateMap)
          .filter(([dateStr, day]) => !day.isWeekend && new Date(dateStr) <= currentDate)
          .length
      : businessDays;
    
    const workPercentage = pastBusinessDays > 0 ? (workDays / pastBusinessDays) * 100 : 0;
    const leavePercentage = pastBusinessDays > 0 ? (leaveDays / pastBusinessDays) * 100 : 0;
    const pendingLeavePercentage = pastBusinessDays > 0 ? (pendingLeaveDays / pastBusinessDays) * 100 : 0;
    const absentPercentage = pastBusinessDays > 0 ? (absentDays / pastBusinessDays) * 100 : 0;
    
    setMonthlyStats({
      workDays,
      leaveDays,
      pendingLeaveDays,
      absentDays,
      businessDays,
      weekendDays,
      pastBusinessDays,
      workPercentage,
      leavePercentage,
      pendingLeavePercentage,
      absentPercentage,
      daysInMonth,
      isCurrentMonth
    });
  };

  // Calculate statistics when month/year changes or when data changes
  useEffect(() => {
    calculateMonthlyStats();
  }, [selectedMonth, selectedYear, attendanceHistory, leaveHistory]);

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

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const currentDate = new Date();
    const isCurrentMonthYear = selectedMonth === currentDate.getMonth() && 
                               selectedYear === currentDate.getFullYear();
    
    if (isCurrentMonthYear) {
      // Don't allow going beyond current month
      return;
    }
    
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
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

      {/* Monthly Attendance Stats */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Monthly Attendance</Text>
        
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.monthButton}>
            <Icon name="chevron-left" size={24} color="#1e88e5" />
          </TouchableOpacity>
          
          <Text style={styles.monthYearText}>
            {months[selectedMonth]} {selectedYear}
          </Text>
          
          <TouchableOpacity 
            onPress={handleNextMonth} 
            style={styles.monthButton}
            disabled={selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear()}
          >
            <Icon 
              name="chevron-right" 
              size={24} 
              color={selectedMonth === new Date().getMonth() && 
                     selectedYear === new Date().getFullYear() ? 
                     "#ccc" : "#1e88e5"} 
            />
          </TouchableOpacity>
        </View>
        
        {monthlyStats ? (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <CircularProgress 
                  percentage={monthlyStats.workPercentage} 
                  color="#4CAF50" 
                  title="Work Days"
                  subtitle={`${monthlyStats.workDays} days`}
                />
              </View>
              
              <View style={styles.statCard}>
                <CircularProgress 
                  percentage={monthlyStats.leavePercentage} 
                  color="#2196F3" 
                  title="Approved Leave"
                  subtitle={`${monthlyStats.leaveDays} days`}
                />
              </View>
              
              <View style={styles.statCard}>
                <CircularProgress 
                  percentage={monthlyStats.pendingLeavePercentage} 
                  color="#FFC107" 
                  title="Pending Leave"
                  subtitle={`${monthlyStats.pendingLeaveDays} days`}
                />
              </View>
              
              <View style={styles.statCard}>
                <CircularProgress 
                  percentage={monthlyStats.absentPercentage} 
                  color="#F44336" 
                  title="Absent"
                  subtitle={`${monthlyStats.absentDays} days`}
                />
              </View>
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Month Summary</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Business Days:</Text>
                  <Text style={styles.summaryValue}>{monthlyStats.businessDays}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Weekend Days:</Text>
                  <Text style={styles.summaryValue}>{monthlyStats.weekendDays}</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Days:</Text>
                  <Text style={styles.summaryValue}>{monthlyStats.daysInMonth}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Calculated On:</Text>
                  <Text style={styles.summaryValue}>{monthlyStats.pastBusinessDays} days</Text>
                </View>
              </View>
              {monthlyStats.isCurrentMonth && (
                <Text style={styles.summaryNote}>
                  * Statistics based on completed days only
                </Text>
              )}
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>No attendance data for this month</Text>
        )}
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
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Duration</Text>
                  <Text style={styles.time}>
                    {item.startTime && item.endTime ? 
                      calculateDuration(item.startTime, item.endTime) : 
                      'N/A'}
                  </Text>
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
              <Text style={styles.leaveType}>
                {formatLeaveType(item.leaveType)}
              </Text>
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

// Helper functions
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 'N/A';
  
  // Get total milliseconds difference
  const diffMs = endTime.getTime() - startTime.getTime();
  
  // Convert to hours, minutes, and seconds
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  // Format based on duration length
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

const formatLeaveType = (type) => {
  if (!type) return '';
  
  switch(type) {
    case 'sick_leave': return 'Sick Leave';
    case 'personal_leave': return 'Personal Leave';
    case 'govt_holiday': return 'Government Holiday';
    case 'other': return 'Other';
    default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
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
  // Month selector styles
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthButton: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  summaryNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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
    fontSize: 15,
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
    marginBottom: 4,
  },
  leaveDate: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  leaveType: {
    fontSize: 14,
    color: '#1e88e5',
    marginBottom: 6,
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