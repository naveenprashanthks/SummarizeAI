document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations and interactions
    initializeAnimations();
    setupScrollEvents();
    setupButtonEffects();
});

// Handle animations on page load
function initializeAnimations() {
    // Fade in hero section elements
    document.querySelectorAll('.hero-content, .hero-image').forEach(element => {
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.transition = 'opacity 1s ease-in-out';
            element.style.opacity = '1';
        }, 200);
    });
    
    // Set up intersection observer for feature cards
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Stagger the animations
                const delay = Array.from(document.querySelectorAll('.feature-card'))
                    .indexOf(entry.target) * 200;
                setTimeout(() => {
                    entry.target.style.transitionDelay = '0s';
                }, delay);
            }
        });
    }, {
        threshold: 0.2
    });
    
    // Observe all feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        observer.observe(card);
        // Set initial transition delay based on card position
        const index = Array.from(document.querySelectorAll('.feature-card')).indexOf(card);
        card.style.transitionDelay = `${index * 0.2}s`;
    });
}

// Handle scroll events
function setupScrollEvents() {
    // Header shrink on scroll
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjust for header height
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Setup button hover effects
function setupButtonEffects() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        // Mouse enter effect
        button.addEventListener('mouseenter', () => {
            button.style.transition = 'all 0.3s ease';
        });
        
        // Click effect
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);
            
            const x = e.clientX - e.target.getBoundingClientRect().left;
            const y = e.clientY - e.target.getBoundingClientRect().top;
            
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
            
            // For the "Get Started" button, add a special effect
            if (this.classList.contains('get-started-btn')) {
                // If it links to the summarize page, add a small delay for the animation
                if (this.getAttribute('href') === 'Summarize.html') {
                    e.preventDefault();
                    
                    // Add a brief waiting animation
                    this.textContent = 'Loading...';
                    
                    // Navigate after a short delay
                    setTimeout(() => {
                        window.location.href = 'Summarize.html';
                    }, 500);
                }
            }
        });
    });
}

// Track and display user activity
function trackUserActivity() {
    // Store last activity time
    let lastActivity = new Date().getTime();
    
    // Update on user activity
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, () => {
            lastActivity = new Date().getTime();
        });
    });
    
    // Check for inactivity every 30 seconds
    setInterval(() => {
        const currentTime = new Date().getTime();
        // If inactive for more than 5 minutes
        if (currentTime - lastActivity > 5 * 60 * 1000) {
            console.log('User inactive for 5 minutes');
            // Could show a re-engagement modal here
        }
    }, 30000);
}

// Call activity tracking 
trackUserActivity();

