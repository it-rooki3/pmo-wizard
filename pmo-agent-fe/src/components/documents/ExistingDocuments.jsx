import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ENV as GLOBAL_ENV } from "../../configure/env.jsx";

// --- helpers ---------------------------------------------------------------
const titleize = (s = "") =>
  s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const safeDate = d => (d ? new Date(d).toLocaleString() : "Unknown");

const getBaseUrl = url => {
  try {
    if (!url || typeof url !== "string") return null;
    return new URL(url).toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
};

const alertMsg = (Swal, title, text, icon = "info") =>
  Swal ? Swal.fire({ title, text, icon, confirmButtonText: "OK" }) : console.error(`${title}: ${text}`);

const dateToTs = d => {
  const t = d ? new Date(d).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
};

const sortFiles = arr =>
  [...arr].sort((a, b) => {
    const ad = dateToTs(a.uploaded_at);
    const bd = dateToTs(b.uploaded_at);
    if (bd !== ad) return bd - ad; // newest first
    return (b.version || 0) - (a.version || 0);
  });

const isFinal = s => {
  const v = (s || "").toLowerCase();
  return v === "finalised" || v === "finalized";
};
// --------------------------------------------------------------------------

const FILE_TYPES = ["project_plan", "pto_calendar", "resource_allocation", "raid_log"];
const FILE_TYPES_TITLE = ["project_plan", "PTO_calendar", "resource_allocation", "raid_log"];

const ExistingDocuments = ({ open, onClose, projectId, ENV, axios, Swal }) => {
  const EFFECTIVE_ENV = ENV || GLOBAL_ENV;
  const [filesByType, setFilesByType] = useState({});
  const [tabIndex, setTabIndex] = useState(0);

  const baseUrl = useMemo(() => getBaseUrl(EFFECTIVE_ENV?.API_URL), [EFFECTIVE_ENV]);

  const downloadUrl = (file_type, version) =>
    baseUrl && projectId
      ? `${baseUrl}/${encodeURIComponent(projectId)}/files/${encodeURIComponent(file_type)}/v${encodeURIComponent(
          version
        )}/download`
      : null;

  const handleDownload = (file_type, version, original_filename) => {
    const url = downloadUrl(file_type, version);
    if (!url) {
      alertMsg(
        Swal,
        "Configuration issue",
        !projectId ? "Missing projectId in route." : "ENV.API_URL is missing or invalid. Please set VITE_API_URL.",
        "warning"
      );
      return;
    }
    try {
      const a = document.createElement("a");
      a.href = url;
      a.style.display = "none";
      a.rel = "noopener";
      a.setAttribute("download", original_filename || `${file_type}_v${version}`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) {
        alertMsg(
          Swal,
          "Download blocked",
          "Your browser blocked the download pop-up. Please allow pop-ups for this site or click the link again."
        );
      }
    }
  };

  useEffect(() => {
    if (!open || !projectId) return;
    if (!baseUrl) {
      alertMsg(Swal, "Configuration issue", "ENV.API_URL is missing or invalid. Please set VITE_API_URL.", "warning");
      return;
    }
    axios
      .get(`${baseUrl}/${encodeURIComponent(projectId)}/files`)
      .then(res => {
        const files = res?.data?.files || [];
        const grouped = files.reduce((acc, f) => {
          const k = f.file_type || "unknown";
          (acc[k] ||= []).push(f);
          return acc;
        }, {});
        setFilesByType(grouped);
      })
      .catch(err => {
        alertMsg(Swal, "Error", `Failed to fetch files: ${err?.message || err}`, "error");
      });
  }, [open, projectId, baseUrl, axios, Swal]);

  const renderRows = (items, fileType) =>
    items.map((f, i) => (
      <TableRow key={`${fileType}-${f.version}-${f.file_hash || i}`}>
        <TableCell sx={{ width: "50%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {f.original_filename || `${fileType}_v${f.version}`}
        </TableCell>
        <TableCell sx={{ width: "25%" }}>{safeDate(f.uploaded_at)}</TableCell>
        <TableCell sx={{ width: "10%", textAlign: "right" }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleDownload(fileType, f.version, f.original_filename)}
          >
            Download
          </Button>
        </TableCell>
      </TableRow>
    ));

  const renderSection = (label, list, fileType, emptyText) => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ mt: 2 }}>
        {label}
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table size="small" aria-label={`${label} ${titleize(fileType)} documents table`} sx={{ tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "50%" }}>Document Name</TableCell>
              <TableCell sx={{ width: "25%" }}>Uploaded</TableCell>
              <TableCell sx={{ width: "10%", textAlign: "right" }}>Download</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length ? (
              renderRows(list, fileType)
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ color: "text.secondary" }}>
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  /**
   * Rule:
   * - If multiple finalized files share the SAME file_hash → keep ONLY the latest by uploaded_at.
   * - Files with DIFFERENT file_hash values → all kept (one per unique hash).
   * - Files without file_hash are treated as unique (no collapsing).
   */
  const processFinalizedFiles = (finals = []) => {
    if (!finals.length) return [];

    // Group by file_hash. If no hash, give it a unique bucket so it doesn't collapse.
    const groups = new Map();
    finals.forEach((f, idx) => {
      const key = f.file_hash ? `hash:${f.file_hash}` : `nohash:${idx}:${f.version ?? "v0"}`;
      const arr = groups.get(key) || [];
      arr.push(f);
      groups.set(key, arr);
    });

    // From each group, keep the latest by uploaded_at (fallback: version)
    const pickLatestPerGroup = [];
    groups.forEach(files => {
      const chosen = [...files].sort((a, b) => {
        const bd = dateToTs(b.uploaded_at);
        const ad = dateToTs(a.uploaded_at);
        if (bd !== ad) return bd - ad;
        return (b.version || 0) - (a.version || 0);
      })[0];
      pickLatestPerGroup.push(chosen);
    });

    // Sort the final selection newest → oldest for display
    return sortFiles(pickLatestPerGroup);
  };

  // ✅ ONLY SHOW FINALIZED FILES — dedup by file_hash keeping latest
  const renderTablesFor = fileType => {
    const all = sortFiles(filesByType[fileType] || []);
    const finalsRaw = all.filter(f => isFinal(f.status));
    const finals = processFinalizedFiles(finalsRaw);

    return (
      <>
        {renderSection("Finalized", finals, fileType, "No Finalized files.")}
      </>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center" }}>
        Existing Documents
        <IconButton onClick={onClose} sx={{ ml: "auto" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          aria-label="Document type tabs"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          {FILE_TYPES_TITLE.map((ft, i) => (
            <Tab
              key={ft}
              label={titleize(ft)}
              sx={{
                textTransform: "none",
                minWidth: 120,
                border: 1,
                borderBottom: tabIndex === i ? "none" : 1,
                borderColor: "divider",
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                bgcolor: tabIndex === i ? "background.paper" : "grey.100",
                fontWeight: tabIndex === i ? "bold" : "normal",
                color: tabIndex === i ? "text.primary" : "text.secondary",
                "&:hover": { bgcolor: "grey.200" },
              }}
            />
          ))}
        </Tabs>

        <Box sx={{ mt: 2 }}>{renderTablesFor(FILE_TYPES[tabIndex])}</Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExistingDocuments;