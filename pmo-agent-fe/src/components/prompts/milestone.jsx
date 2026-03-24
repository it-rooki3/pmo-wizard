import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  Dialog,
  IconButton,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip
} from "@mui/material";
import CreateIcon from "@mui/icons-material/Create";

// config 
import { ENV } from "../../configure/env";

const MilestonePrompt = ({ onSubmit }) => {
  const { projectId } = useParams();

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep the API default (baseline) and the current textarea value separate
  const [baseMilestonePrompt, setBaseMilestonePrompt] = useState("");
  const [currentMilestonePrompt, setCurrentMilestonePrompt] = useState("");

  useEffect(() => {
    const getPrompts = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get(
          `${ENV.API_URL}/${projectId}/prompts`
        );
        const apiPrompt = data?.default_prompts?.milestone ?? "";
        // Set both the baseline and the current editor value
        setBaseMilestonePrompt(apiPrompt);
        setCurrentMilestonePrompt(apiPrompt);
      } catch (err) {
        console.error("Error fetching prompts:", err);
        setError("Failed to load prompts. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    getPrompts();
  }, [projectId]);

  const openModal = () => {
    // Optional: ensure each time the modal opens, it starts from the default
    setCurrentMilestonePrompt(baseMilestonePrompt);
    setShowModal(true);
  };

  const handleTextareaChange = (e) => {
    const newValue = e.target.value;
    // Your custom logic can go here if needed
    setCurrentMilestonePrompt(newValue);
  };

  const handleSubmit = () => {
    // Send whatever the user currently typed
    
    onSubmit?.(currentMilestonePrompt, 'milestone');

    // Reset back to the original default from the API
    setCurrentMilestonePrompt(baseMilestonePrompt);

    // Optionally close the modal
    setShowModal(false);
  };

  const handleCancel = () => {
    // Revert any edits in this session
    setCurrentMilestonePrompt(baseMilestonePrompt);
    setShowModal(false);
  };

  // Prevent closing via backdrop click (like Bootstrap's data-bs-backdrop="static")
  const handleClose = (event, reason) => {
      if (reason === "backdropClick") return; // ignore backdrop clicks
      handleCancel();
  };

  return (
    <>
      <Button
        type="button" // avoid implicit submit in forms
        variant="small"
        onClick={handleSubmit}
        sx={{
          fontWeight: 600,
          flex: 1,
          justifyContent: "space-between",
          borderRadius: 2,
          textTransform: "none",
          backgroundColor: "#2e2e38",
          color: "#fff",
        }}
      >
        {/* Tooltip ONLY for the button text */}
        <Tooltip title="Marks key project achievements or checkpoints." placement="left">
          <span>{loading ? "Loading…" : "Milestone"}</span>
        </Tooltip>
      
        {/* Tooltip ONLY for the icon */}
        <Tooltip
          title={<>To Edit the Existing Predefined Prompt,<br/> Click this Icon</>}
          placement="right"
        >
          <IconButton
            component="span"
            size="small"
            color="inherit"
            onClick={(e) => {
              e.stopPropagation();
              openModal();
            }}
            onMouseDown={(e) => e.stopPropagation()} // extra safety
            sx={{
              ml: 1,
              bgcolor: "rgba(255,255,255,0.15)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
            }}
            disabled={loading}
            aria-label="edit predefined prompt"
          >
            <CreateIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Button>


      <Dialog
        open={showModal}
        onClose={handleClose}
        fullWidth
        maxWidth="md"              // similar to modal-lg
        disableEscapeKeyDown       // block Escape key close
        aria-labelledby="milestoneReportModalLabel"
        >
        <DialogTitle id="milestoneReportModalLabel" sx={{ backgroundColor: "#2e2e38", fontWeight: 600, color: '#fff', fontFamily: "EYInterstate-Regular, sans-serif"}}>
            Milestone
        </DialogTitle>

        <DialogContent dividers>
            
        <TextField
        id="resource-textarea"
        label="Prompt"
        placeholder="Leave a comment here"
        value={currentMilestonePrompt}
        onChange={handleTextareaChange}
        variant="outlined"
        multiline
        minRows={10}
        fullWidth
        slotProps={{
            textarea: {
            style: {
                maxHeight: 300,      // limit height
                overflowY: "auto",   // enable scroll
                backgroundColor: "#fff",
            },
            },
        }}
        sx={{
            // make the input root white as well
            "& .MuiInputBase-root": {
            backgroundColor: "#fff",
            fontFamily: "EYInterstate-Regular, sans-serif"
            },
        }}
        />
        </DialogContent>

        <DialogActions>
            <Button
            variant="outlined"
            onClick={handleCancel}
            sx={{
                borderColor: "#2e2e38",
                color: "#2e2e38",
                "&:hover": {
                borderColor: "#2e2e38",
                backgroundColor: "rgba(46,46,56,0.1)", // subtle hover effect
                fontFamily: "EYInterstate-Regular, sans-serif"
                }
            }}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit} sx={{ backgroundColor: "#2e2e38", fontFamily: "EYInterstate-Regular, sans-serif"}}>
              Submit
            </Button>
        </DialogActions>
    </Dialog>
    </>
  );
};

export default MilestonePrompt;