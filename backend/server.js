const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

const allowlist = [
  'http://localhost:5173', // local frontend
  process.env.FRONTEND_URL  // deployed frontend (Vercel)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowlist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // IMPORTANT: allow cookies to be sent
}));

// MIDDLEWARE SETUP
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadmanagement', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 5000, 
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Lead Schema
const leadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  company: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  source: {
    type: String,
    enum: ['website', 'facebook_ads', 'google_ads', 'referral', 'events', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'lost', 'won'],
    default: 'new'
  },
  score: { type: Number, min: 0, max: 100, required: true },
  lead_value: { type: Number, required: true },
  last_activity_at: { type: Date },
  is_qualified: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure email is unique per user
leadSchema.index({ email: 1, userId: 1 }, { unique: true });

const Lead = mongoose.model('Lead', leadSchema);

// Auth Middleware
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper function to build filters
const buildFilters = (query, userId) => {
  const filters = { userId };

  // String filters - equals and contains
  ['email', 'company', 'city', 'first_name', 'last_name', 'state'].forEach(field => {
    if (query[field]) {
      filters[field] = { $regex: query[field], $options: 'i' };
    }
    if (query[`${field}_exact`]) {
      filters[field] = query[`${field}_exact`];
    }
  });

  // Enum filters - equals and in
  ['status', 'source'].forEach(field => {
    if (query[field]) {
      if (Array.isArray(query[field])) {
        filters[field] = { $in: query[field] };
      } else {
        filters[field] = query[field];
      }
    }
  });

  // Number filters
  ['score', 'lead_value'].forEach(field => {
    if (query[field]) filters[field] = Number(query[field]);
    if (query[`${field}_gt`]) filters[field] = { ...filters[field], $gt: Number(query[`${field}_gt`]) };
    if (query[`${field}_lt`]) filters[field] = { ...filters[field], $lt: Number(query[`${field}_lt`]) };
    if (query[`${field}_min`] && query[`${field}_max`]) {
      filters[field] = { $gte: Number(query[`${field}_min`]), $lte: Number(query[`${field}_max`]) };
    }
  });

  // Date filters
  ['created_at', 'last_activity_at'].forEach(field => {
    if (query[`${field}_on`]) {
      const date = new Date(query[`${field}_on`]);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      filters[field] = { $gte: date, $lt: nextDay };
    }
    if (query[`${field}_before`]) {
      filters[field] = { ...filters[field], $lt: new Date(query[`${field}_before`]) };
    }
    if (query[`${field}_after`]) {
      filters[field] = { ...filters[field], $gt: new Date(query[`${field}_after`]) };
    }
    if (query[`${field}_from`] && query[`${field}_to`]) {
      filters[field] = { $gte: new Date(query[`${field}_from`]), $lte: new Date(query[`${field}_to`]) };
    }
  });

  // Boolean filters
  if (query.is_qualified !== undefined) {
    filters.is_qualified = query.is_qualified === 'true';
  }

  return filters;
};

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    console.log('Registration attempt:', { email, name }); // Debug log

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    console.log('Registration successful for:', email); // Debug log
    res.status(201).json({ message: 'User created successfully', user: { id: user._id, email, name } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email }); // Debug log
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email); // Debug log
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for:', email); // Debug log
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    console.log('Login successful for:', email); // Debug log
    res.json({ message: 'Login successful', user: { id: user._id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Lead Routes
app.post('/api/leads', authenticateToken, async (req, res) => {
  try {
    const leadData = { ...req.body, userId: req.user._id };
    
    // Check if lead with same email already exists for this user
    const existingLead = await Lead.findOne({ email: leadData.email, userId: req.user._id });
    if (existingLead) {
      return res.status(400).json({ error: 'Lead with this email already exists' });
    }

    const lead = new Lead(leadData);
    await lead.save();
    res.status(201).json(lead);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Lead with this email already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filters = buildFilters(req.query, req.user._id);
    
    const [leads, total] = await Promise.all([
      Lead.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }), // Fixed: use createdAt instead of created_at
      Lead.countDocuments(filters)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      data: leads,
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, userId: req.user._id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json(lead);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Lead with this email already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// FIXED: Seed data endpoint
app.post('/api/seed-leads', authenticateToken, async (req, res) => {
  try {
    console.log('Seeding leads for user:', req.user._id);
    
    // Clear existing leads for this user first (optional)
    // await Lead.deleteMany({ userId: req.user._id });
    
    const sampleLeads = [];
    const sources = ['website', 'facebook_ads', 'google_ads', 'referral', 'events', 'other'];
    const statuses = ['new', 'contacted', 'qualified', 'lost', 'won'];
    const companies = ['TechCorp', 'InnovateLtd', 'StartupHub', 'DataSystems', 'CloudBase'];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai'];
    const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu'];

    // Use current timestamp to ensure unique emails
    const timestamp = Date.now();
    
    for (let i = 1; i <= 50; i++) { // Reduced from 150 to 50 for faster testing
      sampleLeads.push({
        userId: req.user._id,
        first_name: `Lead${i}`,
        last_name: `Lastname${i}`,
        email: `lead${i}_${timestamp}@example.com`, // Make emails unique
        phone: `+91${(1000000000 + i).toString()}`,
        company: companies[i % companies.length],
        city: cities[i % cities.length],
        state: states[i % states.length],
        source: sources[i % sources.length],
        status: statuses[i % statuses.length],
        score: Math.floor(Math.random() * 101),
        lead_value: Math.floor(Math.random() * 100000) + 1000,
        is_qualified: Math.random() > 0.5,
        last_activity_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }

    console.log(`Inserting ${sampleLeads.length} leads...`);
    
    // Insert in smaller batches to avoid memory issues
    const batchSize = 10;
    let insertedCount = 0;
    
    for (let i = 0; i < sampleLeads.length; i += batchSize) {
      const batch = sampleLeads.slice(i, i + batchSize);
      await Lead.insertMany(batch);
      insertedCount += batch.length;
      console.log(`Inserted batch ${Math.ceil((i + batchSize) / batchSize)}, total: ${insertedCount}`);
    }

    console.log(`Successfully seeded ${insertedCount} leads`);
    res.json({ message: `${insertedCount} sample leads created successfully` });
  } catch (error) {
    console.error('Seed leads error:', error);
    res.status(500).json({ error: `Error creating sample leads: ${error.message}` });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});