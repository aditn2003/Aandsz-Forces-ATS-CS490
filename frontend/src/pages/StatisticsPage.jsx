// frontend/src/pages/StatisticsPage.jsx

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  Button,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CSVLink } from 'react-csv';
import { api } from '../api'; // <-- IMPORT YOUR API FILE

// Helper to convert month number to name
const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Helper to format the month string
const formatMonth = (dateString) => {
  const date = new Date(dateString);
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${month} ${year}`;
};

const StatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // --- THIS IS THE CHANGED PART ---
        // We now use 'api.get' which automatically adds your token
        const res = await api.get('/api/jobs/stats'); 
        setStats(res.data);
      } catch (err) {
        setError('Failed to load statistics. Is your backend running?');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // (The rest of the file is exactly the same as before)

  // Format data for the monthly volume chart
  const formattedMonthlyData = stats?.monthlyVolume.map((item) => ({
    name: formatMonth(item.month),
    Applications: parseInt(item.count, 10),
  }));

  // Format data for the status chart
  const formattedStatusData = stats?.jobsByStatus.map((item) => ({
    name: item.status,
    Count: parseInt(item.count, 10),
  }));

  // Format all data for CSV export (AC-7)
  const getCsvData = () => {
    if (!stats) return [];
    
    const csvData = [
      { metric: 'Total Jobs', value: stats.totalJobs },
      { metric: 'Response Rate (%)', value: stats.responseRate },
      { metric: 'Deadline Adherence (%)', value: stats.adherenceRate },
      { metric: 'Avg. Time to Offer (days)', value: stats.avgTimeToOffer },
      ...stats.jobsByStatus.map(s => ({ metric: `Jobs with Status: ${s.status}`, value: s.count })),
    ];
    
    return csvData;
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error" variant="h6" align="center" mt={5}>
          {error}
        </Typography>
      </Container>
    );
  }

  if (stats && stats.totalJobs === 0) {
    return (
      <Container>
        <Typography variant="h6" align="center" mt={5}>
          {stats.message || 'No job data available.'}
        </Typography>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" component="h1" gutterBottom>
          Job Statistics
        </Typography>
        {stats && (
          <Button variant="contained" color="primary">
            <CSVLink 
              data={getCsvData()} 
              filename={"job-statistics.csv"}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              Export to CSV
            </CSVLink>
          </Button>
        )}
      </Box>
      
      {/* KPI Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Jobs</Typography>
              <Typography variant="h5">{stats.totalJobs}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Response Rate</Typography>
              <Typography variant="h5">{stats.responseRate}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Avg. Time to Offer</Typography>
              <Typography variant="h5">{stats.avgTimeToOffer} days</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Deadline Adherence</Typography>
              <Typography variant="h5">{stats.adherenceRate}%</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Applications Chart (AC-4) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Monthly Application Volume</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formattedMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Applications" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Jobs by Status Chart (AC-1) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Jobs by Status</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formattedStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default StatisticsPage;