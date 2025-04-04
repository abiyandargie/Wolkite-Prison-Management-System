import { useState } from "react";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";

import { toast } from "react-toastify";  // Import toast

const ParoleAccept = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setAcceptReason] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = () => {
    if (!reason || !date) {
      toast.error("Please provide both reason and date.");
      return;
    }

    onSubmit({ reason, date });
    setAcceptReason("");
    setDate("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Parole</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea 
            placeholder="Enter reason for Accept..." 
            value={reason} 
            onChange={(e) => setAcceptReason(e.target.value)} 
          />
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ParoleAccept;
