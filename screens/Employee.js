import React, { useState, useEffect, useContext } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from "react-native";
// Update the MapView import to ensure it's using the Expo version
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { db, auth } from "../firebaseConfig";
import { AuthContext } from "../auth-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";

const EmployeeScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [employeeData, setEmployeeData] = useState(null);
  const [location, setLocation] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [currentStatus, setCurrentStatus] = useState("Off Duty");
  const [loading, setLoading] = useState(true);

  // Fetch employee data on component mount
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setEmployeeData(docSnap.data());
            
            // Check if employee is currently on duty
            const attendanceQuery = query(
              collection(db, "attendance"),
              where("employeeId", "==", user.uid),
              where("date", "==", new Date().toISOString().split("T")[0]),
              where("endTime", "==", null)
            );
            
            const querySnapshot = await getDocs(attendanceQuery);
            if (!querySnapshot.empty) {
              setIsWorking(true);
              setCurrentStatus("On Duty");
            }
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
    getInitialLocation();

    return () => {
      if (watchId !== null) {
        watchId.remove();
      }
    };
  }, [user]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Error requesting location permission:", error);
      return false;
    }
  };

  const getInitialLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      try {
        const location = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      } catch (error) {
        console.error("Error getting initial location:", error);
      }
    }
  };

  const startWork = async () => {
    setLoading(true);
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        "Permission Denied",
        "Location permission is required to track your work."
      );
      setLoading(false);
      return;
    }

    try {
      if (!user?.uid || !employeeData) {
        throw new Error("Employee data not available");
      }

      // Create/update employee status document
      const employeeDocRef = doc(db, "employees", user.uid);
      await setDoc(
        employeeDocRef,
        {
          isActive: true,
          lastUpdated: serverTimestamp(),
          status: "on_duty",
          statusMessage: "Employee is on duty",
          employeeName: employeeData.name,
          department: employeeData.department || "Not specified",
          companyName: employeeData.companyName,
        },
        { merge: true }
      );

      // Create attendance record
      await addDoc(collection(db, "attendance"), {
        employeeId: user.uid,
        employeeName: employeeData.name,
        companyName: employeeData.companyName,
        startTime: serverTimestamp(),
        date: new Date().toISOString().split("T")[0],
        endTime: null,
      });

      setCurrentStatus("On Duty");

      // Start location tracking
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { latitude, longitude };
          setLocation(newLocation);

          // Update location in Firebase
          updateDoc(employeeDocRef, {
            currentLocation: newLocation,
            lastUpdated: serverTimestamp(),
          }).catch((err) => console.error("Error updating location:", err));
        }
      );

      setWatchId(subscription);
      setIsWorking(true);
    } catch (error) {
      console.error("Error starting work:", error);
      Alert.alert("Error", "Failed to start work.");
    } finally {
      setLoading(false);
    }
  };

  const endWork = async () => {
    setLoading(true);
    if (watchId !== null) {
      watchId.remove();
      setWatchId(null);
    }

    try {
      if (!user?.uid) {
        throw new Error("User ID not available");
      }

      // Update employee status
      const employeeDocRef = doc(db, "employees", user.uid);
      await updateDoc(employeeDocRef, {
        isActive: false,
        lastUpdated: serverTimestamp(),
        status: "off_duty",
        statusMessage: "Employee shift ended",
      });

      // Update attendance record
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("employeeId", "==", user.uid),
        where("date", "==", new Date().toISOString().split("T")[0]),
        where("endTime", "==", null)
      );

      const querySnapshot = await getDocs(attendanceQuery);
      const updatePromises = [];
      
      querySnapshot.forEach((document) => {
        updatePromises.push(
          updateDoc(document.ref, {
            endTime: serverTimestamp(),
          })
        );
      });
      
      await Promise.all(updatePromises);

      setIsWorking(false);
      setCurrentStatus("Off Duty");
    } catch (error) {
      console.error("Error ending work:", error);
      Alert.alert("Error", "Failed to end work.");
    } finally {
      setLoading(false);
    }
  };

  const requestLeave = async () => {
    if (!leaveReason.trim()) {
      Alert.alert("Error", "Please enter a reason for the leave.");
      return;
    }

    try {
      if (!user?.uid || !employeeData) {
        throw new Error("Employee data not available");
      }

      await addDoc(collection(db, "leaves"), {
        employeeId: user.uid,
        employeeName: employeeData.name,
        companyName: employeeData.companyName,
        reason: leaveReason,
        leaveDate: new Date().toISOString().split("T")[0],
        status: "pending", // Admin will approve/reject
        timestamp: serverTimestamp(),
      });
      
      setModalVisible(false);
      setLeaveReason("");
      Alert.alert("Success", "Leave request submitted successfully.");
    } catch (error) {
      console.error("Error requesting leave:", error);
      Alert.alert("Error", "Failed to submit leave request.");
    }
  };

  const handleSignOut = async () => {
    if (isWorking) {
      Alert.alert(
        "Warning",
        "You are currently on duty. Do you want to end your shift and sign out?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "End Shift and Sign Out",
            style: "destructive",
            onPress: async () => {
              await endWork();
              await auth.signOut();
              navigation.replace('Home');
            },
          },
        ]
      );
    } else {
      try {
        await auth.signOut();
        navigation.replace('Home');
      } catch (error) {
        Alert.alert('Error', 'Failed to log out');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e88e5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e88e5" />
      <View style={styles.header}>
        <Text style={styles.headerText}>Employee Attendance</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Icon name="logout" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {employeeData && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>Name: {employeeData.name}</Text>
            <Text style={styles.infoText}>Company: {employeeData.companyDisplayName || employeeData.companyName}</Text>
          </View>
        )}

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Current Status:</Text>
          <Text
            style={[
              styles.statusValue,
              currentStatus === "On Duty" ? styles.onDuty : styles.offDuty,
            ]}
          >
            {currentStatus}
          </Text>
        </View>

        <View style={styles.mapContainer}>
          {location ? (
            <MapView
              style={styles.map}
              region={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation={true}
            >
              <Marker coordinate={location} title="Your Location" />
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text>Fetching location...</Text>
              <ActivityIndicator size="small" color="#1e88e5" style={{marginTop: 10}} />
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#1e88e5" />
          ) : isWorking ? (
            <TouchableOpacity
              style={[styles.button, styles.endButton]}
              onPress={endWork}
            >
              <Text style={styles.buttonText}>End Work</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={startWork}
            >
              <Text style={styles.buttonText}>Start Work</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, styles.leaveButton]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.buttonText}>Request Leave</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Leave Request Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Request Leave</Text>
            <TextInput
              placeholder="Enter leave reason"
              value={leaveReason}
              onChangeText={setLeaveReason}
              style={styles.input}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: "#757575" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={requestLeave}
              >
                <Text style={[styles.modalButtonText, { color: "#1e88e5" }]}>
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e3f2fd",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#e3f2fd",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333"
  },
  header: {
    backgroundColor: "#1e88e5",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 16,
  },
  headerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
  },
  statusContainer: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 18,
    marginRight: 10,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  onDuty: {
    color: "green",
  },
  offDuty: {
    color: "red",
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#90caf9",
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    marginHorizontal: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: "#1e88e5",
  },
  endButton: {
    backgroundColor: "#e53935",
  },
  leaveButton: {
    backgroundColor: "#4caf50",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 12,
    fontWeight: "bold",
  },
  input: {
    borderColor: "#1e88e5",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 10,
  },
  modalButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default EmployeeScreen;