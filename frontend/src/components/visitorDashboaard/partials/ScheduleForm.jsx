import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../../utils/axiosInstance.js";

// Common toast configuration to prevent errors
const toastConfig = {
  position: "top-center",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "light"
};

const ScheduleForm = ({
  isOpen,
  onClose,
  schedule,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    idType: "",
    idNumber: "",
    idExpiryDate: "",
    purpose: "",
    relationship: "",
    inmateId: "",
    visitDate: "",
    visitTime: "",
    visitDuration: 30,
    notes: "",
    visitorPhoto: null,
    idPhoto: null
  });
  
  const [inmates, setInmates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState(null);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [hasPendingSchedule, setHasPendingSchedule] = useState(false);
  const [disabledDates, setDisabledDates] = useState({});
  const [capacityInfo, setCapacityInfo] = useState({
    maxCapacity: 50,
    currentDailyVisits: {}
  });
  const [capacityHeatmap, setCapacityHeatmap] = useState([]);
  const [inmatesLoading, setInmatesLoading] = useState(false);
  const [inmatesError, setInmatesError] = useState(false);
  const [validatedUserId, setValidatedUserId] = useState(null);
  const [submitError, setSubmitError] = useState("");

  // Add this function above the useEffect
  const debugUserData = () => {
    console.log("-----DEBUG USER DATA-----");
    console.log("Token exists:", !!localStorage.getItem("token"));
    
    try {
      const userStr = localStorage.getItem("user");
      console.log("User string:", userStr);
      
      if (userStr) {
        const userData = JSON.parse(userStr);
        console.log("Parsed user data:", userData);
        console.log("User ID (_id):", userData._id);
        console.log("User ID (id):", userData.id);
        console.log("User ID (userId):", userData.userId);
        console.log("User role:", userData.role);
        console.log("User type:", userData.userType);
      } else {
        console.log("No user data in localStorage");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    
    // List all localStorage keys
    console.log("All localStorage keys:");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log(`${key}: ${localStorage.getItem(key).substring(0, 50)}...`);
    }
    console.log("-------------------------");
  };

  useEffect(() => {
    if (isOpen) {
      // Debug user data
      debugUserData();
      
      // Check if user is logged in and set up localStorage
      const userStr = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.log("No auth token found in localStorage");
        toast.error("Authentication required. Please log in to schedule a visit", toastConfig);
        return;
      }
      
      let userId = null;
      let userRole = "unknown";
      let isVisitor = false;
      
      // Try to get user data from localStorage
      try {
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user._id || user.id || user.userId || null;
          userRole = user.role || user.userType || "unknown";
          isVisitor = userRole.toLowerCase().includes('visitor');
          
          console.log("User data found:", { userId, userRole, isVisitor });
        } else {
          console.log("No user data found in localStorage");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
      
      // If we have a token but no valid userId, check other localStorage keys
      if (!userId && token) {
        console.log("Looking for userId in other localStorage keys");
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key !== "user" && key !== "token") {
            try {
              const value = JSON.parse(localStorage.getItem(key));
              if (value && (value._id || value.id || value.userId)) {
                userId = value._id || value.id || value.userId;
                userRole = value.role || value.userType || "unknown";
                isVisitor = userRole.toLowerCase().includes('visitor');
                console.log(`Found user data in localStorage key "${key}":`, { userId, userRole, isVisitor });
                break;
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON values
            }
          }
        }
      }
      
      // If we still don't have a userId but have a token, create a temporary visitor user
      if (!userId && token) {
        // Create a fallback userId from the token to ensure we can proceed
        // This is a last resort if we can't find a proper userId
        userId = "visitor-" + Date.now();
        userRole = "visitor";
        isVisitor = true;
        
        // Store this temporary user data
        const tempUser = { _id: userId, role: userRole };
        localStorage.setItem("tempVisitorUser", JSON.stringify(tempUser));
        console.log("Created temporary visitor user:", tempUser);
        
        toast.info("Using temporary visitor profile. Your information may not be saved correctly.", toastConfig);
      }
      
      if (!userId) {
        console.log("No user ID could be found or created");
        toast.error("User data is invalid. Please try logging in again as a visitor.", toastConfig);
      } else if (!isVisitor) {
        console.log("User is not a visitor:", userRole);
        toast.error(`You must be logged in as a visitor to schedule a visit. Current role: ${userRole}`, toastConfig);
      } else {
        console.log("Using visitor ID:", userId);
        
        // Store the validated user ID for later use
        setValidatedUserId(userId);
        
        // Continue with regular initialization
        fetchInmates();
        fetchCapacityInfo();
        
        // Only check for pending schedules if we're creating a new schedule, not editing
        if (!schedule) {
          checkPendingSchedules(userId);
        }
      }
      
      // If editing an existing schedule
      if (schedule) {
        setFormData({
          firstName: schedule.firstName || "",
          middleName: schedule.middleName || "",
          lastName: schedule.lastName || "",
          phone: schedule.phone || "",
          idType: schedule.idType || "",
          idNumber: schedule.idNumber || "",
          idExpiryDate: schedule.idExpiryDate ? new Date(schedule.idExpiryDate).toISOString().split('T')[0] : "",
          purpose: schedule.purpose || "",
          relationship: schedule.relationship || "",
          inmateId: schedule.inmateId?._id || schedule.inmateId || "",
          visitDate: schedule.visitDate ? new Date(schedule.visitDate).toISOString().split('T')[0] : "",
          visitTime: schedule.visitTime || "",
          visitDuration: schedule.visitDuration || 30,
          notes: schedule.notes || "",
          visitorPhoto: null,
          idPhoto: null
        });
      } else {
        // For new schedules, reset form
        setFormData({
          firstName: "",
          middleName: "",
          lastName: "",
          phone: "",
          idType: "",
          idNumber: "",
          idExpiryDate: "",
          purpose: "",
          relationship: "",
          inmateId: "",
          visitDate: "",
          visitTime: "",
          visitDuration: 30,
          notes: "",
          visitorPhoto: null,
          idPhoto: null
        });
      }
    }
    
    // Cleanup function to prevent errors when component unmounts
    return () => {
      // Clear any pending state updates that might cause errors
      // This helps prevent React state updates on unmounted component
    };
  }, [isOpen, schedule]);

  useEffect(() => {
    if (capacityInfo.currentDailyVisits && Object.keys(capacityInfo.currentDailyVisits).length > 0) {
      generateCapacityHeatmap();
    }
  }, [capacityInfo.currentDailyVisits]);

  const fetchInmates = async () => {
    setInmatesLoading(true);
    setInmatesError(false);
    
    try {
      const response = await axiosInstance.get("/visitor/schedule/inmates");
      
      if (response.data && response.data.success) {
        // Set inmates from the data property based on the controller's response structure
        const inmateData = response.data.data || [];
        
        if (inmateData.length === 0) {
          // If no inmates found, add a default option for demonstration purposes
          setInmates([
            {
              _id: "default-inmate",
              fullName: "Default Inmate (Demo)",
              prisonerId: "DEMO-12345"
            }
          ]);
        } else {
          setInmates(inmateData);
        }
      } else if (response.data && Array.isArray(response.data.inmates)) {
        // Alternative format if API returns inmates directly
        if (response.data.inmates.length === 0) {
          // If empty array, add default option
          setInmates([
            {
              _id: "default-inmate",
              fullName: "Default Inmate (Demo)",
              prisonerId: "DEMO-12345"
            }
          ]);
        } else {
          setInmates(response.data.inmates);
        }
      } else {
        console.error("Invalid inmate data structure:", response.data);
        // Set a default inmate for demonstration
        setInmates([
          {
            _id: "default-inmate",
            fullName: "Default Inmate (Demo)",
            prisonerId: "DEMO-12345"
          }
        ]);
        toast.info("Using a default inmate for demonstration purposes", toastConfig);
      }
    } catch (error) {
      console.error("Error fetching inmates:", error);
      // Add a demo inmate
      setInmates([
        {
          _id: "default-inmate",
          fullName: "Default Inmate (Demo)",
          prisonerId: "DEMO-12345"
        }
      ]);
      toast.info("Using a default inmate for demonstration purposes", toastConfig);
      
      // Make inmate selection optional on error
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.inmateId;
        return newErrors;
      });
    } finally {
      setInmatesLoading(false);
    }
  };

  const fetchCapacityInfo = async () => {
    try {
      const response = await axiosInstance.get('/visitor/schedule/capacity');
      
      if (response.data && response.data.success) {
        const maxCapacity = response.data.maxCapacity || 50;
        
        // Fetch daily visit counts for the next 30 days
        const dailyVisitsResponse = await axiosInstance.get('/visitor/schedule/daily-visits');
        
        if (dailyVisitsResponse.data && dailyVisitsResponse.data.success) {
          const dailyVisits = dailyVisitsResponse.data.dailyVisits || {};
          
          // Calculate which dates are at or above capacity
          const disabledDatesObj = {};
          Object.keys(dailyVisits).forEach(date => {
            if (dailyVisits[date] >= maxCapacity) {
              disabledDatesObj[date] = true;
            }
          });
          
          setDisabledDates(disabledDatesObj);
          setCapacityInfo({
            maxCapacity,
            currentDailyVisits: dailyVisits
          });
        }
      }
    } catch (error) {
      console.error("Error fetching capacity info:", error);
      // Default empty disabled dates if API fails
      setDisabledDates({});
    }
  };

  const checkPendingSchedules = async (userId) => {
    try {
      console.log("Checking pending schedules for user:", userId);
      
      const response = await axiosInstance.get(`/visitor/schedule/check-pending?userId=${userId}`);
      
      if (response.data && response.data.hasPendingSchedule) {
        setHasPendingSchedule(true);
        // Only show the toast if not in edit mode
        if (!schedule) {
          toast.error("You already have a pending visit schedule. Please wait for approval or cancel your existing schedule before creating a new one.", toastConfig);
        }
      } else {
        setHasPendingSchedule(false);
      }
    } catch (error) {
      console.error("Error checking pending schedules:", error);
      // Don't show an error to the user, just silently fail
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ""
      });
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData({
        ...formData,
        [name]: files[0]
      });
      
      // Set preview
      if (name === "visitorPhoto") {
        setPhotoPreview(URL.createObjectURL(files[0]));
      } else if (name === "idPhoto") {
        setIdPhotoPreview(URL.createObjectURL(files[0]));
      }
      
      // Clear error
      if (errors[name]) {
        setErrors({
          ...errors,
          [name]: ""
        });
      }
    }
  };

  const validateStep = (stepNumber) => {
    const newErrors = {};
    
    if (stepNumber === 1) {
      if (!formData.firstName) newErrors.firstName = "First name is required";
      if (!formData.lastName) newErrors.lastName = "Last name is required";
      if (!formData.phone) newErrors.phone = "Phone number is required";
      if (!formData.idType) newErrors.idType = "ID type is required";
      if (!formData.idNumber) newErrors.idNumber = "ID number is required";
      
      // Only require photos for new schedules, not edits
      if (!schedule) {
        if (!formData.visitorPhoto) newErrors.visitorPhoto = "Visitor photo is required";
        if (!formData.idPhoto) newErrors.idPhoto = "ID photo is required";
      }
    } else if (stepNumber === 2) {
      if (!formData.purpose) newErrors.purpose = "Purpose is required";
      if (!formData.relationship) newErrors.relationship = "Relationship is required";
      
      // Only require inmate selection if inmates are available and not in demo mode
      if (inmates && Array.isArray(inmates) && inmates.length > 0 && 
          !inmates.some(inmate => inmate._id === "default-inmate") && 
          !formData.inmateId) {
        newErrors.inmateId = "Please select an inmate";
      }
      
      if (!formData.visitDate) newErrors.visitDate = "Visit date is required";
      if (!formData.visitTime) newErrors.visitTime = "Visit time is required";
      
      // Check if selected date is disabled (at capacity)
      if (formData.visitDate && isDateDisabled(formData.visitDate)) {
        newErrors.visitDate = "This date has reached maximum visitor capacity. Please select another date.";
        
        // Suggest next available date
        const nextDate = getNextAvailableDate();
        if (nextDate) {
          newErrors.visitDate += ` Next available date is ${new Date(nextDate).toLocaleDateString()}.`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    // Validate form
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      const formDataToSend = new FormData();
      
      // Create a cleaned copy of the form data for submission
      const cleanedFormData = { ...formData };
      
      // Handle inmateId properly - must be a valid ObjectId or undefined (not empty string or null)
      if (!cleanedFormData.inmateId || cleanedFormData.inmateId === '') {
        // Don't include inmateId at all rather than sending null or empty string
        delete cleanedFormData.inmateId;
      } else if (cleanedFormData.inmateId === 'default-inmate') {
        // If it's the demo inmate, keep as is
        // formDataToSend.append('inmateId', 'default-inmate');
      } else if (!cleanedFormData.inmateId.match(/^[0-9a-fA-F]{24}$/)) {
        // If it's not a valid ObjectId format, remove it
        delete cleanedFormData.inmateId;
      }
      
      // Add all form fields to FormData
      Object.keys(cleanedFormData).forEach(key => {
        // Skip null values
        if (cleanedFormData[key] !== null && cleanedFormData[key] !== undefined) {
          // Handle file uploads
          if ((key === 'visitorPhoto' || key === 'idPhoto') && cleanedFormData[key] instanceof File) {
            formDataToSend.append(key, cleanedFormData[key]);
          } else {
            formDataToSend.append(key, cleanedFormData[key]);
          }
        }
      });
      
      console.log("Preparing to submit schedule with data:", cleanedFormData);
      
      // Use the correct endpoint based on whether we're creating or updating
      const isEditing = !!schedule?._id;
      const url = isEditing
        ? `/visitor/schedule/schedule/${schedule._id}`
        : "/visitor/schedule/schedule";
      
      console.log(`Submitting to ${url}`);
      
      const response = await axiosInstance.put(url, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const data = response.data;
      
      if (data.success) {
        console.log("Schedule submitted successfully:", data);
        toast.success(isEditing ? "Schedule updated successfully!" : "Schedule created successfully!", toastConfig);
        
        // Allow the toast to be displayed before closing the form
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 500);
      } else {
        console.error("Failed to submit schedule:", data);
        
        // Handle validation errors returned from server
        if (data.validationErrors) {
          setErrors(data.validationErrors);
        } else {
          setSubmitError(data.message || "Failed to submit schedule. Please try again.");
          toast.error(data.message || "Failed to submit schedule", toastConfig);
        }
      }
    } catch (error) {
      console.error("Error submitting schedule:", error);
      setSubmitError("An unexpected error occurred. Please try again.");
      
      // Safe error handling for toast
      const errorMessage = error.response?.data?.message || "An unexpected error occurred";
      toast.error(errorMessage, toastConfig);
      
      // Handle validation errors from server
      if (error.response && error.response.data && error.response.data.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate minimum date (today)
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  
  // Maximum date (30 days from now)
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateString = maxDate.toISOString().split('T')[0];

  // Helper function to check if a date is disabled
  const isDateDisabled = (dateString) => {
    if (!dateString || !disabledDates) return false;
    return disabledDates[dateString] || false;
  };

  // Find the next available date
  const getNextAvailableDate = () => {
    if (!disabledDates) return null;
    
    let checkDate = new Date(today);
    let foundDate = null;
    
    // Check next 30 days
    for (let i = 0; i < 30; i++) {
      const dateString = checkDate.toISOString().split('T')[0];
      if (!isDateDisabled(dateString)) {
        foundDate = dateString;
        break;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    
    return foundDate;
  };

  // Message about next available date
  const nextAvailableDate = getNextAvailableDate();
  const nextAvailableDateMessage = nextAvailableDate 
    ? `Next available date: ${new Date(nextAvailableDate).toLocaleDateString()}`
    : "No available dates in the next 30 days";

  const generateCapacityHeatmap = () => {
    const today = new Date();
    const heatmap = [];
    
    // Safety check - if capacity info is missing, use defaults
    const maxCapacity = capacityInfo && capacityInfo.maxCapacity ? capacityInfo.maxCapacity : 50;
    const dailyVisits = capacityInfo && capacityInfo.currentDailyVisits ? capacityInfo.currentDailyVisits : {};
    
    // Generate data for the next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const visitorCount = dailyVisits[dateStr] || 0;
      const percentFull = (visitorCount / maxCapacity) * 100;
      
      let status = 'available';
      let color = 'bg-green-100 text-green-800';
      
      if (percentFull >= 100) {
        status = 'full';
        color = 'bg-red-100 text-red-800';
      } else if (percentFull >= 80) {
        status = 'limited';
        color = 'bg-amber-100 text-amber-800';
      } else if (percentFull >= 50) {
        status = 'moderate';
        color = 'bg-blue-100 text-blue-800';
      }
      
      heatmap.push({
        date,
        dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayDate: date.getDate(),
        visitorCount,
        percentFull,
        status,
        color
      });
    }
    
    setCapacityHeatmap(heatmap);
  };

  // Render the capacity heatmap
  const renderCapacityHeatmap = () => {
    if (!capacityHeatmap || !Array.isArray(capacityHeatmap) || capacityHeatmap.length === 0) {
      return null;
    }
    
    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Visit availability for next 7 days:</h4>
        <div className="grid grid-cols-7 gap-1">
          {capacityHeatmap.map((day) => (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => {
                if (day.status !== 'full') {
                  setFormData({
                    ...formData,
                    visitDate: day.dateStr
                  });
                  // Clear error if exists
                  if (errors.visitDate) {
                    setErrors({
                      ...errors,
                      visitDate: ""
                    });
                  }
                }
              }}
              className={`p-1 rounded text-center ${day.color} ${
                formData.visitDate === day.dateStr ? 'ring-2 ring-offset-1 ring-blue-500' : ''
              } ${day.status === 'full' ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
            >
              <div className="text-xs font-bold">{day.dayName}</div>
              <div className="text-sm">{day.dayDate}</div>
              <div className="text-xs mt-1">
                {day.status === 'full' ? 'Full' : 
                  day.status === 'limited' ? 'Limited' : 
                  day.status === 'moderate' ? 'Moderate' : 
                  'Available'}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Add this function before the return statement
  const checkScheduleVisibility = async () => {
    try {
      console.log("Checking schedule visibility in the list...");
      const response = await axiosInstance.get("/visitor/schedule/schedules");
      
      if (response.data.success && Array.isArray(response.data.data)) {
        console.log("Retrieved schedules:", response.data.data.length);
        console.log("Schedules data:", response.data.data);
        // If we have a validated user ID, check if their schedules are in the list
        if (validatedUserId) {
          const userSchedules = response.data.data.filter(schedule => 
            (schedule.userId === validatedUserId) || 
            (schedule.visitorId === validatedUserId)
          );
          console.log(`Found ${userSchedules.length} schedules for user ID ${validatedUserId}`);
          console.log("User's schedules:", userSchedules);
        }
      } else {
        console.error("Unexpected response format when checking schedules:", response.data);
      }
    } catch (error) {
      console.error("Error checking schedule visibility:", error);
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const errors = {};
    
    // Personal information validations
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.phone.trim()) errors.phone = "Phone number is required";
    
    // ID validations
    if (!formData.idType.trim()) errors.idType = "ID type is required";
    if (!formData.idNumber.trim()) errors.idNumber = "ID number is required";
    
    // Visit details validations
    if (!formData.purpose.trim()) errors.purpose = "Purpose is required";
    if (!formData.relationship.trim()) errors.relationship = "Relationship is required";
    if (!formData.visitDate.trim()) errors.visitDate = "Visit date is required";
    if (!formData.visitTime.trim()) errors.visitTime = "Visit time is required";
    
    // Validate date is not in the past
    if (formData.visitDate) {
      const selectedDate = new Date(formData.visitDate);
      const currentDate = new Date();
      
      // Set time to start of day for date-only comparison
      selectedDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < currentDate) {
        errors.visitDate = "Visit date cannot be in the past";
      }
    }
    
    return errors;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-teal-600 p-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {schedule ? "Update Visit Schedule" : "Schedule a Visit"}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Pending Schedule Warning - only show when creating a new schedule */}
        {hasPendingSchedule && !schedule && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <span className="font-medium">Warning:</span> You already have a pending visit schedule. 
                  You cannot create a new schedule until your current one is approved, rejected, or canceled.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Editing Schedule Information */}
        {schedule && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Information:</span> You are updating an existing visit schedule.
                  Your changes will be submitted for review.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Capacity Warning (if many dates are disabled) */}
        {Object.keys(disabledDates).length > 10 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 m-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-medium">Note:</span> Many dates have reached visitor capacity. 
                  {nextAvailableDate ? ` The next available date is ${new Date(nextAvailableDate).toLocaleDateString()}.` : ' There are no available dates in the next 30 days.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="p-6" onSubmit={(e) => {
          e.preventDefault();
          console.log("Form onSubmit triggered");
          handleSubmit(e);
        }}>
          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.firstName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.lastName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Type *
                  </label>
                  <select
                    name="idType"
                    value={formData.idType}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.idType ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select ID Type</option>
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                    <option value="drivers_license">Driver's License</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.idType && (
                    <p className="text-red-500 text-xs mt-1">{errors.idType}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Number *
                  </label>
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.idNumber ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.idNumber && (
                    <p className="text-red-500 text-xs mt-1">{errors.idNumber}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Expiry Date
                  </label>
                  <input
                    type="date"
                    name="idExpiryDate"
                    value={formData.idExpiryDate}
                    onChange={handleChange}
                    min={minDate}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visitor Photo {!schedule && "*"}
                  </label>
                  <input
                    type="file"
                    name="visitorPhoto"
                    accept="image/*"
                    onChange={handleFileChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.visitorPhoto ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.visitorPhoto && (
                    <p className="text-red-500 text-xs mt-1">{errors.visitorPhoto}</p>
                  )}
                  {(photoPreview || (schedule && schedule.visitorPhoto)) && (
                    <div className="mt-2">
                      <img
                        src={photoPreview || (schedule && schedule.visitorPhoto ? 
                          (schedule.visitorPhoto.startsWith('http') ? 
                            schedule.visitorPhoto : 
                            `http://localhost:5001${schedule.visitorPhoto}`
                          ) : 
                          ''
                        )}
                        alt="Visitor preview"
                        className="w-32 h-32 object-cover border border-gray-300 rounded-md"
                        onError={(e) => {
                          console.error("Failed to load visitor photo:", e);
                          e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Photo {!schedule && "*"}
                  </label>
                  <input
                    type="file"
                    name="idPhoto"
                    accept="image/*"
                    onChange={handleFileChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.idPhoto ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.idPhoto && (
                    <p className="text-red-500 text-xs mt-1">{errors.idPhoto}</p>
                  )}
                  {(idPhotoPreview || (schedule && schedule.idPhoto)) && (
                    <div className="mt-2">
                      <img
                        src={idPhotoPreview || (schedule && schedule.idPhoto ? 
                          (schedule.idPhoto.startsWith('http') ? 
                            schedule.idPhoto : 
                            `http://localhost:5001${schedule.idPhoto}`
                          ) : 
                          ''
                        )}
                        alt="ID preview"
                        className="w-32 h-32 object-cover border border-gray-300 rounded-md"
                        onError={(e) => {
                          console.error("Failed to load ID photo:", e);
                          e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          
          {/* Step 2: Visit Details */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Visit Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose of Visit *
                  </label>
                  <input
                    type="text"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.purpose ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.purpose && (
                    <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship to Inmate *
                  </label>
                  <select
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.relationship ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Relationship</option>
                    <option value="parent">Parent</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="sibling">Sibling</option>
                    <option value="relative">Other Relative</option>
                    <option value="friend">Friend</option>
                    <option value="legal">Legal Representative</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.relationship && (
                    <p className="text-red-500 text-xs mt-1">{errors.relationship}</p>
                  )}
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Inmate {inmates && inmates.length > 0 ? "*" : "(Optional)"}
                      {inmatesLoading && <span className="ml-2 text-xs text-blue-600">Loading...</span>}
                    </label>
                    
                    {inmatesError && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          fetchInmates();
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Retry loading inmates
                      </button>
                    )}
                  </div>
                  
                  {inmatesLoading ? (
                    <div className="w-full p-6 flex justify-center">
                      <div className="animate-pulse text-center">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                      </div>
                    </div>
                  ) : inmates && inmates.length > 0 ? (
                    <select
                      name="inmateId"
                      value={formData.inmateId}
                      onChange={handleChange}
                      className={`w-full p-2 border rounded-md ${
                        errors.inmateId ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Inmate</option>
                      {inmates.map((inmate) => (
                        <option key={inmate._id} value={inmate._id}>
                          {inmate.fullName} {inmate.prisonerId ? `(ID: ${inmate.prisonerId})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mb-2">
                      <input
                        type="text"
                        name="inmateId"
                        value={formData.inmateId}
                        onChange={handleChange}
                        placeholder="Enter inmate name or ID (optional)"
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                      <p className="text-xs text-gray-500 mt-1 italic">
                        {inmatesError 
                          ? "Error loading inmates. You can enter inmate details manually."
                          : "No inmates available from the system. You can enter inmate details manually."}
                      </p>
                    </div>
                  )}
                  
                  {errors.inmateId && (
                    <p className="text-red-500 text-xs mt-1">{errors.inmateId}</p>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Visit Date *
                </label>
                
                {/* Render the capacity heatmap */}
                {capacityHeatmap.length > 0 && renderCapacityHeatmap()}
                
                <input
                  type="date"
                  name="visitDate"
                  value={formData.visitDate}
                  onChange={handleChange}
                  min={minDate}
                  max={maxDateString}
                  className={`w-full p-2 border rounded-md ${
                    errors.visitDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.visitDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.visitDate}</p>
                )}
                {nextAvailableDate && (
                  <p className="text-xs text-gray-500 mt-1">{nextAvailableDateMessage}</p>
                )}
                {/* Display capacity info for selected date */}
                {formData.visitDate && 
                 capacityInfo && 
                 capacityInfo.currentDailyVisits && 
                 capacityInfo.currentDailyVisits[formData.visitDate] !== undefined && (
                  <div className="mt-1 px-2 py-1 rounded bg-gray-50 border border-gray-200">
                    <p className={`text-xs ${
                      capacityInfo.currentDailyVisits[formData.visitDate] >= (capacityInfo.maxCapacity || 50) * 0.8 
                        ? capacityInfo.currentDailyVisits[formData.visitDate] >= (capacityInfo.maxCapacity || 50) * 0.95 
                          ? "text-red-600 font-medium" 
                          : "text-amber-600 font-medium"
                        : "text-green-600"
                    }`}>
                      Visitors for this date: {capacityInfo.currentDailyVisits[formData.visitDate]} / {capacityInfo.maxCapacity || 50}
                      {capacityInfo.currentDailyVisits[formData.visitDate] >= (capacityInfo.maxCapacity || 50) * 0.8 && 
                        capacityInfo.currentDailyVisits[formData.visitDate] < (capacityInfo.maxCapacity || 50) &&
                        " (Limited availability)"
                      }
                    </p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visit Time *
                  </label>
                  <select
                    name="visitTime"
                    value={formData.visitTime}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${
                      errors.visitTime ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Time</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                  </select>
                  {errors.visitTime && (
                    <p className="text-red-500 text-xs mt-1">{errors.visitTime}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visit Duration (minutes)
                  </label>
                  <select
                    name="visitDuration"
                    value={formData.visitDuration}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Any additional information or special requests..."
                ></textarea>
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log("Submit button clicked directly");
                    handleSubmit(e);
                  }}
                  disabled={isSubmitting || (hasPendingSchedule && !schedule)}
                  className={`px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors ${
                    (isSubmitting || (hasPendingSchedule && !schedule)) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting ? "Submitting..." : schedule ? "Update Schedule" : "Schedule Visit"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ScheduleForm; 