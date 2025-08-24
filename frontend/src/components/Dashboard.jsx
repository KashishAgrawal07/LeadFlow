import React, { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

const Dashboard = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({});
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchLeads = useCallback(async (page = 1, filters = {}) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await api.get('/api/leads', { params });
      setLeads(response.data.data);
      setPagination({
        page: response.data.page,
        limit: response.data.limit,
        total: response.data.total,
        totalPages: response.data.totalPages
      });
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await api.delete(`/api/leads/${id}`);
        toast.success('Lead deleted successfully');
        fetchLeads(pagination.page, filters);
      } catch (error) {
        toast.error('Failed to delete lead');
      }
    }
  };

  const handleEdit = (id) => {
    navigate(`/leads/${id}/edit`);
  };

  const ActionCellRenderer = ({ data }) => (
    <div className="action-buttons">
      <button 
        className="btn-edit" 
        onClick={() => handleEdit(data._id)}
        title="Edit"
      >
        Edit
      </button>
      <button 
        className="btn-delete" 
        onClick={() => handleDelete(data._id)}
        title="Delete"
      >
        Delete
      </button>
    </div>
  );

  const StatusCellRenderer = ({ value }) => (
    <span className={`status-badge status-${value}`}>
      {value}
    </span>
  );

  const SourceCellRenderer = ({ value }) => (
    <span className={`source-badge source-${value}`}>
      {value.replace('_', ' ')}
    </span>
  );

  const columnDefs = [
    { 
      headerName: 'Name', 
      field: 'first_name',
      valueGetter: (params) => `${params.data.first_name} ${params.data.last_name}`,
      flex: 1,
      minWidth: 150
    },
    { 
      headerName: 'Email', 
      field: 'email', 
      flex: 1,
      minWidth: 200
    },
    { 
      headerName: 'Phone', 
      field: 'phone',
      width: 130
    },
    { 
      headerName: 'Company', 
      field: 'company',
      flex: 1,
      minWidth: 150
    },
    { 
      headerName: 'City', 
      field: 'city',
      width: 120
    },
    { 
      headerName: 'Status', 
      field: 'status',
      cellRenderer: StatusCellRenderer,
      width: 120
    },
    { 
      headerName: 'Source', 
      field: 'source',
      cellRenderer: SourceCellRenderer,
      width: 140
    },
    { 
      headerName: 'Score', 
      field: 'score',
      width: 80,
      type: 'numericColumn'
    },
    { 
      headerName: 'Lead Value', 
      field: 'lead_value',
      width: 120,
      type: 'numericColumn',
      valueFormatter: (params) => `$${params.value?.toLocaleString()}`
    },
    { 
      headerName: 'Qualified', 
      field: 'is_qualified',
      width: 100,
      cellRenderer: (params) => params.value ? 'Yes' : 'No'
    },
    { 
      headerName: 'Created', 
      field: 'created_at',
      width: 120,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString()
    },
    {
      headerName: 'Actions',
      cellRenderer: ActionCellRenderer,
      width: 140,
      pinned: 'right',
      sortable: false,
      filter: false
    }
  ];

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  };

  const handlePageChange = (newPage) => {
    fetchLeads(newPage, filters);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchLeads(1, newFilters);
  };

  const seedData = async () => {
    try {
      await api.post('/api/seed-leads');
      toast.success('Sample data created successfully');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to create sample data');
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Lead Management System</h1>
          <div className="header-actions">
            <span>Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-toolbar">
          <div className="toolbar-left">
            <h2>Leads ({pagination.total})</h2>
          </div>
          <div className="toolbar-right">
            <button 
              onClick={seedData}
              className="btn-secondary"
            >
              Seed Sample Data
            </button>
            <button 
              onClick={() => navigate('/leads/new')}
              className="btn-primary"
            >
              Add New Lead
            </button>
          </div>
        </div>

        <div className="grid-container">
          <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
            <AgGridReact
              columnDefs={columnDefs}
              rowData={leads}
              defaultColDef={defaultColDef}
              pagination={false}
              loading={loading}
              suppressRowClickSelection={true}
              animateRows={true}
            />
          </div>

          <div className="pagination-controls">
            <div className="pagination-info">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
            </div>
            <div className="pagination-buttons">
              <button 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button 
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;