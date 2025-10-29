// Payment page for Your Copilot
const stripe = Stripe('pk_live_51Pa561BGL9UZIi22MaqnyiBt4hPMFKa4DV3VpiXHq1NN6pLo2kQZjex885zh4mXddmXP2GRY5WHwb4RnYPJFcc1v00oYRGF3pO');

let selectedPlan = 'pro'; // Default to Pro plan

// Global functions that can be called from HTML
window.showPaymentMethods = function() {
    const container = document.querySelector('.payment-container');
    container.innerHTML = `
        <div class="header">
            <h1>🤖 Choose Payment Method</h1>
            <p>Select how you'd like to pay for your ${selectedPlan === 'basic' ? 'Basic' : 'Pro'} plan</p>
        </div>

        <div class="payment-methods">
            <div class="payment-method" onclick="showStripeForm()">
                <div class="method-icon">💳</div>
                <div class="method-info">
                    <h3>Credit/Debit Card</h3>
                    <p>Pay securely with Stripe</p>
                </div>
                <div class="method-arrow">→</div>
            </div>

            <div class="payment-method" onclick="showPayPalForm()">
                <div class="method-icon">🅿️</div>
                <div class="method-info">
                    <h3>PayPal</h3>
                    <p>Pay with your PayPal account</p>
                </div>
                <div class="method-arrow">→</div>
            </div>

            <div class="payment-method" onclick="showCryptoForm()">
                <div class="method-icon">₿</div>
                <div class="method-info">
                    <h3>Cryptocurrency</h3>
                    <p>Pay with Bitcoin or other crypto</p>
                </div>
                <div class="method-arrow">→</div>
            </div>
        </div>

        <div class="plan-summary">
            <h3>Order Summary</h3>
            <div class="summary-item">
                <span>${selectedPlan === 'basic' ? 'Basic' : 'Pro'} Plan</span>
                <span>${selectedPlan === 'basic' ? '$1.99' : '$3.99'}/month</span>
            </div>
            <div class="summary-total">
                <span>Total</span>
                <span>${selectedPlan === 'basic' ? '$1.99' : '$3.99'}/month</span>
            </div>
        </div>

        <button class="back-button" onclick="location.reload()">
            ← Back to Plan Selection
        </button>
    `;

    // Add styles for payment methods
    const style = document.createElement('style');
    style.textContent = `
        .payment-methods {
            margin: 30px 0;
        }
        
        .payment-method {
            display: flex;
            align-items: center;
            padding: 20px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .payment-method:hover {
            border-color: #3b82f6;
            background: #f0f9ff;
        }
        
        .method-icon {
            font-size: 24px;
            margin-right: 15px;
        }
        
        .method-info {
            flex: 1;
        }
        
        .method-info h3 {
            margin: 0 0 5px 0;
            color: #1e293b;
        }
        
        .method-info p {
            margin: 0;
            color: #64748b;
            font-size: 14px;
        }
        
        .method-arrow {
            font-size: 20px;
            color: #3b82f6;
        }
        
        .plan-summary {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
        }
        
        .plan-summary h3 {
            margin: 0 0 15px 0;
            color: #1e293b;
        }
        
        .summary-item, .summary-total {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .summary-total {
            font-weight: 600;
            font-size: 18px;
            color: #1e293b;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
        }
    `;
    document.head.appendChild(style);
};

window.showStripeForm = function() {
    const container = document.querySelector('.payment-container');
    container.innerHTML = `
        <div class="header">
            <h1>💳 Secure Payment</h1>
            <p>Enter your details to proceed to Stripe checkout</p>
        </div>

        <div class="card-form">
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="cardholderName" placeholder="John Doe" required>
            </div>
            
            <div class="form-group">
                <label>Email Address</label>
                <input type="email" id="email" placeholder="john@example.com" required>
            </div>
            
            <div class="stripe-info">
                <p>🔒 Your payment details will be securely processed by Stripe</p>
                <p>You'll be redirected to Stripe's secure checkout page to enter your card information</p>
            </div>
        </div>

        <div class="plan-summary">
            <h3>Order Summary</h3>
            <div class="summary-item">
                <span>${selectedPlan === 'basic' ? 'Basic' : 'Pro'} Plan</span>
                <span>${selectedPlan === 'basic' ? '$1.99' : '$3.99'}/month</span>
            </div>
            <div class="summary-total">
                <span>Total</span>
                <span>${selectedPlan === 'basic' ? '$1.99' : '$3.99'}/month</span>
            </div>
        </div>

        <button class="payment-button" onclick="processPayment()">
            Pay ${selectedPlan === 'basic' ? '$1.99' : '$3.99'}/month
        </button>

        <button class="back-button" onclick="showPaymentMethods()">
            ← Back to Payment Methods
        </button>
    `;

    // Add form styles
    const style = document.createElement('style');
    style.textContent = `
        .card-form {
            margin: 20px 0;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #374151;
            font-weight: 500;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #3b82f6;
        }
        
        .stripe-info {
            background: #f0f9ff;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
        }
        
        .stripe-info p {
            margin: 5px 0;
            color: #1e40af;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
};

window.showPayPalForm = function() {
    alert('PayPal integration coming soon! For now, please use credit card.');
    showPaymentMethods();
};

window.showCryptoForm = function() {
    alert('Cryptocurrency payment coming soon! For now, please use credit card.');
    showPaymentMethods();
};

window.processPayment = async function() {
    const cardholderName = document.getElementById('cardholderName').value;
    const email = document.getElementById('email').value;

    // Basic validation
    if (!cardholderName || !email) {
        alert('Please fill in all fields!');
        return;
    }

    // Show processing
    const button = document.querySelector('.payment-button');
    button.textContent = 'Creating Checkout Session...';
    button.disabled = true;

    try {
        // First, test if backend is running
        console.log('Testing backend health...');
        const healthResponse = await fetch('https://your-copilot-for-every-page-you-visit.onrender.com/health');
        console.log('Health check status:', healthResponse.status);
        
        // Create checkout session with your backend
        console.log('Creating checkout session...');
        const response = await fetch('https://your-copilot-for-every-page-you-visit.onrender.com/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan: selectedPlan,
                email: email,
                name: cardholderName
            })
        });

        // Debug: Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response not ok:', response.status, errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        // Debug: Check response content
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        if (!responseText) {
            throw new Error('Empty response from server');
        }

        let session;
        try {
            session = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Response text:', responseText);
            throw new Error('Invalid JSON response from server');
        }

        if (session.error) {
            throw new Error(session.error);
        }

        // Redirect to Stripe Checkout
        button.textContent = 'Redirecting to Stripe...';
        const { error } = await stripe.redirectToCheckout({
            sessionId: session.id
        });

        if (error) {
            throw new Error(error.message);
        }

    } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed: ' + error.message);
        button.textContent = `Pay ${selectedPlan === 'basic' ? '$1.99' : '$3.99'}/month`;
        button.disabled = false;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const planCards = document.querySelectorAll('.plan-card');
    const paymentButton = document.getElementById('paymentButton');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // Plan selection
    planCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove selected class from all cards
            planCards.forEach(c => c.classList.remove('selected'));
            
            // Add selected class to clicked card
            this.classList.add('selected');
            
            // Update selected plan
            selectedPlan = this.dataset.plan;
            
            // Update button text
            const planName = selectedPlan === 'basic' ? 'Basic' : 'Pro';
            const planPrice = selectedPlan === 'basic' ? '$1.99' : '$3.99';
            paymentButton.textContent = `Subscribe to ${planName} Plan - ${planPrice}/month`;
        });
    });

    // Payment button click
    paymentButton.addEventListener('click', async function() {
        try {
            // Show loading
            paymentButton.disabled = true;
            loading.style.display = 'block';
            errorMessage.style.display = 'none';

            // For now, show a simple message since backend isn't ready
            loading.innerHTML = 'Redirecting to Stripe Checkout...';
            
            // Simulate a delay to show the loading state
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Show payment method selection
            showPaymentMethods();

        } catch (error) {
            console.error('Payment error:', error);
            errorMessage.textContent = error.message || 'Payment failed. Please try again.';
            errorMessage.style.display = 'block';
            paymentButton.disabled = false;
            loading.style.display = 'none';
        }
    });
});