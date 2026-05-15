(function () {
  'use strict';

  const FLASK_URL  = 'https://skillchain-backend-gce5.onrender.com';
  const LOGIN_PAGE = 'http://127.0.0.1:5501/Login/index.html';
  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  const form          = document.getElementById('loginForm');
  const emailInput    = document.getElementById('email');
  const pwInput       = document.getElementById('password');
  const togglePw      = document.getElementById('toggle-pw');
  const submitBtn     = document.getElementById('submit-btn');
  const submitText    = document.getElementById('submit-text');
  const submitSpinner = document.getElementById('submit-spinner');

  // ── If already logged in and session valid, skip login page ──────────────
  // This stops the forward arrow from going back to dashboard
  const stored = localStorage.getItem('userData');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const expired = new Date().getTime() - parsed.loginTime > SESSION_DURATION;
      if (!expired) {
        // Valid session — redirect away from login immediately
        window.location.replace(
          parsed.role === 'worker'
            ? 'http://127.0.0.1:5501/Worker_dashboard/index.html'
            : 'http://127.0.0.1:5501/Client_dashboard/index.html'
        );
      } else {
        // Expired — clean up
        localStorage.removeItem('userData');
      }
    } catch (e) {
      localStorage.removeItem('userData');
    }
  }

  // ── Also block bfcache restore of login page when user is logged in ───────
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      const s = localStorage.getItem('userData');
      if (s) {
        try {
          const p = JSON.parse(s);
          const expired = new Date().getTime() - p.loginTime > SESSION_DURATION;
          if (!expired) {
            window.location.replace(
              p.role === 'worker'
                ? 'http://127.0.0.1:5501/Worker_dashboard/index.html'
                : 'http://127.0.0.1:5501/Client_dashboard/index.html'
            );
            return;
          }
        } catch (e) {
          localStorage.removeItem('userData');
        }
      }
    }
  });

  // ── Password show/hide ────────────────────────────
  togglePw?.addEventListener('click', () => {
    const show   = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    togglePw.textContent = show ? '🙈' : '👁';
  });

  // ── Loading state ─────────────────────────────────
  function setLoading(on) {
    if (submitText)    submitText.style.display    = on ? 'none'         : 'inline';
    if (submitSpinner) submitSpinner.style.display = on ? 'inline-block' : 'none';
    if (submitBtn)     submitBtn.disabled          = on;
  }

  // ── Form submit ───────────────────────────────────
  form && form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = emailInput.value.trim();
    const password = pwInput.value;

    if (!email || !password) {
      Swal.fire({
        icon:               'warning',
        title:              'Missing Fields',
        text:               'Please fill in both email and password.',
        confirmButtonColor: '#e85c00'
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${FLASK_URL}/login`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        // Save user + timestamp to localStorage
        localStorage.setItem('userData', JSON.stringify({
          id:        data.user.id,
          name:      data.user.name,
          role:      data.user.role,
          email:     data.user.email,
          loginTime: new Date().getTime()
        }));

        Swal.fire({
          icon:              'success',
          title:             'Login Successful!',
          text:              `Welcome back, ${data.user.name} 👋`,
          timer:             1800,
          showConfirmButton: false,
          background:        '#181614',
          color:             '#f0ede8',
        });

        setTimeout(() => {
          // Use replace() so login page is removed from history —
          // back arrow can't return here after redirect
          window.location.replace(
            data.user.role === 'worker'
              ? 'http://127.0.0.1:5501/Worker_dashboard/index.html'
              : 'http://127.0.0.1:5501/Client_dashboard/index.html'
          );
        }, 1800);

      } else {
        setLoading(false);
        Swal.fire({
          icon:               'error',
          title:              'Authentication Failed',
          text:               data.message || 'Invalid email or password.',
          confirmButtonColor: '#d33'
        });
      }

    } catch (err) {
      console.error('Login error:', err);
      setLoading(false);
      Swal.fire({
        icon:  'error',
        title: 'Connection Error',
        text:  'Could not reach the server. Is Flask running on port 5000?',
      });
    }
  });

})();