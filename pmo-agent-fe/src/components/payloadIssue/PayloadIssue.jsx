import { useEffect } from "react";
import { Button, Box } from "@mui/material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';

function buildIssuesAoA(report, projectName) {
  const { files = {} } = report || {};

  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  const tsLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;


  const stringifyIssue = (issue = {}) => {
    const type = issue.type ?? "N/A";
    const field = issue.field ?? "N/A";
    const severity = issue.severity ?? "N/A";
    const message = issue.message ?? "No message provided.";
    let affectedRows = "N/A";
    if (Array.isArray(issue.affected_rows)) {
      affectedRows = issue.affected_rows.join(", ");
    } else if (typeof issue.affected_rows === "string") {
      affectedRows = issue.affected_rows;
    }
    return `Type: ${type}; Field: ${field}; Severity: ${severity}; Rows: ${affectedRows}; Message: ${message}`;
  };

  const aoa = [];

  // === Header ===
  aoa.push(["Error Report"]);
  aoa.push(["Project Name", projectName || "project"]); // <-- single row, two columns
  aoa.push(["Generated at", tsLocal]);
  aoa.push([""]); // blank

  // === Errors (File | Error) ===
  aoa.push(["Errors"]);
  aoa.push(["File", "Error"]);

  const fileEntries = Object.entries(files || {});
  if (fileEntries.length === 0) {
    aoa.push(["(No files found in payload)", ""]);
  } else {
    for (const [fileKey, fileData] of fileEntries) {
      const issues = Array.isArray(fileData?.issues) ? fileData.issues : [];
      if (issues.length === 0) {
        aoa.push([fileKey, "No issues found for this file."]);
      } else {
        issues.forEach((issue) => {
          aoa.push([fileKey, stringifyIssue(issue)]);
        });
      }
    }
  }
  return aoa;
}

function saveIssuesAsXlsx(report, projectName = "project") {
  if (!report || typeof report !== "object") {
    console.warn("No report data provided to saveIssuesAsXlsx.");
    return;
  }

  // YYYY-MM-DD (UTC). If you want local, build it manually.
  const safeTs = new Date().toISOString().slice(0, 10);
  const name = `Error_Log_${projectName}_${safeTs}.xlsx`;

  const aoa = buildIssuesAoA(report, projectName); // <-- pass projectName in
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths (File ~30, Error ~120)
  ws["!cols"] = [{ wch: 30 }, { wch: 120 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Upload Issues");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, name);
}

export default function PayloadIssue({
  report,
  projectName,
  auto = false,
  onDownloaded,
}) {
  useEffect(() => {
    if (auto && report) {
      saveIssuesAsXlsx(report, projectName);
      onDownloaded?.();
    }
  }, [auto, report, projectName, onDownloaded]);

  if (!report) return null;

  return (
    <Box>
      <Button
        variant="contained"
        size="small"
        onClick={() => saveIssuesAsXlsx(report, projectName)}
        sx={{
          backgroundColor: "#ffe600",
          "&:hover": { backgroundColor: "#fbe200" },
          color: '#2e2e38',
        }}
      >
        <FileDownloadOutlinedIcon sx={{ mr: 0.5, color: '#2e2e38' }} />
        Error Report
      </Button>
    </Box>
  );
}