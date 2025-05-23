import React, { useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useSelector } from "react-redux";
import { FaArrowLeft, FaSearch, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import { toast } from "react-hot-toast";

const InspectorHomepageSettings = () => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const isCollapsed = useSelector((state) => state.sidebar.isCollapsed);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/managemessages/get-messages");
      if (response.data && Array.isArray(response.data.messages)) {
        const messagesWithFullUrls = response.data.messages
          .filter(msg => msg) // Filter out any null messages
          .map(msg => ({
            ...msg,
            image: msg.image ? 
              (msg.image.startsWith('http') ? 
                msg.image : 
                `http://localhost:5001${msg.image.startsWith('/') ? '' : '/'}${msg.image}`) 
              : null,
            text: msg.text || "" // Ensure text is never undefined
          }));
        console.log("Messages with corrected URLs:", messagesWithFullUrls);
        setMessages(messagesWithFullUrls);
        setFilteredMessages(messagesWithFullUrls);
      } else {
        console.warn("No messages found or invalid response format:", response.data);
        setMessages([]);
        setFilteredMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to fetch messages");
      setMessages([]);
      setFilteredMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    const filtered = messages.filter((msg) =>
      msg && msg.text && typeof msg.text === 'string' 
        ? msg.text.toLowerCase().includes(searchQuery.toLowerCase())
        : false
    );
    setFilteredMessages(filtered);
  }, [searchQuery, messages]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewImage(null);
  };

  const addMessage = async () => {
    if (!newMessage.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("text", newMessage);
      
      // Only append image if one is selected
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      // Log the form data for debugging
      console.log("Adding new message");
      console.log("Message text:", newMessage);
      console.log("Selected image:", selectedImage);
      console.log("Form data contents:");
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const response = await axiosInstance.post("/managemessages/add-messages", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Server response:", response.data);

      if (response.data) {
        toast.success("Message added successfully");
        
        // Get the new message from the response
        const newMsg = response.data.message || response.data;
        
        // Format the image URL correctly
        const formattedMsg = {
          ...newMsg,
          image: newMsg.image ? 
            (newMsg.image.startsWith('http') ? 
              newMsg.image : 
              `http://localhost:5001${newMsg.image.startsWith('/') ? '' : '/'}${newMsg.image}`) 
            : null
        };
        
        console.log("New message with formatted URL:", formattedMsg);
        
        // Update local state without refetching
        setMessages(prevMessages => [formattedMsg, ...prevMessages]);
        setFilteredMessages(prevFiltered => [formattedMsg, ...prevFiltered]);
        
        // Reset form
        setNewMessage("");
        setSelectedImage(null);
        setPreviewImage(null);
        setIsAddModalOpen(false);
      } else {
        throw new Error("No response data received");
      }
    } catch (error) {
      console.error("Error adding message:", error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
        console.error("Error headers:", error.response.headers);
        toast.error(error.response.data.message || "Failed to add message");
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
        toast.error("No response from server. Please try again.");
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error setting up request:", error.message);
        toast.error("Error setting up request. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = async (id) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;

    try {
      setIsLoading(true);
      console.log("Deleting message with ID:", id);
      
      const response = await axiosInstance.delete(`/managemessages/delete-messages/${id}`);
      console.log("Delete response:", response);
      
      if (response.data) {
        toast.success("Message deleted successfully");
        // Update local state to immediately reflect the deletion
        setMessages(prevMessages => prevMessages.filter(msg => msg._id !== id));
        setFilteredMessages(prevFiltered => prevFiltered.filter(msg => msg._id !== id));
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
        toast.error(error.response.data.message || "Failed to delete message");
      } else if (error.request) {
        console.error("No response received:", error.request);
        toast.error("No response from server. Please try again.");
      } else {
        console.error("Error:", error.message);
        toast.error("Error: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateMessage = async (id) => {
    if (!editingText.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("text", editingText);
      
      // Handle image update
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      // Log the form data for debugging
      console.log("Updating message with ID:", id);
      console.log("Form data contents:");
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const response = await axiosInstance.put(`/managemessages/update-messages/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Update response:", response.data);

      if (response.data) {
        toast.success("Message updated successfully");
        
        // Get updated message data
        const updatedMsg = response.data.message || response.data;
        const updatedImage = updatedMsg.image ? 
          (updatedMsg.image.startsWith('http') ? 
            updatedMsg.image : 
            `http://localhost:5001${updatedMsg.image.startsWith('/') ? '' : '/'}${updatedMsg.image}`) 
          : null;
        
        // Update local state without refetching
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg._id === id ? { ...msg, text: editingText, image: updatedImage } : msg
          )
        );
        
        setFilteredMessages(prevFiltered => 
          prevFiltered.map(msg => 
            msg._id === id ? { ...msg, text: editingText, image: updatedImage } : msg
          )
        );
        
        // Reset editing state
        setEditingMessageId(null);
        setEditingText("");
        setSelectedImage(null);
        setPreviewImage(null);
      }
    } catch (error) {
      console.error("Error updating message:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
        toast.error(error.response.data.message || "Failed to update message");
      } else if (error.request) {
        console.error("No response received:", error.request);
        toast.error("No response from server. Please try again.");
      } else {
        console.error("Error:", error.message);
        toast.error("Error: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (id, text, image) => {
    setEditingMessageId(id);
    setEditingText(text);
    setSelectedImage(null); // Reset selected image
    setPreviewImage(image); // Set the current image as preview
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText("");
    setSelectedImage(null);
    setPreviewImage(null);
  };

  return (
    <div className="p-5 transition-all duration-300">
      {/* Header Section */}
      <div
        className={`bg-white shadow-md p-4 fixed top-14 z-20 flex flex-wrap items-center justify-between transition-all duration-300 ml-2 gap-2 ${
          isCollapsed ? "left-16 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-17rem)]"
        }`}
      >
        <button
          className="flex items-center text-white bg-blue-600 hover:bg-blue-700 px-4 mr-6 py-2 rounded-lg shadow-md transition duration-300"
          onClick={() => window.history.back()}
        >
          <FaArrowLeft className="mr-2 text-lg" /> Back
        </button>
        <h3 className="text-2xl font-bold text-gray-800 hidden text-center sm:block">
          Manage Homepage Messages
        </h3>

        <div className="flex-1" />
        <div className="relative flex items-center w-60 md:w-1/3">
          <FaSearch className="absolute left-3 text-gray-500" />
          <input
            type="text"
            placeholder="Search messages"
            className="h-10 px-4 py-2 border border-gray-300 rounded-md w-1/3 md:w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="h-10 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md flex items-center justify-center min-w-[150px] md:w-auto"
        >
          Add New Message
        </button>
      </div>

      {/* Main Content */}
      <div className={`mt-32 transition-all duration-300 ${isCollapsed ? "ml-16" : "ml-64"}`}>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMessages && filteredMessages.length > 0 ? (
              filteredMessages.map((msg) => {
                return msg && msg._id ? (
                  <div key={msg._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    {msg.image && (
                      <div className="relative">
                        <img
                          src={msg.image}
                          alt="Message"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23a0a0a0'%3EImage Not Found%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      {editingMessageId === msg._id ? (
                        <div className="space-y-4">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded"
                            rows="3"
                          />
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                            {previewImage && (
                              <div className="relative">
                                <img
                                  src={previewImage}
                                  alt="Preview"
                                  className="w-full h-32 object-cover rounded"
                                />
                                <button
                                  onClick={removeImage}
                                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                >
                                  <FaTimes />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateMessage(msg._id)}
                              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                              disabled={isLoading}
                            >
                              {isLoading ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                              disabled={isLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-gray-800 mb-4">{msg.text || ""}</p>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEditing(msg._id, msg.text || "", msg.image)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <FaEdit className="text-xl" />
                            </button>
                            <button
                              onClick={() => deleteMessage(msg._id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTrash className="text-xl" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : null;
              })
            ) : (
              <div className="col-span-3 text-center py-8 text-gray-500">
                No messages found. Add a new message to get started.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Message Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Message</h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewMessage("");
                  setSelectedImage(null);
                  setPreviewImage(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            <textarea
              placeholder="Enter new message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4"
              rows="4"
            />
            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
              {previewImage && (
                <div className="relative">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <FaTimes />
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewMessage("");
                  setSelectedImage(null);
                  setPreviewImage(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={addMessage}
                className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
                disabled={isLoading}
              >
                {isLoading ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectorHomepageSettings;