import { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FaSearch,
  FaExclamationTriangle,
  FaUser,
  FaFileAlt,
  FaPhone,
  FaNotesMedical,
  FaChevronDown,
  FaChevronUp,
  FaPrint,
} from "react-icons/fa";
import TransferButton from "./TransferButton";

export default function AddWoredaInmate() {
  const [prisons, setPrisons] = useState([]);
  const [inmates, setInmates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredInmates, setFilteredInmates] = useState([]);
  const isCollapsed = useSelector((state) => state.sidebar.isCollapsed);
  const [, setForceUpdate] = useState(0); // For forcing timer updates
  const [prisonerData, setPrisonerData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "male",
    crime: "",
    sentenceStart: "",
    sentenceEnd: "",
    paroleEligibility: false,
    medicalConditions: "",
    riskLevel: "Low",
    specialRequirements: "",
    intakeDate: new Date().toISOString().split("T")[0],
    arrestingOfficer: "",
    holdingCell: "",
    assignedPrison: "",
    documents: [],
  });
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedInmate, setSelectedInmate] = useState(null);
  const [selectedPrison, setSelectedPrison] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [prisonError, setPrisonError] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    criminal: false,
    contact: false,
    medical: false,
  });

  const navigate = useNavigate();

  // Live timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setForceUpdate((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchPrisons();
    fetchInmates();
  }, []);

  const fetchPrisons = async () => {
    try {
      const response = await axiosInstance.get("/prison/getall-prisons");
      console.log("Prison response:", response.data);
      if (response.data?.success) {
        setPrisons(response.data.prisons || []);
      }
    } catch (error) {
      console.error("Error fetching prisons:", error);
      console.error("Error details:", error.response?.data);
      toast.error("Failed to fetch prison data");
    }
  };

  const calculateTimeRemaining = (intakeDate) => {
    const intakeTime = new Date(intakeDate).getTime();
    const currentTime = new Date().getTime();
    const elapsedTime = currentTime - intakeTime;
    const remainingTime = 48 * 60 * 60 * 1000 - elapsedTime; // 48 hours minus elapsed time
    return Math.max(0, remainingTime); // Ensure no negative time
  };

  const formatTimeRemaining = (remainingTime) => {
    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor(
      (remainingTime % (1000 * 60 * 60)) / (1000 * 60)
    );
    return `${hours} hours ${minutes} minutes`;
  };

  const fetchInmates = async () => {
    try {
      const response = await axiosInstance.get("/woreda-inmate/getall-inmates");
      if (response.data?.success) {
        const data = response.data.inmates.map((inmate) => {
          const timeRemaining = calculateTimeRemaining(inmate.intakeDate);
          return {
            ...inmate,
            timeRemaining,
          };
        });

        // First set all inmates
        setInmates(data);

        // Log the data for debugging
        console.log("All inmates:", data);
        console.log(
          "Inmates with time details:",
          data.map((inmate) => ({
            name: inmate.firstName,
            timeRemaining: inmate.timeRemaining,
            hoursRemaining: inmate.timeRemaining / (60 * 60 * 1000),
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching inmates:", error);
      toast.error("Failed to fetch inmate data");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrisonerData((prev) => ({
      ...prev,
      [name]: name === "paroleEligibility" ? value === "true" : value,
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setPrisonerData((prev) => ({
      ...prev,
      documents: files,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      Object.entries(prisonerData).forEach(([key, value]) => {
        if (key === "documents") {
          prisonerData.documents.forEach((file) => {
            formData.append("documents", file);
          });
        } else if (key === "paroleEligibility") {
          formData.append(key, value.toString());
        } else {
          formData.append(key, value);
        }
      });

      const response = await axiosInstance.post(
        "/woreda-inmate/register",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        toast.success("Inmate registered successfully!");
        setShowForm(false);
        fetchInmates();
        setPrisonerData({
          firstName: "",
          middleName: "",
          lastName: "",
          dateOfBirth: "",
          gender: "male",
          crime: "",
          sentenceStart: "",
          sentenceEnd: "",
          paroleEligibility: false,
          medicalConditions: "",
          riskLevel: "Low",
          specialRequirements: "",
          intakeDate: new Date().toISOString().split("T")[0],
          arrestingOfficer: "",
          holdingCell: "",
          assignedPrison: "",
          documents: [],
        });
      }
    } catch (error) {
      console.error("Error registering inmate:", error);
      toast.error(error.response?.data?.error || "Failed to register inmate");
    }
  };

  const handleTransferClick = (inmate) => {
    setSelectedInmate(inmate);
    setTransferModalOpen(true);
  };

  const handleTransfer = async () => {
    if (!selectedPrison || !transferReason) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const transferData = {
        inmateId: selectedInmate._id,
        toPrison: selectedPrison,
        reason: transferReason,
        status: "Pending",
        inmateData: {
          firstName: selectedInmate.firstName,
          lastName: selectedInmate.lastName,
          middleName: selectedInmate.middleName,
          dateOfBirth: selectedInmate.dateOfBirth,
          gender: selectedInmate.gender,
          crime: selectedInmate.crime,
          sentenceStart: selectedInmate.sentenceStart,
          sentenceEnd: selectedInmate.sentenceEnd,
          paroleEligibility: selectedInmate.paroleEligibility,
          medicalConditions: selectedInmate.medicalConditions,
          riskLevel: selectedInmate.riskLevel,
          specialRequirements: selectedInmate.specialRequirements,
          intakeDate: selectedInmate.intakeDate,
          arrestingOfficer: selectedInmate.arrestingOfficer,
          holdingCell: selectedInmate.holdingCell,
          documents: selectedInmate.documents,
        },
      };

      const response = await axiosInstance.post(
        "/api/transfer/create-transfer",
        transferData
      );

      if (response.data?.success) {
        toast.success("Transfer request submitted successfully");
        setTransferModalOpen(false);
        setSelectedPrison("");
        setTransferReason("");
        setSelectedInmate(null);
        fetchInmates();
      }
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast.error(
        error.response?.data?.error || "Failed to submit transfer request"
      );
    }
  };

  const handleViewDetails = (inmateId) => {
    navigate(`/woreda-dashboard/inmates/${inmateId}`);
  };

  const getTimeStatus = (remainingTime) => {
    if (remainingTime <= 4 * 60 * 60 * 1000) {
      return {
        color: "text-red-600",
        status: "Critical",
      };
    } else if (remainingTime <= 12 * 60 * 60 * 1000) {
      return {
        color: "text-yellow-600",
        status: "Warning",
      };
    } else {
      return {
        color: "text-green-600",
        status: "Normal",
      };
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handlePrintTransfer = () => {
    const printWindow = window.open("", "", "width=800,height=600");
    const currentDate = new Date().toLocaleString();

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transfer Request - ${selectedInmate?.firstName} ${
      selectedInmate?.lastName
    }</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-left: 10px; }
            .transfer-details { background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
            .signature-section { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
            .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 10px; text-align: center; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .transfer-details { background-color: #f8f8f8 !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Inmate Transfer Request</h1>
            <p>Generated on ${currentDate}</p>
        </div>

          <div class="section">
            <div class="section-title">Inmate Information</div>
            <div class="grid">
              <div class="field">
                <span class="label">Full Name:</span>
                <span class="value">${selectedInmate?.firstName} ${
      selectedInmate?.lastName
    }</span>
              </div>
              <div class="field">
                <span class="label">Age:</span>
                <span class="value">${selectedInmate?.age}</span>
              </div>
              <div class="field">
                <span class="label">Gender:</span>
                <span class="value">${selectedInmate?.gender}</span>
              </div>
              <div class="field">
                <span class="label">Intake Date:</span>
                <span class="value">${new Date(
                  selectedInmate?.intakeDate
                ).toLocaleDateString()}</span>
              </div>
            </div>
        </div>

          <div class="section">
            <div class="section-title">Criminal Information</div>
            <div class="grid">
              <div class="field">
                <span class="label">Crime:</span>
                <span class="value">${selectedInmate?.crime}</span>
              </div>
              <div class="field">
                <span class="label">Case Number:</span>
                <span class="value">${
                  selectedInmate?.caseNumber || "N/A"
                }</span>
              </div>
              <div class="field">
                <span class="label">Time Remaining:</span>
                <span class="value">${formatTimeRemaining(
                  selectedInmate?.timeRemaining
                )}</span>
              </div>
            </div>
        </div>

          <div class="section">
            <div class="section-title">Medical Information</div>
            <div class="grid">
              <div class="field">
                <span class="label">Medical Conditions:</span>
                <span class="value">${
                  selectedInmate?.medicalConditions || "None"
                }</span>
              </div>
              <div class="field">
                <span class="label">Allergies:</span>
                <span class="value">${
                  selectedInmate?.allergies || "None"
                }</span>
              </div>
            </div>
        </div>

          <div class="transfer-details">
            <div class="section-title">Transfer Details</div>
            <div class="field">
              <span class="label">Destination Prison:</span>
              <span class="value">${
                prisons.find((p) => p._id === selectedPrison)?.prison_name ||
                "Not selected"
              }</span>
            </div>
            <div class="field">
              <span class="label">Transfer Reason:</span>
              <span class="value">${transferReason || "Not specified"}</span>
            </div>
            <div class="field">
              <span class="label">Request Date:</span>
              <span class="value">${currentDate}</span>
            </div>
        </div>

          <div class="signature-section">
            <div class="signature-line">
              <p>Requesting Officer Signature</p>
              <p>Name: _______________________</p>
              <p>Date: _______________________</p>
        </div>
            <div class="signature-line">
              <p>Approving Authority Signature</p>
              <p>Name: _______________________</p>
              <p>Date: _______________________</p>
        </div>
        </div>

          <div class="footer">
            <p>This is an official transfer request document. Please maintain for records.</p>
            <p>Document ID: TR-${selectedInmate?._id}-${Date.now()}</p>
        </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = function () {
      printWindow.print();
    };
  };

  // Add handleSearch function
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = inmates.filter(
      (inmate) =>
        inmate.firstName.toLowerCase().includes(term) ||
        inmate.lastName.toLowerCase().includes(term) ||
        inmate.crime.toLowerCase().includes(term)
    );
    setFilteredInmates(filtered);
  };

  return (
    <div className="flex mt-10">
      {/* Sidebar Spacing Fix */}
      <div
        className={`transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      />

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Fixed Header */}
        <div
          className={`bg-white shadow-md p-4 fixed top-14 z-50 flex justify-between items-center transition-all duration-300 ${
            isCollapsed
              ? "left-16 w-[calc(100%-4rem)]"
              : "left-64 w-[calc(100%-16rem)]"
          }`}
        >
          <h1 className="text-2xl font-bold text-gray-800">Woreda Inmates</h1>
          <div className="flex flex-col md:flex-row justify-end items-center gap-4">
            <div className="relative w-full md:w-64">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                onChange={handleSearch}
                placeholder="Search by name or crime"
                className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add New Inmate
            </button>
          </div>
        </div>

        {/* Push content down to prevent overlap */}
        <div className="mt-24">
          {/* Notifications Section */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Custody Alerts</h2>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 rounded-lg ${
                    notification.isRead
                      ? "bg-gray-50"
                      : "bg-yellow-50 border border-yellow-200"
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <p className="text-sm text-gray-700">
                      {notification.message}
                    </p>
                    {!notification.isRead && (
                      <button
                        onClick={() => markNotificationAsRead(notification._id)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No custody alerts
                </p>
              )}
            </div>
          </div>

          {/* Inmates Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Crime
                    </th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Prison
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Remaining
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(searchTerm ? filteredInmates : inmates).map((inmate) => (
                    <tr key={inmate._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {inmate.firstName} {inmate.lastName}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {inmate.crime}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {prisons.find(p => p._id === inmate.assignedPrison)?.prison_name || "Not assigned"}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            inmate.timeRemaining <= 4 * 60 * 60 * 1000
                              ? "bg-red-100 text-red-800"
                              : inmate.timeRemaining <= 12 * 60 * 60 * 1000
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {formatTimeRemaining(inmate.timeRemaining)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {getTimeStatus(inmate.timeRemaining).status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleViewDetails(inmate._id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path
                                fillRule="evenodd"
                                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="hidden md:inline">View</span>
                          </button>
                          <TransferButton
                            inmate={inmate}
                            onTransferComplete={handleTransfer}
                            currentPrison={inmate.assignedPrison}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add New Inmate Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Inmate</DialogTitle>
              <DialogDescription>
                Fill in the inmate's information below.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 [&_input]:border [&_input]:border-gray-300 [&_input]:px-3 [&_input]:py-2 [&_input]:rounded-md [&_input]:shadow-sm [&_input]:focus:border-blue-500 [&_input]:focus:ring-1 [&_input]:focus:ring-blue-500 [&_select]:border [&_select]:border-gray-300 [&_select]:px-3 [&_select]:py-2 [&_select]:rounded-md [&_select]:shadow-sm [&_select]:focus:border-blue-500 [&_select]:focus:ring-1 [&_select]:focus:ring-blue-500 [&_textarea]:border [&_textarea]:border-gray-300 [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:rounded-md [&_textarea]:shadow-sm [&_textarea]:focus:border-blue-500 [&_textarea]:focus:ring-1 [&_textarea]:focus:ring-blue-500"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={prisonerData.firstName}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Middle Name *
                  </label>
                  <input
                    type="text"
                    name="middleName"
                    value={prisonerData.middleName}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={prisonerData.lastName}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={prisonerData.dateOfBirth}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={prisonerData.gender}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Crime *
                  </label>
                  <input
                    type="text"
                    name="crime"
                    value={prisonerData.crime}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sentence Start Date *
                  </label>
                  <input
                    type="date"
                    name="sentenceStart"
                    value={prisonerData.sentenceStart}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sentence End Date *
                  </label>
                  <input
                    type="date"
                    name="sentenceEnd"
                    value={prisonerData.sentenceEnd}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Risk Level *
                  </label>
                  <select
                    name="riskLevel"
                    value={prisonerData.riskLevel}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Parole Eligibility
                  </label>
                  <select
                    name="paroleEligibility"
                    value={prisonerData.paroleEligibility}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Medical Conditions
                  </label>
                  <textarea
                    name="medicalConditions"
                    value={prisonerData.medicalConditions}
                    onChange={handleChange}
                    rows="3"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Special Requirements
                  </label>
                  <textarea
                    name="specialRequirements"
                    value={prisonerData.specialRequirements}
                    onChange={handleChange}
                    rows="3"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Arresting Officer *
                  </label>
                  <input
                    type="text"
                    name="arrestingOfficer"
                    value={prisonerData.arrestingOfficer}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Holding Cell *
                  </label>
                  <input
                    type="text"
                    name="holdingCell"
                    value={prisonerData.holdingCell}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Assigned Prison
                  </label>
                  <select
                    name="assignedPrison"
                    value={prisonerData.assignedPrison}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a prison</option>
                    {prisons.map((prison) => (
                      <option key={prison._id} value={prison._id}>
                        {prison.prison_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Documents
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Inmate
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
