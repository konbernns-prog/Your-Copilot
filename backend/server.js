const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Initialize Stripe safely
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized successfully');
} catch (error) {
  console.error('❌ Stripe initialization failed:', error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'chrome-extension://ionkccbkjikklcjdnmkkolbhilednipj', 
    'http://localhost:3000',
    'https://autocontext-voice-ai.onrender.com'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Import OpenAI
const OpenAI = require('openai');

// Initialize OpenAI with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// User plan limits
const PLAN_LIMITS = {
  free: 10,
  basic: 50,
  pro: 200
};

// Stripe product IDs
const STRIPE_PRODUCTS = {
  basic: 'prod_TGBjSpKwnfX3So', // Basic Plan
  pro: 'prod_TGBlIMjLpLlQIL'    // Pro Plan
};

// In-memory storage for demo (in production, use a database)
const userUsage = new Map();

// Helper function to get user usage
function getUserUsage(userId) {
  const today = new Date().toDateString();
  const key = `${userId}-${today}`;
  
  if (!userUsage.has(key)) {
    userUsage.set(key, { count: 0, plan: 'free' });
  }
  
  return userUsage.get(key);
}

// Helper function to check if user can make request
function canMakeRequest(userId, plan = 'free') {
  const usage = getUserUsage(userId);
  const limit = PLAN_LIMITS[plan];
  
  if (limit === -1) return true; // unlimited
  return usage.count < limit;
}

// Helper function to increment usage
function incrementUsage(userId) {
  const usage = getUserUsage(userId);
  usage.count++;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    stripe: stripe ? 'initialized' : 'not initialized'
  });
});

// Main AI endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { 
      message, 
      context, 
      userId = 'anonymous', 
      userPlan = 'free' 
    } = req.body;

    // Validate request
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    // Check usage limits
    if (!canMakeRequest(userId, userPlan)) {
      return res.status(429).json({ 
        error: 'Daily limit reached',
        limit: PLAN_LIMITS[userPlan],
        currentUsage: getUserUsage(userId).count
      });
    }

    // Prepare system prompt with context
    let systemPrompt = `You are a helpful AI assistant that understands webpage context.`;
    
    if (context) {
      systemPrompt += `\n\nCurrent webpage context:
- URL: ${context.url || 'Unknown'}
- Title: ${context.title || 'Unknown'}
- Content: ${context.content ? context.content.substring(0, 2000) + '...' : 'No content available'}

Help the user with their request while considering the webpage context when relevant.`;
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: userPlan === 'pro' ? 'gpt-4' : 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    // Increment usage
    incrementUsage(userId);

    // Return response
    res.json({
      success: true,
      response: completion.choices[0].message.content,
      usage: {
        count: getUserUsage(userId).count,
        limit: PLAN_LIMITS[userPlan],
        plan: userPlan
      }
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ 
        error: 'API quota exceeded. Please check your OpenAI account.' 
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ 
        error: 'Invalid API key. Please check your OpenAI configuration.' 
      });
    }

    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get usage stats endpoint
app.get('/api/usage/:userId', (req, res) => {
  const { userId } = req.params;
  const usage = getUserUsage(userId);
  
  res.json({
    userId,
    usage: {
      count: usage.count,
      limit: PLAN_LIMITS[usage.plan],
      plan: usage.plan,
      remaining: PLAN_LIMITS[usage.plan] === -1 ? -1 : PLAN_LIMITS[usage.plan] - usage.count
    }
  });
});

// Update user plan endpoint
app.post('/api/plan', (req, res) => {
  const { userId, plan } = req.body;
  
  if (!userId || !plan || !PLAN_LIMITS.hasOwnProperty(plan)) {
    return res.status(400).json({ 
      error: 'Invalid userId or plan' 
    });
  }
  
  const usage = getUserUsage(userId);
  usage.plan = plan;
  
  res.json({
    success: true,
    plan: plan,
    limit: PLAN_LIMITS[plan]
  });
});

// Create Stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { plan, email, name } = req.body;
    
    if (!plan || !STRIPE_PRODUCTS[plan]) {
      return res.status(400).json({ 
        error: 'Invalid plan' 
      });
    }

    // Get the product to find its default price
    const product = await stripe.products.retrieve(STRIPE_PRODUCTS[plan]);
    const prices = await stripe.prices.list({
      product: STRIPE_PRODUCTS[plan],
      active: true,
      type: 'recurring'
    });

    if (prices.data.length === 0) {
      return res.status(400).json({ 
        error: 'No active price found for this product' 
      });
    }

    const priceId = prices.data[0].id; // Use the first active price

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: email,
      success_url: `https://autocontext-voice-ai.onrender.com/payment.html?success=true&plan=${plan}`,
      cancel_url: `https://autocontext-voice-ai.onrender.com/payment.html?canceled=true`,
      metadata: {
        plan: plan,
        customer_name: name
      }
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
});

// Stripe webhook for successful payments
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const plan = session.metadata.plan;
    const customerEmail = session.customer_email;
    
    // Here you would typically:
    // 1. Update user's plan in your database
    // 2. Send confirmation email
    // 3. Log the successful payment
    
    console.log(`Payment successful for plan: ${plan}, email: ${customerEmail}`);
  }

  res.json({received: true});
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Your Copilot Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`🔑 Stripe key present: ${process.env.STRIPE_SECRET_KEY ? 'YES' : 'NO'}`);
  console.log(`🤖 OpenAI key present: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO'}`);
});

module.exports = app;
