import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { ENV } from "../../configure/env.jsx";
import {
  Box,
  Stack,
  Typography,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  DialogContentText,
  Alert,
  AlertTitle,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
// PAGES
import Chatbot from "../chatbot";

// Components
import AdditionalDocuments from "../additionalDocuments/AdditionalDocuments"
import PayloadIssue from "../payloadIssue/PayloadIssue";


// prettify keys like "project_plan" → "Project Plan"
const prettifyFileLabel = (key = "Unknown File") =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const ProjectAssistDashboard = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState();
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [backendIssuesPayload, setBackendIssuesPayload] = useState(null);


  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [reportType, setReportType] = useState("");
  const [files, setFiles] = useState({
    project_plan: null,
    pto_calendar: null,
    resource_allocation: null,
    raid_log: null,
  });


  const inputRefs = useState({})[0];
  const clearSingleFile = (fieldName) => {
    setFiles((prev) => ({
      ...prev,
      [fieldName]: null,
    }));

    // clear actual file input UI
    if (inputRefs[fieldName]) {
      inputRefs[fieldName].value = "";
    }
  };


  //ErrorLog
  const [hasErrorLog, setHasErrorLog] = useState(false);

  //Validation Modal
  const [showModal, setShowModal] = useState(false);
  const [allIssues, setAllIssues] = useState([]);


  useEffect(() => {
    const getProject = async () => {
      try {
        const response = await axios.get(`${ENV.API_URL}/${projectId}`);
        setProject(response.data);
        setProjectName(response.data.project_name);
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };

    getProject();
  }, [projectId]);

  // Handle file input changes
  const handleFileChange = (e) => {
    const { name, files: fileList, multiple } = e.target;

    setFiles((prev) => ({
      ...prev,
      [name]: multiple ? Array.from(fileList) : fileList[0],
    }));
  };

  // Submit Upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setBackendIssuesPayload(null); //Clear last issues when a new upload starts
    setHasErrorLog(false); //Clear last issues when a new upload starts

    const formData = new FormData();
    let hasFiles = false;

    for (const [key, value] of Object.entries(files)) {
      if (!value) continue;

      if (Array.isArray(value)) {
        value.forEach((file) => {
          if (file) {
            formData.append(key, file);
            hasFiles = true;
          }
        });
      } else {
        formData.append(key, value);
        hasFiles = true;
      }
    }

    if (reportType) {
      formData.append("report_type", reportType);
    }

    if (!hasFiles) {
      setUploading(false);
      Swal.fire({
        title: "No Files Selected",
        text: "Please select at least one file to upload.",
        icon: "warning",
        confirmButtonText: "Okay",
        customClass: {
          confirmButton: "custom-confirm",
        },
      });
      return;
    }

    try {
      const response = await axios.post(`${ENV.API_URL}/${projectId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      //Updated Modal
      const data = response?.data;

      if (data?.status === "issues_found" && data?.has_issues) {
        // Keep the payload for optional download later
        setBackendIssuesPayload(data);
        setHasErrorLog(true);
        setUploadOpen(false);

        //Validation Modal
        // Support all backend structures
        const issuesData = data?.issues || data?.files || data?.data?.files || {};

        // Flatten ANY nested issue structure
        const flatIssues = Object.keys(issuesData).flatMap((fileKey) => {
          const block = issuesData[fileKey];

          // CASE 1: backend returns { file: { issues: [] } }
          if (Array.isArray(block?.issues)) {
            return block.issues.map((issue) => ({
              originFile: fileKey,
              field: issue.field ?? issue.column ?? "Unknown Field",
              message: issue.message ?? issue.detail ?? "No description provided."
            }));
          }

          // CASE 2: backend returns { file: [ ...issues ] }
          if (Array.isArray(block)) {
            return block.map((issue) => ({
              originFile: fileKey,
              field: issue.field ?? issue.column ?? "Unknown Field",
              message: issue.message ?? issue.detail ?? "No description provided."
            }));
          }

          // CASE 3: backend returns nested categories like:
          // { file: { missing: [], errors: [] } }
          if (typeof block === "object" && block !== null) {
            const nestedArrays = Object.values(block).filter(Array.isArray);

            return nestedArrays.flatMap((arr) =>
              arr.map((issue) => ({
                originFile: fileKey,
                field: issue.field ?? issue.column ?? "Unknown Field",
                message: issue.message ?? issue.detail ?? "No description provided."
              }))
            );
          }

          return [];
        });

        // Save to modal
        setAllIssues(flatIssues);
        setShowModal(true);
      }

      else {
        setUploading(true);
        try {
          const { data } = await axios.post(`${ENV.API_URL}/${projectId}/proceed`);

          const isSuccess = data?.status === "success";

          if (isSuccess) {
            handleProceed(false);
            setHasErrorLog(false);
            setUploadOpen(false);
            await Swal.fire({
              title: "Success!",
              text: "Files uploaded successfully!",
              icon: "success",
              confirmButtonText: "Confirm",
              customClass: { confirmButton: "custom-confirm" },
            });


          } else {
            setUploadOpen(false);
            setHasErrorLog(true);
            await Swal.fire({
              title: "Upload failed",
              text: data?.message ?? "There was an error when the uploading files.",
              icon: "error",
              confirmButtonText: "OK",
            });
          }
        } catch (error) {
          console.error("Upload failed:", error);
          setHasErrorLog(true);

          await Swal.fire({
            title: "Upload failed",
            text:
              error?.response?.data?.message ??
              error?.message ??
              "Something went wrong while uploading.",
            icon: "error",
            confirmButtonText: "OK",
          });
        } finally {
          setUploading(false);
          setUploadOpen(false);
        }
      }

      // reset (unchanged)
      setFiles({
        project_plan: null,
        pto_calendar: null,
        resource_allocation: null,
        raid_log: null,
      });

      setReportType("");
      setUploadOpen(false);


    } catch (error) {
      console.error("Upload failed:", error);

      const backendMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "An unexpected error occurred during upload.";

      setBackendIssuesPayload(error?.response?.data || { message: backendMsg });
      setUploadOpen(false);
      setHasErrorLog(true);
      setUploading(false);

      await Swal.fire({
        title: "Upload failed",
        text: backendMsg,
        icon: "error",
        confirmButtonText: "Okay",
        customClass: { confirmButton: "custom-confirm" },
      });

    } finally {
      setUploading(false);
    }
  };

  // VALIDATION MODAL HANDLERS
  const handleCancelIssues = () => {
    setShowModal(false);
  };

  const handleProceed = async () => {
    setShowModal(false);
    setUploading(true);

    try {
      const { data } = await axios.post(`${ENV.API_URL}/${projectId}/proceed`);

      if (data?.status === "success") {
        setHasErrorLog(false);
        await Swal.fire({
          title: "Success!",
          text: "Files uploaded successfully!",
          icon: "success",
          confirmButtonText: "Confirm",
          customClass: { confirmButton: "custom-confirm" }
        });
      } else {
        setHasErrorLog(true);
        await Swal.fire({
          title: "Upload failed",
          text: data?.message ?? "There was an error when uploading the files.",
          icon: "error",
        });
      }
    } catch (error) {
      setHasErrorLog(true);
      await Swal.fire({
        title: "Upload failed",
        text: error?.response?.data?.message ?? error.message,
        icon: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ ml: "64px", mt: "50px", px: 10 }}>
      <Box
        sx={{
          bgcolor: "grey.900",
          color: "common.white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            py: 4,
            px: 2,
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            backgroundColor: "#fff",
          }}
        >
          {/* HEADER */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, mt: 1 }}>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ color: "#2e2e38" }}
              >
                {projectName || "Project Name"}
              </Typography>

              <Stack direction="row" spacing={1}>
                {/*Log Button: */}
                {hasErrorLog && (
                  <PayloadIssue
                    report={backendIssuesPayload}
                    projectName={projectName}
                  />
                )}

                {/*Upload Button: This button opens the MUI upload dialog */}
                <Button
                  variant="contained"
                  onClick={() => setUploadOpen(true)}
                  size="small"
                  sx={{
                    backgroundColor: "#2e2e38",
                    "&:hover": { backgroundColor: "#1f1f28" },
                  }}
                >
                  Upload Files
                </Button>
              </Stack>
            </Stack>

            <Divider sx={{ borderColor: "black" }} />
          </Box>
          <Chatbot />
        </Box>
      </Box>

      <Dialog
        open={uploadOpen}
        onClose={() => (!uploading ? setUploadOpen(false) : null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 6 }}>
          Upload Required Documents
          <IconButton
            aria-label="close"
            onClick={() => (!uploading ? setUploadOpen(false) : null)}
            edge="end"
            sx={{ ml: "auto" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box component="form" id="upload-form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              required
              margin="normal"
              label="Project Plan"
              type="file"
              name="project_plan"
              onChange={handleFileChange}
              InputLabelProps={{ shrink: true }}
              inputRef={(el) => (inputRefs.project_plan = el)}
              InputProps={{
                endAdornment:
                  files.project_plan && (
                    <IconButton
                      onClick={() => clearSingleFile("project_plan")}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <CloseIcon sx={{ color: "#2e2e38" }} />
                    </IconButton>
                  ),
              }}
              sx={{
                "& .MuiFormLabel-asterisk": {
                  color: "#2e2e38",
                },
              }}
            />

            <TextField
              fullWidth
              margin="normal"
              label="PTO Calendar"
              type="file"
              name="pto_calendar"
              onChange={handleFileChange}
              InputLabelProps={{ shrink: true }}
              inputRef={(el) => (inputRefs.pto_calendar = el)}
              InputProps={{
                endAdornment:
                  files.pto_calendar && (
                    <IconButton
                      onClick={() => clearSingleFile("pto_calendar")}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <CloseIcon sx={{ color: "#2e2e38" }} />
                    </IconButton>
                  ),
              }}
            />

            <TextField
              fullWidth
              margin="normal"
              label="Resource Allocation"
              type="file"
              name="resource_allocation"
              onChange={handleFileChange}
              InputLabelProps={{ shrink: true }}
              inputRef={(el) => (inputRefs.resource_allocation = el)}
              InputProps={{
                endAdornment:
                  files.resource_allocation && (
                    <IconButton
                      onClick={() => clearSingleFile("resource_allocation")}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <CloseIcon sx={{ color: "#2e2e38" }} />
                    </IconButton>
                  ),
              }}
            />

            <TextField
              fullWidth
              margin="normal"
              label="RAID Log"
              type="file"
              name="raid_log"
              onChange={handleFileChange}
              InputLabelProps={{ shrink: true }}
              inputRef={(el) => (inputRefs.raid_log = el)}
              InputProps={{
                endAdornment:
                  files.raid_log && (
                    <IconButton
                      onClick={() => clearSingleFile("raid_log")}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <CloseIcon sx={{ color: "#2e2e38" }} />
                    </IconButton>
                  ),
              }}
            />

            {/* --- NEW: Additional Documents Component with row add/remove --- */}
            <AdditionalDocuments
              files={files}
              setFiles={setFiles}
              uploading={uploading}
            />
            {/* ------------------------------------------------------------ */}

          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setUploadOpen(false)}
            disabled={uploading}
            color="inherit"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="upload-form"
            variant="contained"
            disabled={uploading}
            sx={{
              backgroundColor: "#2e2e38",
              "&:hover": { backgroundColor: "#1f1f28" },
              minWidth: 120,
              fontFamily: "EYInterstate-Regular, sans-serif",
            }}
          >
            {uploading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} color="inherit" />
                <span>Uploading...</span>
              </Stack>
            ) : (
              "Submit"
            )}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={showModal} onClose={handleCancelIssues} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "black" }}>
          Validation Issues Found
        </DialogTitle>


        <DialogContent dividers>
          <DialogContentText mb={2}>
            The following files have missing cells or data issues:
          </DialogContentText>

          {/* Group issues by originFile */}
          {(() => {
            const byFile = {};
            (allIssues || []).forEach((i) => {
              const key = i.originFile || "unknown_file";
              if (!byFile[key]) byFile[key] = [];
              byFile[key].push(i);
            });

            const entries = Object.entries(byFile);

            if (entries.length === 0) {
              return (
                <Alert severity="success">
                  <AlertTitle>No validation issues</AlertTitle>
                  Everything looks good!
                </Alert>
              );
            }

            return (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {entries.map(([fileKey, issues]) => (
                  <Alert
                    key={fileKey}
                    severity="warning"
                    variant="outlined"
                    sx={{ bgcolor: "warning.50" }}
                  >
                    <AlertTitle sx={{ fontWeight: 700, color: "warning.dark" }}>
                      {prettifyFileLabel(fileKey)}
                    </AlertTitle>

                    {/* Numbered list: 1., 2., 3. */}
                    <Box component="ol" sx={{ pl: 3, m: 0 }}>
                      {issues.map((issue, idx) => (
                        <li key={idx}>
                          <Typography component="span" sx={{ fontWeight: 700 }}>
                            {issue.field}
                          </Typography>
                          <Typography component="span"> — {issue.message}</Typography>
                        </li>
                      ))}
                    </Box>
                  </Alert>
                ))}
              </Box>
            );
          })()}
        </DialogContent>


        <DialogActions sx={{ p: 2, display: "flex", justifyContent: "space-between" }}>

          {/* LEFT SIDE */}
          <Box>
            <PayloadIssue
              report={backendIssuesPayload}
              projectName={projectName}
            />
          </Box>

          {/* RIGHT SIDE */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleCancelIssues} color="inherit">
              Cancel
            </Button>


            <Button
              onClick={() => handleProceed(false)}
              variant="contained"
              sx={{
                backgroundColor: '#2e2e38',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#1f1f25'
                }
              }}
            >
              Skip & Continue
            </Button>

          </Box>
        </DialogActions>

      </Dialog>
    </Box>
  );
};

export default ProjectAssistDashboard;