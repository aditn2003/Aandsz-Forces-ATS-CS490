// frontend/src/pages/ArchivedJobs.jsx

import React, { useState, useEffect } from 'react';
import { Container, Typography, Card, CardContent, CardActions, Button, CircularProgress, Box, Grid } from '@mui/material';
import { api } from '../api'; // Use your api.js file

const ArchivedJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchArchivedJobs = async () => {
    try {
      setLoading(true);
      // Use the full /api path
      const res = await api.get('/api/jobs/archived'); 
      setJobs(res.data.jobs);
    } catch (err) {
      console.error("Failed to fetch archived jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedJobs();
  }, []);

  const handleRestore = async (jobId) => {
    try {
      // Use the full /api path
      await api.put(`/api/jobs/${jobId}/restore`);
      // Refresh the list by removing the restored job
      setJobs(jobs.filter(job => job.id !== jobId));
    } catch (err) {
      console.error("Failed to restore job", err);
    }
  };

  const handleDelete = async (jobId) => {
    // AC-5: Delete jobs permanently (with confirmation)
    if (!window.confirm("Are you sure you want to permanently delete this job? This action cannot be undone.")) {
      return;
    }
    
    try {
      // Use the full /api path
      await api.delete(`/api/jobs/${jobId}`);
      // Refresh the list by removing the deleted job
      setJobs(jobs.filter(job => job.id !== jobId));
    } catch (err) {
      console.error("Failed to delete job", err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Archived Jobs
      </Typography>
      {jobs.length === 0 ? (
        <Typography>You have no archived jobs.</Typography>
      ) : (
        <Grid container spacing={3}>
          {jobs.map(job => (
            <Grid item xs={12} md={6} lg={4} key={job.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{job.title}</Typography>
                  <Typography color="textSecondary">{job.company}</Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary" onClick={() => handleRestore(job.id)}>
                    Restore
                  </Button>
                  <Button size="small" color="error" onClick={() => handleDelete(job.id)}>
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default ArchivedJobs;