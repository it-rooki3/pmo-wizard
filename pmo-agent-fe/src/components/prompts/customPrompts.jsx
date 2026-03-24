import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import CreateIcon from "@mui/icons-material/Create";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { ENV } from "../../configure/env.jsx";

const API_BASE = (ENV.API_URL || "").replace(/\/+$/, "");

export default function CustomPrompt({ onSubmit }) {
  const { projectId } = useParams();

  // Dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [openList, setOpenList] = useState(false);

  // Form
  const [promptName, setPromptName] = useState("");
  const [promptText, setPromptText] = useState("");

  // Data + UI
  const [customPrompts, setCustomPrompts] = useState([]); // [{id,name,text}]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const promptsUrl = projectId ? `${API_BASE}/${encodeURIComponent(projectId)}/prompts` : "";

  async function loadPrompts() {
    setError("");
    setLoading(true);
    try {
      if (!promptsUrl) {
        setError("Missing projectId in route.");
        return;
      }
      const res = await fetch(promptsUrl);
      if (!res.ok) {
        setError(`Failed to load prompts (${res.status})`);
        return;
      }
      const data = await res.json();
      const arr = Object.entries(data?.custom_prompts || {}).map(([name, text]) => ({
        id: name,
        name,
        text: String(text ?? ""),
      }));
      setCustomPrompts(arr);
    } catch {
      setError("Network error while loading prompts.");
    } finally {
      setLoading(false);
    }
  }

  async function savePrompt(useAfterSave = false) {
    const name = promptName.trim();
    const text = promptText.trim();
    if (!name || !text) return;

    // Prompt Name 50 Character Maximum
    if (name.length > 50) {
        setError("Prompt name cannot exceed 50 characters.");
        return;
    }

    setSaving(true);
    setError("");
    try {
      if (!promptsUrl) {
        setError("Missing projectId in route.");
        return;
      }
      const res = await fetch(promptsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt_name: name, prompt_text: text }),
      });
      if (!res.ok) {
        setError(`Failed to save prompt (${res.status})`);
        return;
      }
      await loadPrompts();
      setPromptName("");
      setPromptText("");
      setOpenCreate(false);

      if (useAfterSave && typeof onSubmit === "function") {
        onSubmit(text, "custom_prompt");
      }
    } catch {
      setError("Network error while saving prompt.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePrompt(p) {
    if (!projectId) return;
    setDeletingId(p.id);
    setError("");
    try {
      const url = `${API_BASE}/${encodeURIComponent(projectId)}/prompts/${encodeURIComponent(p.name)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        setError(`Failed to delete prompt (${res.status})`);
        return;
      }
      await loadPrompts();
    } catch {
      setError("Network error while deleting prompt.");
    } finally {
      setDeletingId(null);
    }
  }

  function usePrompt(p) {
    if (typeof onSubmit === "function") {
      onSubmit(p.text, "custom_prompt");
    }
    setOpenList(false);
  }

  useEffect(() => {
    if (openList && projectId) {
      loadPrompts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openList, projectId]);

  // Common button style
  const darkBtn = { backgroundColor: "#2e2e38", fontWeight: "bold" };

  return (
    <Box sx={{ width: "100%" }}>
      <Stack spacing={1}>
        {/* Open List */}
        <Button
          variant="contained"
          fullWidth
          sx={{ ...darkBtn, fontSize: ".8rem", py: 1 }}
          startIcon={<ListAltIcon />}
          onClick={() => setOpenList(true)}
        >
          Prompt List
        </Button>

        <Divider sx={{ my: 1.5 }} />

        {/* Open Create */}
        <Button
          variant="contained"
          fullWidth
          sx={{ ...darkBtn, fontSize: ".8rem", py: 1 }}
          startIcon={<CreateIcon />}
          onClick={() => setOpenCreate(true)}
        >
          Create Prompt
        </Button>
      </Stack>

      {/* LIST DIALOG */}
      <Dialog
        fullWidth
        maxWidth="sm"
        open={openList}
        onClose={() => setOpenList(false)}
        disableEnforceFocus
        disableRestoreFocus
        disableAutoFocus
      >
        <DialogTitle>Prompt List</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : customPrompts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No custom prompts found.
            </Typography>
          ) : (
            <List dense disablePadding>
              {customPrompts.map((p) => (
                <Box key={p.id}>
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          edge="end"
                          aria-label="use"
                          size="small"
                          sx={{ color: "#2e2e38" }}
                          onClick={() => usePrompt(p)}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          size="small"
                          sx={{ color: "#2e2e38" }}
                          onClick={() => deletePrompt(p)}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? <CircularProgress size={16} /> : <DeleteOutlineIcon />}
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText sx={{ minWidth: 0 }}>
                      {/* NAME (short width + ellipsis + tooltip) */}
                      <Box sx={{ maxWidth: 430 }}>
                        <Tooltip title={p.name} enterDelay={400}>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}
                            title={p.name}
                          >
                            {p.name}
                          </Typography>
                        </Tooltip>
                      </Box>

                      {/* CONTENT (short width + two-line clamp + tooltip) */}
                      <Box sx={{ maxWidth: 430, mt: 0.25 }}>
                        <Tooltip title={p.text} enterDelay={400}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              wordBreak: "break-word",
                            }}
                            title={p.text}
                          >
                            {p.text}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </ListItemText>
                  </ListItem>
                  <Divider />
                </Box>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button variant="contained" sx={darkBtn} onClick={() => setOpenList(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* CREATE DIALOG */}
      <Dialog
        fullWidth
        maxWidth="sm"
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        disableEnforceFocus
        disableRestoreFocus
        disableAutoFocus
      >
        <DialogTitle>Create Prompt</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2}>
            {promptName.trim().length > 50 && (
              <Typography 
                sx={{ color: "black", mb: 0.5 }}
                variant="caption"
              >
                Maximum 50 characters allowed
              </Typography>
            )}
            <TextField
              label="Prompt Name"
              fullWidth
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              inputProps={{ maxLength: 55 }}
            />
            <TextField
              label="Prompt Content"
              fullWidth
              multiline
              minRows={6}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Box>
            <Button variant="contained" sx={darkBtn} onClick={() => setOpenCreate(false)} disabled={saving}>
              Cancel
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              sx={darkBtn}
              onClick={() => savePrompt(false)}
              disabled={promptName.trim().length > 50 || !promptName.trim() || !promptText.trim() || saving}
            >
              {saving ? <CircularProgress size={16} sx={{ color: "white" }} /> : "Save"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}