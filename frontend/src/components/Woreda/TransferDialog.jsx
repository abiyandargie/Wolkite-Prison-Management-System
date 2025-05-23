import React, { useState, useEffect } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  FaUser,
  FaFileAlt,
  FaNotesMedical,
  FaPrint,
  FaTimes,
  FaExchangeAlt,
} from "react-icons/fa";
import PrintButton from "./PrintButton";

const TransferDialog = ({
  isOpen,
  onClose,
  inmate,
  onTransferComplete,
  currentPrison,
  prisonMap,
}) => {
  const [prisons, setPrisons] = useState([]);
  const [selectedPrison, setSelectedPrison] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPrisonName, setSelectedPrisonName] = useState("");
  const [currentPrisonName, setCurrentPrisonName] = useState("");
  const [error, setError] = useState("");
  const [transferStatus, setTransferStatus] = useState("Pending");
  const [hasApprovedTransfer, setHasApprovedTransfer] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (inmate?.assignedPrison) {
      // If we already have a prison map, use it instead of fetching
      if (prisonMap && Object.keys(prisonMap).length > 0 && inmate.assignedPrison in prisonMap) {
        setCurrentPrisonName(prisonMap[inmate.assignedPrison]);
      } else {
        fetchPrisons();
      }
      checkExistingTransfers();
    }
  }, [inmate?.assignedPrison, prisonMap]);

  const fetchPrisons = async () => {
    try {
      const response = await axiosInstance.get("/prison/getall-prisons");
      console.log("Prison response:", response.data);
      
      if (response.data?.success && Array.isArray(response.data.prisons)) {
        // Find current prison data
        const currentPrisonData = response.data.prisons.find(
          prison => prison._id === inmate?.assignedPrison
        );
        
        console.log("Current prison data:", currentPrisonData);
        
        if (currentPrisonData) {
          setCurrentPrisonName(currentPrisonData.prison_name);
        } else {
          console.error("Current prison not found:", inmate?.assignedPrison);
          setCurrentPrisonName("Not Assigned");
        }

        // Store all prisons in state
        setPrisons(response.data.prisons);
      } else {
        console.error("Unexpected prison data format:", response.data);
        toast.error("Invalid prison data format received");
        setPrisons([]);
        setCurrentPrisonName("Not Assigned");
      }
    } catch (error) {
      console.error("Error fetching prisons:", error);
      console.error("Error details:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to fetch prison data");
      setPrisons([]);
      setCurrentPrisonName("Not Assigned");
    }
  };

  const checkExistingTransfers = async () => {
    try {
      if (!inmate?._id) {
        console.log("No inmate ID available");
        return;
      }

      const response = await axiosInstance.get("/transfer/getall-transfers");
      console.log("All transfers:", response.data.data);
      
      // Filter transfers for this inmate
      const inmateTransfers = response.data.data.filter(
        transfer => transfer.inmateId === inmate._id
      );
      console.log("Inmate transfers:", inmateTransfers);
      
      if (inmateTransfers.length === 0) {
        console.log("No transfers found for this inmate");
        setHasApprovedTransfer(false);
        return;
      }

      // Check for any active transfers (pending or in_review)
      const activeTransfer = inmateTransfers.find(
        transfer => 
          transfer.status.toLowerCase() === "pending" || 
          transfer.status.toLowerCase() === "in_review" ||
          transfer.status.toLowerCase() === "approved"
      );
      
      console.log("Active transfer found:", activeTransfer);
      
      if (activeTransfer) {
        setHasApprovedTransfer(true);
        const statusMessage = activeTransfer.status.toLowerCase() === "approved" 
          ? "This inmate already has an approved transfer request"
          : "This inmate already has a pending transfer request";
        
        setMessage(statusMessage);
        setMessageType("error");
      } else {
        setHasApprovedTransfer(false);
        setMessage("");
      }
    } catch (error) {
      console.error("Error checking existing transfers:", error);
      setMessage("Failed to check existing transfers");
      setMessageType("error");
      setHasApprovedTransfer(false);
    }
  };

  useEffect(() => {
    if (isOpen && inmate?.assignedPrison) {
      fetchPrisons();
      checkExistingTransfers();
    }
  }, [isOpen, inmate?.assignedPrison]);

  const handlePrisonChange = (e) => {
    const prisonId = e.target.value;
    const selectedPrisonData = prisons.find((p) => p._id === prisonId);

    setSelectedPrison(prisonId);
    setSelectedPrisonName(
      selectedPrisonData ? selectedPrisonData.prison_name : ""
    );

    // Reset transfer reason when prison changes
    if (!prisonId) {
      setTransferReason("");
    }
  };

  const handleTransfer = async () => {
    if (!selectedPrison || !transferReason) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      // Create inmate data object from the selected inmate
      const inmateData = {
        firstName: inmate.firstName,
        lastName: inmate.lastName,
        middleName: inmate.middleName || "",
        crime: inmate.crime,
        gender: inmate.gender,
        intakeDate: inmate.intakeDate,
        dateOfBirth: inmate.dateOfBirth,
        assignedPrison: inmate.assignedPrison,
        timeRemaining: inmate.timeRemaining
      };

      // Find selected prison name for display
      const selectedPrisonData = prisons.find(p => p._id === selectedPrison);
      const selectedPrisonName = selectedPrisonData ? selectedPrisonData.prison_name : "Selected Prison";

      const transferData = {
        inmateId: inmate._id,
        fromPrison: inmate.assignedPrison,
        toPrison: selectedPrison,
        reason: transferReason,
        status: "Pending",
        inmateData,
        requestDetails: {
          requestedBy: {
            role: "Woreda", // Required role field
            prison: inmate.assignedPrison // Required prison field
          },
          requestDate: new Date().toISOString(),
          status: "Pending",
          fromPrisonName: currentPrisonName,
          toPrisonName: selectedPrisonName
        }
      };

      console.log("Submitting transfer request:", transferData);
      const response = await axiosInstance.post("/transfer/create-transfer", transferData);

      console.log("Transfer response:", response.data);

      if (response.data?.success) {
        // If the transfer is automatically approved (bypassing the typical approval process)
        if (response.data?.data?.status === "Approved") {
          try {
            console.log("Transfer was approved automatically, updating prison populations");
            // Decrement the original prison's population
            if (inmate.assignedPrison) {
              console.log(`Decrementing population for source prison: ${inmate.assignedPrison}`);
              const decrementResponse = await axiosInstance.post("/prison/decrement-population", {
                prisonId: inmate.assignedPrison,
                decrement: 1
              });
              
              if (!decrementResponse.data?.success) {
                console.error("Failed to decrement source prison population:", decrementResponse.data?.error);
              } else {
                console.log("Successfully decremented source prison population");
              }
            }
            
            // Increment the destination prison's population
            console.log(`Incrementing population for destination prison: ${selectedPrison}`);
            const incrementResponse = await axiosInstance.post("/prison/increment-population", {
              prisonId: selectedPrison,
              increment: 1
            });
            
            if (!incrementResponse.data?.success) {
              console.error("Failed to increment destination prison population:", incrementResponse.data?.error);
            } else {
              console.log("Successfully incremented destination prison population");
              // Notify that prison populations have changed
              window.dispatchEvent(new Event('prisonPopulationChanged'));
            }
          } catch (populationError) {
            console.error("Error updating prison populations during transfer:", populationError);
          }
        } else {
          // If transfer is pending, log that population updates will happen upon approval
          console.log("Transfer request submitted as pending. Prison populations will update upon approval.");
        }
        
        toast.success(
          response.data?.data?.status === "Approved" 
            ? "Transfer completed successfully!" 
            : "Transfer request submitted successfully. Awaiting approval."
        );
        setIsSubmitting(false);
        onClose();
        
        if (onTransferComplete) {
          onTransferComplete();
        }
      } else {
        setMessage(response.data?.error || "Failed to create transfer request.");
        setMessageType("error");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Transfer request error:", error);
      console.error("Error details:", error.response?.data);
      
      setMessage(error.response?.data?.error || "Failed to create transfer request. Please try again.");
      setMessageType("error");
      setIsSubmitting(false);
    }
  };

  // Add status badge component
  const StatusBadge = ({ status }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case "Pending":
          return "bg-yellow-100 text-yellow-800";
        case "Under Review":
          return "bg-blue-100 text-blue-800";
        case "Approved":
          return "bg-green-100 text-green-800";
        case "Rejected":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {status}
      </span>
    );
  };

  // Add this function to handle Cloudinary URLs
  const getSecureUrl = (url) => {
    if (!url) return null;
    // Convert http to https for Cloudinary URLs
    if (url.startsWith('http://res.cloudinary.com')) {
      return url.replace('http://', 'https://');
    }
    return url;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Transfer Prisoner</DialogTitle>
          <DialogDescription>
            {hasApprovedTransfer ? (
              <span className="text-red-600">
                {message}
              </span>
            ) : (
              "Review prisoner details and select the destination prison for transfer."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {inmate && !hasApprovedTransfer && (
            <div className="space-y-4">
              {/* Header with Photo */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative w-48 h-48">
                    <div className="h-full w-full rounded-full overflow-hidden">
                      {inmate?.photo ? (
                        <>
                          <img
                            src={getSecureUrl(inmate.photo)}
                            alt={`${inmate.firstName} ${inmate.lastName}`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                          <div 
                            className="h-full w-full absolute top-0 left-0 bg-blue-100 items-center justify-center hidden"
                            style={{ display: 'none' }}
                          >
                            <FaUser 
                              className={inmate?.gender === 'female' ? "text-pink-500" : "text-blue-500"} 
                              size={48} 
                            />
                          </div>
                        </>
                      ) : (
                        <div className="h-full w-full bg-blue-100 flex items-center justify-center">
                          <FaUser 
                            className={inmate?.gender === 'female' ? "text-pink-500" : "text-blue-500"} 
                            size={48} 
                          />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-center py-2 text-sm">
                      {inmate.firstName} {inmate.lastName}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      Transfer Request for {inmate?.firstName}{" "}
                      {inmate?.lastName}
                    </h2>
                    <p className="text-gray-600">
                      Current Prison: {currentPrisonName}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={transferStatus} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>

              {/* Transfer Form */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Transfer Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Prison
                    </label>
                    <select
                      value={selectedPrison}
                      onChange={(e) => setSelectedPrison(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                      disabled={loading || prisons.length === 0}
                      required
                    >
                      <option value="">Select a prison</option>
                      {prisons.map((prison) => (
                        <option key={prison._id} value={prison._id}>
                          {prison.prison_name}
                        </option>
                      ))}
                    </select>
                    {prisons.length === 0 && !loading && (
                      <p className="mt-1 text-sm text-red-600">
                        No prisons available for transfer. Please try again later.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Transfer Reason
                    </label>
                    <textarea
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                      rows="3"
                      required
                      placeholder="Enter the reason for transfer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-6">
          {!hasApprovedTransfer && (
            <>
              <PrintButton
                inmate={inmate}
                title="Transfer Request"
                additionalData={{
                  "Transfer Details": {
                    "From Prison": currentPrisonName,
                    "To Prison": selectedPrisonName,
                    "Transfer Reason": transferReason,
                    Status: transferStatus,
                  },
                  "Inmate Information": {
                    "Full Name": `${inmate?.firstName} ${inmate?.middleName} ${inmate?.lastName}`,
                    Gender: inmate?.gender,
                    Age: inmate?.age,
                    "Current Status": inmate?.status,
                  },
                  "Criminal Information": {
                    Crime: inmate?.crime,
                    "Risk Level": inmate?.riskLevel,
                    "Sentence Start": new Date(
                      inmate?.sentenceStart
                    ).toLocaleDateString(),
                    "Sentence End": new Date(
                      inmate?.sentenceEnd
                    ).toLocaleDateString(),
                  },
                }}
              />
              <button
                onClick={handleTransfer}
                disabled={isSubmitting}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FaExchangeAlt className="mr-2 text-sm" />
                {isSubmitting ? "Submitting..." : "Submit Transfer"}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDialog;
