import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

// Prompt windows
import ProjectRiskReport from "./projectRiskReport";
import ValidationReport from "./validationReport";
import ResourceRiskPrompt from "./resourceRisk";

// UI
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  TextField,
  IconButton,
  Tooltip 
} from "@mui/material";
import CreateIcon from "@mui/icons-material/Create";
import { ThreeDots } from "react-loader-spinner";

export default function Chatbot() {
  const { projectId } = useParams();
  const [socket, setSocket] = useState(null);
  // Start with no messages; we’ll add the greeting after history is loaded if it’s empty
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
   const [promptKey, setPromptKey] = useState("");
  const messagesEndRef = useRef(null);

  // --- Helpers ---

  // Normalize history from server:
  // Accepts either:
  //   - [{ role: 'user'|'assistant', content: string }, ...]
  //   - [{ question: string, answer: string }, ...]
  const normalizeHistory = (history) => {
    if (!Array.isArray(history)) return [];

    // Case 1: Role/Content pairs (e.g., chat format)
    const hasRoleFormat = history.every(
      (item) =>
        typeof item === "object" &&
        item &&
        typeof item.role === "string" &&
        typeof item.content === "string"
    );
    if (hasRoleFormat) {
      return history.map((item) => ({
        from: item.role === "user" ? "user" : "response",
        text: item.content,
      }));
    }

    // Case 2: Q/A objects
    const hasQAFormat = history.every(
      (item) =>
        typeof item === "object" &&
        item &&
        "question" in item &&
        "answer" in item
    );
    if (hasQAFormat) {
      const flattened = [];
      history.forEach((pair) => {
        if (pair.question) {
          flattened.push({ from: "user", text: String(pair.question) });
        }
        if (pair.answer) {
          flattened.push({ from: "response", text: String(pair.answer) });
        }
      });
      return flattened;
    }

    // Fallback: ignore unknown shapes
    return [];
  };

  const ensureGreetingIfEmpty = () => {
    setMessages((prev) => {
      if (prev.length === 0) {
        return [{ from: "response", text: "How can I assist you with this Project?" }];
      }
      return prev;
    });
  };

  // --- WebSocket lifecycle ---
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/projects/${projectId}/chat`);

    ws.onopen = () => {
      console.log("WebSocket connection established");
      // Ask server to send history as soon as we connect
      ws.send(JSON.stringify({ command: "get_history" }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // If your backend sends an "event" discriminator, we handle it first.
      if (data.event) {
        switch (data.event) {
          case "history_loaded": {
            const normalized = normalizeHistory(data.history);
            setMessages(normalized);
            setHistoryLoaded(true);

            // If no history → show greeting
            if (!normalized || normalized.length === 0) {
              ensureGreetingIfEmpty();
            }
            setLoadingResponse(false);
            return;
          }
          case "history_cleared": {
            // History cleared → show greeting
            setMessages([{ from: "response", text: "How can I assist you with this Project?" }]);
            setHistoryLoaded(true);
            setLoadingResponse(false);
            return;
          }
          case "message": {
            // Server message payload with answer
            if (data.answer) {
              setMessages((prev) => [...prev, { from: "response", text: data.answer }]);
              setLoadingResponse(false);
            }
            return;
          }
          default:
            // Unknown event type; fall through to generic handling if any fields match
            break;
        }
      }

      // Backward compatibility: if server doesn't set "event"
      if (data.answer) {
        setMessages((prev) => [...prev, { from: "response", text: data.answer }]);
        setLoadingResponse(false);
      } else if (data.error) {
        setMessages((prev) => [...prev, { from: "error", text: data.error }]);
        setLoadingResponse(false);
      } else if (Array.isArray(data.history)) {
        // If server sends history without event wrapper
        const normalized = normalizeHistory(data.history);
        setMessages(normalized);
        setHistoryLoaded(true);
        if (!normalized || normalized.length === 0) {
          ensureGreetingIfEmpty();
        }
        setLoadingResponse(false);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const safeSend = (payload) => {
    console.log(payload)
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    } else {
      console.warn("WebSocket is not open; cannot send", payload);
    }
  };

  const handleSendMessage = () => {
    if (inputValue.trim() === "") return;
  
    const message = { question: inputValue };
    safeSend(message);
    setMessages((prev) => [...prev, { from: "user", text: inputValue }]);
    setInputValue("");
    setLoadingResponse(true);
  };

  const handlePromptKeyChange = (promptKey) =>{
    setPromptKey(promptKey);
  }
  

  const handlePromptSubmit = async (text, prompt_key) => {
    if (!text || text.trim() === "") return;
    const message = { prompt_key: prompt_key, question: text };
    safeSend(message);
    setMessages((prev) => [...prev, { from: "user", text }]);
    setInputValue("");
    setLoadingResponse(true);
    setPromptKey("")
  };

  const formatText = (text) => {
    // Step 1: Format headings with period
    text = text.replace(
      /###\s*(.+?)(?=\n|$)/g,
      (match, h3Text) => `<h5 style="margin: 30px 0;"><strong>${h3Text.trim()}</strong></h5>`
    );

    // Step 2: Format bold text
    text = text.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, (match, strongContent) => {
      return `<strong>${strongContent}</strong>`;
    });

    // Step 3: Clean up any remaining stray asterisks
    text = text.replace(/(?<!<strong>)\*+(?!<\/strong>)/g, '');

    // Step 4: Convert numbered lists to proper HTML
    text = text.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-4">$2</li>');
    text = text.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, (match) => {
      return `<ol class="list-decimal ml-4 my-2">${match}</ol>`;
    });

    // Step 5: Convert bullets to proper HTML
    text = text.replace(/^[•\-]\s+(.+)$/gm, '<li class="ml-4">$1</li>');
    text = text.replace(/(<li class="ml-4"[^>]*>(?:(?!<ol>).)*?<\/li>\s*)+/gs, (match) => {
      if (!match.includes('<ol>')) {
        return `<ul class="list-disc ml-4 my-2">${match}</ul>`;
      }
      return match;
    });

    // Step 6: Recommended Fix
    text = text.replace(/- (Recommended Fix:)/g, (match, fixText) => {
      return `<br /><strong>${fixText}</strong>`;
    });

    return text;
  };

  return (
    <Box
      component="section"
      sx={{
        backgroundColor: 'white',
        height: 'calc(100dvh - 179px)',
        maxWidth: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        mt: 1
      }}
    >

      <Box
        sx={{
          position: 'relative',
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
        }}
      >
        {messages.map((message, index) => {
          const isUser = message.from === "user";
          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <Box
                key={index}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                }}
              >
                <Typography
                  component="div"
                  sx={{
                    p: 2,
                    mr: isUser ? 2 : 0,
                    ml: isUser ? 0 : 2,
                    mb: isUser ? 2 : 4,
                    borderRadius: 3,
                    bgcolor: isUser ? "primary.main" : "grey.100",
                    color: isUser ? "primary.contrastText" : "text.primary",
                    maxWidth: 600,
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                  variant="body2"
                  dangerouslySetInnerHTML={{ __html: formatText(message.text) }}
                />
              </Box>
            </Box>
          );
        })}

        {loadingResponse && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Box
              sx={{
                p: 3,
                ml: 3,
                mb: 4,
                borderRadius: 3,
                bgcolor: 'grey.100',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ThreeDots
                color="#2e2e38"
                height={48}
                width={48}
              />
            </Box>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Quick Actions */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, mt: 1, flexWrap: 'wrap' }}>
        <ProjectRiskReport onSubmit={handlePromptSubmit}/>
        <ValidationReport onSubmit={handlePromptSubmit}/>
        
        <Tooltip title="Reviews task progress and quality.">
          <Button
            type="button"
            variant="small"
            sx={{
              fontWeight: 600,
              flex: 1,
              justifyContent: "space-between",
              borderRadius: 2,
              textTransform: "none",
              backgroundColor: "#2e2e38",
            }}
          >
            Task Evaluation
            <IconButton
              component="span"
              size="small"
              color="inherit"
              sx={{
                ml: 1,
                bgcolor: "rgba(255,255,255,0.15)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
              }}
            >
              <CreateIcon fontSize="small" />
            </IconButton>
          </Button>
        </Tooltip>

        <ResourceRiskPrompt onSubmit={handlePromptSubmit}/>

        <Tooltip title="Marks key project achievements or checkpoints.">
          <Button
            type="button"
            variant="small"
            sx={{
              fontWeight: 600,
              flex: 1,
              justifyContent: "space-between",
              borderRadius: 2,
              textTransform: "none",
              backgroundColor: "#2e2e38",
            }}
          >
            Milestone
            <IconButton
              component="span"
              size="small"
              color="inherit"
              sx={{
                ml: 1,
                bgcolor: "rgba(255,255,255,0.15)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
              }}
            >
              <CreateIcon fontSize="small" />
            </IconButton>
          </Button>
        </Tooltip>
      </Stack>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          fullWidth
          multiline
          size="small"
          placeholder="Type here..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          sx={{
            maxHeight: 100,
            overflowY: 'auto',
            bgcolor: 'background.paper',
            '& .MuiInputBase-root': { alignItems: 'flex-start' },
          }}
        />
        <Button
          variant="contained"
          size="small"
          sx={{ ml: 1, py: 1, backgroundColor: "#2e2e38", fontWeight: 'bold' }}
          onClick={handleSendMessage}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
}