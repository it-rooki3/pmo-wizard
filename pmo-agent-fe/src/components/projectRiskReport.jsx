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
import { ENV } from "../configure/env";

const ProjectRiskReport = ({ onSubmit }) => {
    const { projectId } = useParams();

    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // store server default + editable version
    const [baseProjectRiskPrompt, setBaseProjectRiskPrompt] = useState("");
    const [currentProjectRiskPrompt, setCurrentProjectRiskPrompt] = useState("");

    useEffect(() => {
        const getPrompts = async () => {
            setLoading(true);
            try {
                const response = await axios.get(
                    `${ENV.API_URL}/${projectId}/prompts`
                );

                const apiPrompt =
                    response.data?.default_prompts?.project_risk ?? "";

                // set default and user-editable
                setBaseProjectRiskPrompt(apiPrompt);
                setCurrentProjectRiskPrompt(apiPrompt);
            } catch (error) {
                console.error("Error fetching projects:", error);
            } finally {
                setLoading(false);
            }
        };

        getPrompts();
    }, [projectId]);

    const openModal = () => {
        // reset textarea to original default every time modal opens
        setCurrentProjectRiskPrompt(baseProjectRiskPrompt);
        setShowModal(true);
    };

    const handleTextareaChange = (e) => {
        setCurrentProjectRiskPrompt(e.target.value);
    };

    const handleSubmit = () => {
        onSubmit(currentProjectRiskPrompt, 'project_risk');

        // reset textarea back to original default
        setCurrentProjectRiskPrompt(baseProjectRiskPrompt);

        setShowModal(false);
    };

    const handleCancel = () => {
        setCurrentProjectRiskPrompt(baseProjectRiskPrompt);
        setShowModal(false);
    };

    // Prevent closing via backdrop click (like Bootstrap's data-bs-backdrop="static")
    const handleClose = (event, reason) => {
        if (reason === "backdropClick") return; // ignore backdrop clicks
        handleCancel();
    };

    return (
        <>
            <Tooltip title="Identifies potential issues that could affect project success.">
                <Button
                    type="button"                 // avoid implicit submit in forms
                    variant="small"
                    onClick={handleSubmit}
                    sx={{
                        fontWeight: 600,
                        flex: 1,
                        justifyContent: "space-between",
                        borderRadius: 2,
                        textTransform: "none",
                        backgroundColor: "#2e2e38",
                    }}
                >
                    {loading ? "Loading…" : "Project Risk"}

                    {/* Make it a span to avoid nested <button> */}
                    <IconButton
                        component="span"            // 🔑 not a <button> anymore
                        size="small"
                        color="inherit"
                        onClick={(e) => {
                            e.stopPropagation();      // 🔒 prevent parent onClick
                            openModal();
                        }}
                        onMouseDown={(e) => e.stopPropagation()} // extra safety on pointer down
                        sx={{
                            ml: 1,
                            bgcolor: "rgba(255,255,255,0.15)",
                            "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                            fontFamily: "EYInterstate-Regular, sans-serif"
                        }}
                        disabled={loading}          // optional
                    >
                        <CreateIcon fontSize="small" />
                    </IconButton>
                </Button>
            </Tooltip>

            <Dialog
                open={showModal}
                onClose={handleClose}
                fullWidth
                maxWidth="md"              // similar to modal-lg
                disableEscapeKeyDown       // block Escape key close
                aria-labelledby="riskReportModalLabel"
            // MUI modals already sit at a high z-index (default 1300). 
            // Only use the next line if you truly need to override it.
            // sx={{ "& .MuiDialog-paper": { zIndex: 10 } }}
            >
                <DialogTitle id="riskReportModalLabel" sx={{ backgroundColor: "#2e2e38", fontWeight: 600, color: '#fff', }}>
                    Project Risk
                </DialogTitle>

                <DialogContent dividers>
                    <TextField
                        id="risk-textarea"
                        label="Prompt"
                        placeholder="Leave a comment here"
                        value={currentProjectRiskPrompt}
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
                    <Button variant="contained" onClick={handleSubmit} sx={{ backgroundColor: "#2e2e38", fontFamily: "EYInterstate-Regular, sans-serif" }}>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ProjectRiskReport;