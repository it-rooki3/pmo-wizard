import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Tooltip,
  Box,
  CssBaseline,
  IconButton
} from "@mui/material";

import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';

import { Link as RouterLink, useLocation, matchPath } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import WorkIcon from '@mui/icons-material/Work';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';

import { ENV } from "../../configure/env.jsx";
import React from 'react';
import axios from "axios";

import logo from '../../assets/logo.svg';
import powered from '../../assets/powered.svg';

const drawerWidth = 60;
const API_BASE = ENV?.API_URL;

export default function Appbar() {
  const location = useLocation();
  const activePath = location.pathname;

  const projectMatch =
    matchPath("/projects/:projectId/*", activePath) ||
    matchPath("/projects/:projectId", activePath);

  const projectId = projectMatch?.params?.projectId ?? null;
  const isInsideProject = Boolean(projectId);

  const [projectName, setProjectName] = React.useState(null);
  const [projectLoading, setProjectLoading] = React.useState(false);
  const [projectError, setProjectError] = React.useState(null);

  React.useEffect(() => {
    let ignore = false;

    async function loadProject() {
      if (!isInsideProject) {
        setProjectName(null);
        return;
      }
      setProjectLoading(true);
      try {
        const url = `${API_BASE}/${projectId}`;
        const res = await axios.get(url);

        const nameFromApi = res?.data?.project_name;
        if (!ignore) {
          setProjectName(nameFromApi || `Project ${projectId}`);
        }
      } catch (err) {
        if (!ignore) setProjectError(err);
      } finally {
        if (!ignore) setProjectLoading(false);
      }
    }

    loadProject();
    return () => { ignore = true; };
  }, [isInsideProject, projectId]);

  const menu = [
    { label: 'Home', icon: <HomeIcon fontSize="inherit" />, to: '/' },
    { label: 'Projects', icon: <WorkIcon fontSize="inherit" />, to: '/projects' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        elevation={0}
        sx={{ backgroundColor: '#f3f3f5', color: 'black', boxShadow: 'none' }}
      >
        <Toolbar disableGutters sx={{ px: 1.5 }}>
          <Box component="img" src={logo} alt="PMO" sx={{ width: 40, height: 40, mr: 2 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 600, mr: 1 }}>PMO Wizard</Typography>
          <Box component="img" src={powered} alt="Powered" sx={{ height: 16, mr: 2 }} />
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size="small"><AccountCircleOutlinedIcon /></IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            backgroundColor: "#f3f3f5",
            mt: '64px',
          },
        }}
      >
        <List sx={{ pt: 1 }}>
          {menu.map((item) => {
            const isActive =
              activePath === item.to ||
              activePath.startsWith(`${item.to}/`);

            return (
              <React.Fragment key={item.label}>
                <ListItem disablePadding>
                  <Tooltip title={item.label} placement="right" arrow>
                    <ListItemButton
                      to={item.to}
                      component={RouterLink}
                      sx={{
                        minHeight: 48,
                        justifyContent: 'center',
                        mx: 1,
                        borderRadius: 2,
                        ...(isActive && { bgcolor: '#e6e6e8' }),
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          fontSize: 28,
                          justifyContent: 'center',
                          color: isActive ? '#2e2e38' : 'gray',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                    </ListItemButton>
                  </Tooltip>
                </ListItem>

                {/* ▼ child project icon */}
                {item.to === '/projects' && isInsideProject && (
                  <ListItem disablePadding>
                    <Tooltip
                      title={
                        projectLoading
                          ? 'Loading…'
                          : projectError
                            ? 'Project not found'
                            : (projectName || `Project ${projectId}`)
                      }
                      placement="right"
                      arrow
                    >
                      <Box
                        to={`/projects/${projectId}`}
                        component={RouterLink}
                        sx={{
                          minHeight: 48,
                          mx: 1,
                          borderRadius: 2,
                          display: "flex",
                          justifyContent: "center",   // <--- centers whole content
                          alignItems: "center",
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            width: 48,                 // <--- FIX: lock width, keeps icons centered
                            minWidth: 48,              // <--- prevents shrinking
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",  // <--- keeps both icons centered together
                            padding: 1,
                            color: activePath.startsWith(`/projects/${projectId}`) ? "#2e2e38" : "gray",
                          }}
                        >
                          {/* File icon */}
                          <FilePresentIcon sx={{ fontSize: 24, ml: 2 }} />

                        </ListItemIcon>
                      </Box>
                    </Tooltip>
                  </ListItem>
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Drawer>
    </Box>
  );
}