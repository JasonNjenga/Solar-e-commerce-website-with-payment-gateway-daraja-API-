// ====================== SUPABASE INIT ======================
const { createClient } = supabase;
const supabaseClient = createClient(
    "https://cxqgkmjgpoftlbunetjj.supabase.co",
    "sb_publishable_Z3peI2WQS-vvjtAf30mUkw_Bi1hgzA_"
);

// ====================== DOM READY ======================
document.addEventListener('DOMContentLoaded', () => {

    // --- Auth listeners ---
    document.getElementById('login-button').addEventListener('click', openAuthModal);
    document.getElementById('close-auth-modal').addEventListener('click', closeAuthModal);
    document.getElementById('auth-overlay').addEventListener('click', closeAuthModal);
    document.getElementById('logout-button').addEventListener('click', signOut);

    document.getElementById('tab-signin').addEventListener('click', () => switchTab('signin'));
    document.getElementById('tab-signup').addEventListener('click', () => switchTab('signup'));

    document.getElementById('signin-form').addEventListener('submit', handleSignIn);
    document.getElementById('signup-form').addEventListener('submit', handleSignUp);
    document.getElementById('google-signin-btn').addEventListener('click', signInWithGoogle);

    // Check current session on load
    checkSession();

    // Listen for auth state changes (e.g. email confirmation redirects)
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (session && session.user) {
            updateUILoggedIn(session.user);
        } else {
            updateUILoggedOut();
        }
    });

    // --- Nav scroll ---
    let navElement = document.querySelector('nav');
    document.addEventListener('scroll', () => { navScrollEffect(navElement); });

    // --- Cart ---
    document.querySelector('nav .cart-button').addEventListener('click', openCartView);
    document.querySelector('#cart-box .close-button').addEventListener('click', closeCartView);

    // --- Customer form ---
    document.querySelector('#close-customer-form').addEventListener('click', closeCustomerForm);
    document.querySelector('#back-to-cart').addEventListener('click', goBackToCart);

    // --- Add to cart ---
    let userCart = document.querySelector('#cart-items-container ul');
    document.querySelectorAll('.order-button').forEach((bttn) => {
        bttn.addEventListener('click', () => { addToCart(userCart, bttn); });
    });

    userCart.addEventListener('scroll', () => { cartScrollEffect(userCart); });

    userCart.addEventListener('click', (e) => {
        let targetElement = e.target.closest('.remove-button');
        if (targetElement) { removeCartItem(targetElement); }
    });

    document.querySelector('#checkout-button').addEventListener('click', () => { openCustomerForm(); });
    document.querySelector('#customerDetailsForm').addEventListener('submit', (e) => { payWithMPESA(e); });

    // M-Pesa modal buttons
    document.getElementById('mpesa-done-btn').addEventListener('click', () => { closeMpesaModal(); });
    document.getElementById('mpesa-retry-btn').addEventListener('click', () => {
        closeMpesaModal();
        openCustomerForm();
    });
    document.getElementById('mpesa-cancel-btn').addEventListener('click', () => { closeMpesaModal(); });

    emptyCartMessage();
});

// ====================== AUTH MODAL ======================
function openAuthModal() {
    document.getElementById('auth-modal').classList.add('active');
    switchTab('signin');
    clearAuthMessage();
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
    clearAuthMessage();
    document.getElementById('signin-form').reset();
    document.getElementById('signup-form').reset();
}

function switchTab(tab) {
    const signinTab    = document.getElementById('tab-signin');
    const signupTab    = document.getElementById('tab-signup');
    const signinPanel  = document.getElementById('panel-signin');
    const signupPanel  = document.getElementById('panel-signup');
    const modalTitle   = document.getElementById('modal-title');
    const modalSubtitle= document.getElementById('modal-subtitle');

    clearAuthMessage();

    if (tab === 'signin') {
        signinTab.classList.add('active');
        signupTab.classList.remove('active');
        signinPanel.classList.add('active');
        signupPanel.classList.remove('active');
        modalTitle.textContent    = 'Welcome Back';
        modalSubtitle.textContent = 'Sign in to continue shopping';
    } else {
        signupTab.classList.add('active');
        signinTab.classList.remove('active');
        signupPanel.classList.add('active');
        signinPanel.classList.remove('active');
        modalTitle.textContent    = 'Create Account';
        modalSubtitle.textContent = 'Join MySolarShop today';
    }
}

// ====================== SESSION CHECK ======================
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
        updateUILoggedIn(session.user);
    } else {
        updateUILoggedOut();
    }
}

// ====================== UPDATE UI ======================
function updateUILoggedIn(user) {
    const email    = user.email || '';
    const initials = getInitials(email);

    document.getElementById('login-button').classList.add('hidden');
    document.getElementById('login-button').style.display = 'none';

    const profile = document.getElementById('user-profile');
    profile.classList.remove('hidden');
    profile.style.display = 'flex';

    document.getElementById('user-avatar-initials').textContent = initials;
    document.getElementById('user-email-display').textContent   = email;

    // Pre-fill checkout form email if empty
    const checkoutEmail = document.getElementById('email-address');
    if (checkoutEmail && !checkoutEmail.value) {
        checkoutEmail.value = email;
    }
}

function updateUILoggedOut() {
    const loginBtn = document.getElementById('login-button');
    loginBtn.classList.remove('hidden');
    loginBtn.style.display = 'flex';

    const profile = document.getElementById('user-profile');
    profile.classList.add('hidden');
    profile.style.display = 'none';

    document.getElementById('user-avatar-initials').textContent = '';
    document.getElementById('user-email-display').textContent   = '';
}

function getInitials(email) {
    if (!email) return '?';
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
}

// ====================== SIGN IN ======================
async function handleSignIn(e) {
    e.preventDefault();
    const email    = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const btn      = document.getElementById('signin-btn');

    btn.textContent = 'Signing in…';
    btn.disabled    = true;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showAuthMessage('Login successful! Welcome back.', 'success');
        setTimeout(() => { closeAuthModal(); }, 1200);
    } catch (err) {
        showAuthMessage(err.message || 'Invalid credentials. Please try again.', 'error');
    } finally {
        btn.textContent = 'Sign In';
        btn.disabled    = false;
    }
}

// ====================== SIGN UP ======================
async function handleSignUp(e) {
    e.preventDefault();

    const firstName  = document.getElementById('signup-first-name').value.trim();
    const lastName   = document.getElementById('signup-last-name').value.trim();
    const email      = document.getElementById('signup-email').value.trim();
    const phone      = document.getElementById('signup-phone').value.trim();
    const location   = document.getElementById('signup-location').value.trim();
    const password   = document.getElementById('signup-password').value;
    const confirmPass= document.getElementById('signup-confirm-password').value;
    const btn        = document.getElementById('signup-btn');

    if (password !== confirmPass) {
        showAuthMessage('Passwords do not match!', 'error');
        return;
    }
    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters.', 'error');
        return;
    }

    btn.textContent = 'Creating account…';
    btn.disabled    = true;

    try {
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { first_name: firstName, last_name: lastName } }
        });

        if (authError) throw authError;

        // Insert profile row
        if (authData.user) {
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .upsert({
                    id:                authData.user.id,
                    first_name:        firstName,
                    last_name:         lastName,
                    email:             email,
                    phone:             phone,
                    delivery_location: location,
                    updated_at:        new Date().toISOString()
                });

            if (profileError) {
                console.error('Profile insert error:', profileError);
            }
        }

        showAuthMessage('Account created! Please check your email to confirm.', 'success');
        document.getElementById('signup-form').reset();

        setTimeout(() => { switchTab('signin'); }, 3000);

    } catch (err) {
        showAuthMessage(err.message || 'Sign up failed. Please try again.', 'error');
    } finally {
        btn.textContent = 'Create Account';
        btn.disabled    = false;
    }
}

// ====================== GOOGLE SIGN IN ======================
async function signInWithGoogle() {
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options:  { redirectTo: window.location.href }
        });
        if (error) throw error;
    } catch (err) {
        showAuthMessage(err.message || 'Google sign in failed.', 'error');
    }
}

// ====================== SIGN OUT ======================
async function signOut() {
    await supabaseClient.auth.signOut();
    updateUILoggedOut();
}

// ====================== AUTH MESSAGE HELPERS ======================
function showAuthMessage(text, type) {
    const el      = document.getElementById('auth-message');
    el.textContent = text;
    el.className   = `auth-message ${type}`;
}

function clearAuthMessage() {
    const el   = document.getElementById('auth-message');
    el.textContent = '';
    el.className   = 'auth-message hidden';
}

// ==================== NAV SCROLL ====================
function navScrollEffect(navElement) {
    if (window.scrollY > 0) {
        navElement.style.boxShadow    = '0 2px 20px rgba(0, 0, 0, 0.08)';
        navElement.style.paddingTop   = '12px';
        navElement.style.paddingBottom= '12px';
    } else {
        navElement.style.boxShadow    = 'none';
        navElement.style.paddingTop   = '18px';
        navElement.style.paddingBottom= '18px';
    }
}

// ==================== CART OPEN / CLOSE ====================
function openCartView() {
    document.querySelector('#cart-window').classList.add('active');
}

function closeCartView() {
    document.querySelector('#cart-window').classList.remove('active');
}

// ==================== CUSTOMER DETAILS FORM ====================
function openCustomerForm() {
    let itemCount = document.querySelectorAll('#cart-items-container ul li').length;
    if (itemCount === 0) {
        alert('Your cart is empty. Please add items before checkout.');
        return;
    }

    let totalPrice = document.querySelector('#cart-checkout .price').textContent;
    document.querySelector('#order-total-display').textContent = totalPrice;

    // Pre-fill email if user is logged in
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
            const emailField = document.getElementById('email-address');
            if (emailField && !emailField.value) {
                emailField.value = session.user.email;
            }
        }
    });

    closeCartView();
    document.querySelector('#customer-details-window').classList.add('active');
}

function closeCustomerForm() {
    document.querySelector('#customer-details-window').classList.remove('active');
}

function goBackToCart() {
    document.querySelector('#customer-details-window').classList.remove('active');
    openCartView();
}

// ==================== ADD TO CART ====================
function addToCart(userCart, bttn) {
    let addItem      = bttn.parentElement.parentElement;
    let addItemName  = addItem.querySelector('.product-text .title').textContent;
    let addItemPrice = addItem.querySelector('.product-text .price').textContent.substring(3);

    let emojiEl  = addItem.querySelector('.product-emoji');
    let imgEl    = addItem.querySelector('.image-container img');
    let imageHTML = '';
    if (emojiEl) {
        imageHTML = `<span class="cart-item-emoji">${emojiEl.textContent}</span>`;
    } else if (imgEl) {
        imageHTML = `<img src="${imgEl.src}" alt="${addItemName}">`;
    }

    let newItemHTML = `
        <li>
            <div class="cart-item">
                <div class="item-1">
                    <div class="cart-item-image">
                        ${imageHTML}
                        <button class="remove-button">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <div class="cart-item-desc">
                        <span>${addItemName}</span>
                        <span>Qty. 1</span>
                    </div>
                </div>
                <div class="cart-item-price">
                    <span>KES${Number(addItemPrice).toFixed(2)}</span>
                </div>
            </div>
        </li>
    `;

    userCart.innerHTML += newItemHTML;
    updateTotalPrice(Number(addItemPrice), "addItem");
    emptyCartMessage();
    newCartItemEffect();
    openCartView();
}

// ==================== CART SCROLL EFFECT ====================
function cartScrollEffect(userCart) {
    let topFade    = document.querySelector('.white-fade-overflow.top');
    let bottomFade = document.querySelector('.white-fade-overflow.bottom');
    topFade.style.opacity    = (userCart.scrollTop !== 0) ? "1" : "0";
    bottomFade.style.opacity = ((userCart.offsetHeight + userCart.scrollTop) >= userCart.scrollHeight) ? "0" : "1";
}

// ==================== REMOVE CART ITEM ====================
function removeCartItem(el) {
    let cartItem      = el.closest('li');
    let cartItemPrice = cartItem.querySelector('.cart-item-price span').textContent.substring(3);
    cartItem.remove();
    updateTotalPrice(Number(cartItemPrice), "removeItem");
    emptyCartMessage();
}

// ==================== UPDATE TOTAL PRICE ====================
function updateTotalPrice(itemPrice, operation) {
    let checkoutPrice = document.querySelector('#cart-checkout .price');
    let totalPrice    = Number(checkoutPrice.textContent.substring(3));

    if (operation === "addItem")         totalPrice += itemPrice;
    else if (operation === "removeItem") totalPrice -= itemPrice;
    else                                 totalPrice  = 0;

    checkoutPrice.textContent = `KES${totalPrice.toFixed(2)}`;
}

// ==================== EMPTY CART MESSAGE ====================
function emptyCartMessage() {
    let message   = document.querySelector('#cart-items-container .empty-cart-message');
    let itemCount = document.querySelectorAll('#cart-items-container ul li').length;
    message.style.display = (itemCount === 0) ? 'block' : 'none';
}

// ==================== NEW ITEM ANIMATION ====================
function newCartItemEffect() {
    const keyframes = [
        { transform: "translateY(0)" },
        { transform: "translateY(-10px)" },
        { transform: "translateY(0)" },
    ];
    const animationOptions = { duration: 500, iterations: 2, easing: 'ease-in-out' };
    let cartButton = document.querySelector('nav .cart-button');
    if (cartButton) cartButton.animate(keyframes, animationOptions);
}

// ==================== CLEAR ALL ITEMS ====================
function clearAllItems(userCart) {
    userCart.innerHTML = '';
    updateTotalPrice(0, "clearAllItems");
    emptyCartMessage();
}


// ==================== MPESA STATUS MODAL HELPERS ====================
function openMpesaModal() {
    document.getElementById('mpesa-status-modal').classList.add('active');
}

function closeMpesaModal() {
    document.getElementById('mpesa-status-modal').classList.remove('active');
    // Reset all states
    document.querySelectorAll('.mpesa-state').forEach(s => s.classList.remove('active'));
    // Reset timer animation by removing and re-adding the element
    const timerFill = document.getElementById('mpesa-timer-fill');
    if (timerFill) {
        timerFill.style.animation = 'none';
        timerFill.offsetHeight; // reflow
        timerFill.style.animation = '';
    }
}

function showMpesaState(state) {
    document.querySelectorAll('.mpesa-state').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('mpesa-state-' + state);
    if (el) el.classList.add('active');
}

function formatPhone(phone) {
    // Format for display: 07XX XXX XXX or 254XX XXX XXX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('254')) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '+$1 $2 $3 $4');
    } else if (cleaned.length === 10) {
        return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    return phone;
}

// ==================== DELIVERY FORM PAYMENT (DARAJA STK PUSH) ====================
async function payWithMPESA(e) {
    e.preventDefault();

    // 1. Safely grab elements
    const firstName       = document.getElementById('first-name')?.value.trim() || '';
    const lastName        = document.getElementById('last-name')?.value.trim() || '';
    const email           = document.getElementById('email-address')?.value.trim() || '';
    const phone           = document.getElementById('customer-phone-number')?.value.trim() || '';
    const deliveryAddress = document.getElementById('delivery-address')?.value.trim() || '';

    const totalText = document.getElementById('order-total-display').textContent;
    const amount    = Number(totalText.replace(/[^0-9.-]+/g,"")); 

    if (!phone) {
        showMpesaInlineError('Please enter your M-Pesa phone number.');
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showMpesaInlineError('Invalid payment amount.');
        return;
    }

    // Capture structural cart items array BEFORE submission
    const orderItems = getCartItemsData();

    const submitBtn = document.querySelector('#customerDetailsForm button[type="submit"]');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Sending prompt…';

    document.getElementById('mpesa-display-phone').textContent  = formatPhone(phone);
    document.getElementById('mpesa-display-amount').textContent = `KES ${amount.toFixed(2)}`;

    closeCustomerForm();
    showMpesaState('waiting');
    openMpesaModal();

    try {
        const response = await fetch(
            'https://cxqgkmjgpoftlbunetjj.supabase.co/functions/v1/mpesa-pay',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sb_publishable_Z3peI2WQS-vvjtAf30mUkw_Bi1hgzA_', 
                    'apikey': 'sb_publishable_Z3peI2WQS-vvjtAf30mUkw_Bi1hgzA_'
                },
                body: JSON.stringify({
                    phone: phone.replace(/\s+/g, ''), 
                    amount: Math.ceil(amount), 
                    customer: { firstName, lastName, email, deliveryAddress }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server returned status ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        if (data.ResponseCode === '0' || data.MerchantRequestID) {
            
            // --- NEW: LOG THE ORDER TO SUPABASE ---
            // Get current user session if it exists
            const { data: { session } } = await supabaseClient.auth.getSession();
            const currentUserId = session?.user?.id || null; 

            const { error: dbError } = await supabaseClient
                .from('orders')
                .insert({
                    user_id: currentUserId,
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone: phone,
                    delivery_address: deliveryAddress,
                    items: orderItems,
                    total_amount: amount,
                    payment_status: 'paid' // Or 'pending' if tracking async callbacks later
                });

            if (dbError) {
                console.error('Failed to log order to database:', dbError);
                // We show success anyway because the user paid, but alert developer tools
            }
            // --- END OF NEW CODE ---

            // STK push accepted — show success state
            document.getElementById('mpesa-success-amount').textContent = `KES ${amount.toFixed(2)}`;
            showMpesaState('success');

            // Clear the cart
            let userCart = document.querySelector('#cart-items-container ul');
            clearAllItems(userCart);
        } else {
            const msg = data.errorMessage || data.ResponseDescription || 'Payment could not be processed.';
            document.getElementById('mpesa-error-message').textContent = msg;
            showMpesaState('failure');
        }

    } catch (error) {
        console.error('Detailed Payment Debug Error:', error);
        document.getElementById('mpesa-error-message').textContent = `Checkout Failed: ${error.message || 'Connection Refused'}`;
        showMpesaState('failure');
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Proceed to Payment';
    }
}

function showMpesaInlineError(msg) {
    // Briefly show an inline toast below the form button
    let existing = document.getElementById('mpesa-inline-error');
    if (!existing) {
        existing = document.createElement('p');
        existing.id = 'mpesa-inline-error';
        existing.style.cssText = 'color:#ef4444;font-size:13px;font-weight:500;margin-top:-10px;text-align:center;';
        const btn = document.querySelector('#customerDetailsForm button[type="submit"]');
        btn.parentNode.insertBefore(existing, btn.nextSibling);
    }
    existing.textContent = msg;
    setTimeout(() => { if (existing) existing.textContent = ''; }, 4000);
}

// WhatsApp Widget JavaScript
(function() {
    'use strict';
    
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        
        // Get elements
        const toggleBtn = document.getElementById('whatsapp-toggle');
        const panel = document.getElementById('whatsapp-panel');
        const closeBtn = document.getElementById('close-panel');
        
        // Check if elements exist
        if (!toggleBtn || !panel || !closeBtn) {
            console.error('WhatsApp widget elements not found');
            return;
        }
        
        // Open panel
        function openPanel() {
            panel.classList.add('active');
            // Optional: Track open event
            console.log('WhatsApp panel opened');
        }
        
        // Close panel
        function closePanel() {
            panel.classList.remove('active');
            // Optional: Track close event
            console.log('WhatsApp panel closed');
        }
        
        // Toggle panel
        function togglePanel() {
            if (panel.classList.contains('active')) {
                closePanel();
            } else {
                openPanel();
            }
        }
        
        // Event listeners
        toggleBtn.addEventListener('click', togglePanel);
        closeBtn.addEventListener('click', closePanel);
        
        // Close panel when clicking outside
        document.addEventListener('click', function(event) {
            const widget = document.getElementById('whatsapp-widget');
            if (widget && !widget.contains(event.target)) {
                closePanel();
            }
        });
        
        // Close panel with Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && panel.classList.contains('active')) {
                closePanel();
            }
        });
        
        // Track WhatsApp link clicks
        const whatsappLink = document.querySelector('.whatsapp-chat-btn');
        if (whatsappLink) {
            whatsappLink.addEventListener('click', function() {
                // You can send this to Google Analytics or your analytics tool
                console.log('WhatsApp chat initiated');
                
                // Example: Send to Google Analytics
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'whatsapp_click', {
                        'event_category': 'Contact',
                        'event_label': 'WhatsApp Chat'
                    });
                }
            });
        }
        
        // Optional: Show welcome message after 10 seconds
        let hasShownWelcome = localStorage.getItem('whatsappWelcomeShown');
        if (!hasShownWelcome) {
            setTimeout(function() {
                if (panel && !panel.classList.contains('active')) {
                    openPanel();
                    // Auto close after 8 seconds
                    setTimeout(function() {
                        closePanel();
                    }, 8000);
                }
                localStorage.setItem('whatsappWelcomeShown', 'true');
            }, 10000);
        }
        
        // Optional: Show panel when user is about to leave
        document.addEventListener('mouseleave', function(event) {
            if (event.clientY <= 0 && !hasShownWelcome) {
                setTimeout(function() {
                    if (!panel.classList.contains('active')) {
                        openPanel();
                    }
                }, 500);
            }
        });
        
        console.log('WhatsApp widget initialized');
    });
})();

// ==================== EXTRACT CART ITEMS DATA ====================
function getCartItemsData() {
    const items = [];
    const cartElements = document.querySelectorAll('#cart-items-container ul li');
    
    cartElements.forEach(li => {
        const title = li.querySelector('.cart-item-desc span:first-child')?.textContent || '';
        const priceText = li.querySelector('.cart-item-price span')?.textContent || 'KES0';
        const price = Number(priceText.replace(/[^0-9.-]+/g, ""));
        
        items.push({
            title: title,
            quantity: 1, // Currently hardcoded as Qty 1 in your layout
            price: price
        });
    });
    
    return items;
}