import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import toast from 'react-hot-toast';

const LeadForm = () => {
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      city: '',
      state: '',
      source: 'website',
      status: 'new',
      score: 0,
      lead_value: 0,
      is_qualified: false,
      last_activity_at: ''
    }
  });

  useEffect(() => {
    if (id) {
      setIsEdit(true);
      fetchLead(id);
    }
  }, [id]);

  const fetchLead = async (leadId) => {
    try {
      const response = await api.get(`/api/leads/${leadId}`);
      const lead = response.data;
      
      // Populate form with existing data
      Object.keys(lead).forEach(key => {
        if (key === 'last_activity_at' && lead[key]) {
          setValue(key, new Date(lead[key]).toISOString().split('T')[0]);
        } else if (key !== '_id' && key !== 'userId' && key !== 'created_at' && key !== 'updated_at') {
          setValue(key, lead[key]);
        }
      });
    } catch (error) {
      toast.error('Failed to fetch lead data');
      navigate('/dashboard');
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      // Convert form data
      const leadData = {
        ...data,
        score: parseInt(data.score),
        lead_value: parseFloat(data.lead_value),
        last_activity_at: data.last_activity_at ? new Date(data.last_activity_at) : null
      };

      if (isEdit) {
        await api.put(`/api/leads/${id}`, leadData);
        toast.success('Lead updated successfully');
      } else {
        await api.post('/api/leads', leadData);
        toast.success('Lead created successfully');
      }
      
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const sourceOptions = [
    { value: 'website', label: 'Website' },
    { value: 'facebook_ads', label: 'Facebook Ads' },
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'referral', label: 'Referral' },
    { value: 'events', label: 'Events' },
    { value: 'other', label: 'Other' }
  ];

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'lost', label: 'Lost' },
    { value: 'won', label: 'Won' }
  ];

  return (
    <div className="lead-form-container">
      <div className="lead-form-header">
        <h2>{isEdit ? 'Edit Lead' : 'Create New Lead'}</h2>
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          Back to Dashboard
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="lead-form">
        <div className="form-section">
          <h3>Personal Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                {...register('first_name', { required: 'First name is required' })}
                className={errors.first_name ? 'error' : ''}
              />
              {errors.first_name && <span className="error-message">{errors.first_name.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                {...register('last_name', { required: 'Last name is required' })}
                className={errors.last_name ? 'error' : ''}
              />
              {errors.last_name && <span className="error-message">{errors.last_name.message}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address'
                  }
                })}
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-message">{errors.email.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone *</label>
              <input
                type="tel"
                id="phone"
                {...register('phone', { required: 'Phone is required' })}
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="error-message">{errors.phone.message}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Company Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="company">Company *</label>
              <input
                type="text"
                id="company"
                {...register('company', { required: 'Company is required' })}
                className={errors.company ? 'error' : ''}
              />
              {errors.company && <span className="error-message">{errors.company.message}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                {...register('city', { required: 'City is required' })}
                className={errors.city ? 'error' : ''}
              />
              {errors.city && <span className="error-message">{errors.city.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="state">State *</label>
              <input
                type="text"
                id="state"
                {...register('state', { required: 'State is required' })}
                className={errors.state ? 'error' : ''}
              />
              {errors.state && <span className="error-message">{errors.state.message}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Lead Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="source">Source *</label>
              <select
                id="source"
                {...register('source', { required: 'Source is required' })}
                className={errors.source ? 'error' : ''}
              >
                {sourceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.source && <span className="error-message">{errors.source.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="status">Status *</label>
              <select
                id="status"
                {...register('status', { required: 'Status is required' })}
                className={errors.status ? 'error' : ''}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.status && <span className="error-message">{errors.status.message}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="score">Score (0-100) *</label>
              <input
                type="number"
                id="score"
                min="0"
                max="100"
                {...register('score', { 
                  required: 'Score is required',
                  min: { value: 0, message: 'Score must be at least 0' },
                  max: { value: 100, message: 'Score must be at most 100' }
                })}
                className={errors.score ? 'error' : ''}
              />
              {errors.score && <span className="error-message">{errors.score.message}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="lead_value">Lead Value ($) *</label>
              <input
                type="number"
                id="lead_value"
                min="0"
                step="0.01"
                {...register('lead_value', { 
                  required: 'Lead value is required',
                  min: { value: 0, message: 'Lead value must be positive' }
                })}
                className={errors.lead_value ? 'error' : ''}
              />
              {errors.lead_value && <span className="error-message">{errors.lead_value.message}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="last_activity_at">Last Activity Date</label>
              <input
                type="date"
                id="last_activity_at"
                {...register('last_activity_at')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="is_qualified" className="checkbox-label">
                <input
                  type="checkbox"
                  id="is_qualified"
                  {...register('is_qualified')}
                />
                Is Qualified
              </label>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => navigate('/dashboard')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : (isEdit ? 'Update Lead' : 'Create Lead')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeadForm;