(function () {
  'use strict';

  // ── Flask base URL — Live Server (5501) calls Flask (5000) ─────────────────
  const FLASK_URL = 'https://skillchain-backend-gce5.onrender.com';

  /* ── DOM refs ─────────────────────────────────────── */
  const workerRadio   = document.getElementById('role-worker');
  const clientRadio   = document.getElementById('role-client');
  const walletNotice  = document.getElementById('wallet-notice');
  const tradeField    = document.getElementById('trade-field');

  const nameInput     = document.getElementById('name');
  const emailInput    = document.getElementById('email');
  const phoneInput    = document.getElementById('phone');
  const tradeSelect   = document.getElementById('trade');
  const pwInput       = document.getElementById('password');
  const confirmInput  = document.getElementById('confirm-password');
  const togglePw      = document.getElementById('toggle-pw');
  const toggleConfirm = document.getElementById('toggle-confirm');

  const errName    = document.getElementById('err-name');
  const errEmail   = document.getElementById('err-email');
  const errPhone   = document.getElementById('err-phone');
  const errTrade   = document.getElementById('err-trade');
  const errPw      = document.getElementById('err-pw');
  const errConfirm = document.getElementById('err-confirm');

  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');
  const step4 = document.getElementById('step-4');
  const verifyCodeInput   = document.getElementById('verify-code');
  const errVerify         = document.getElementById('err-verify');
  const verifyEmailDisplay = document.getElementById('verify-email-display');
  const submitVerifyBtn   = document.getElementById('submit-verify-btn');
  const verifyText        = document.getElementById('verify-text');
  const verifySpinner     = document.getElementById('verify-spinner');
  const resendLink        = document.getElementById('resend-code-link');

  const next1Btn      = document.getElementById('next-1');
  const next2Btn      = document.getElementById('next-2');
  const back2Btn      = document.getElementById('back-2');
  const back3Btn      = document.getElementById('back-3');
  const submitBtn     = document.getElementById('submit-btn');
  const submitText    = document.getElementById('submit-text');
  const submitSpinner = document.getElementById('submit-spinner');

  const dots  = document.querySelectorAll('.progress-step');
  const lines = document.querySelectorAll('.progress-line');

  const sumRole     = document.getElementById('sum-role');
  const sumName     = document.getElementById('sum-name');
  const sumEmail    = document.getElementById('sum-email');
  const sumTrade    = document.getElementById('sum-trade');
  const sumTradeRow = document.getElementById('sum-trade-row');




  const pwBars = [
    document.getElementById('pw-bar-1'),
    document.getElementById('pw-bar-2'),
    document.getElementById('pw-bar-3'),
    document.getElementById('pw-bar-4'),
  ];
  const pwLabel = document.getElementById('pw-label');

  /* ── Helpers ──────────────────────────────────────── */
  function goToStep(n) {
    [step1, step2, step3, step4].forEach((s, i) => {
      s.classList.toggle('is-active', i + 1 === n);
    });
    dots.forEach((dot, i) => {
      dot.classList.remove('is-active', 'is-done');
      if (i + 1 === n) dot.classList.add('is-active');
      if (i + 1 < n)  dot.classList.add('is-done');
      const dotEl = dot.querySelector('.progress-step__dot');
      if (dotEl) dotEl.textContent = dot.classList.contains('is-done') ? '✓' : i + 1;
    });
    lines.forEach((line, i) => line.classList.toggle('is-done', i + 1 < n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showError(input, errEl, msg) {
    if (errEl) errEl.textContent = msg;
    if (input) { input.classList.add('is-error'); input.classList.remove('is-valid'); }
  }

  function clearError(input, errEl) {
    if (errEl) errEl.textContent = '';
    if (input) { input.classList.remove('is-error'); input.classList.add('is-valid'); }
  }

  function showBanner(msg) {
    let b = document.getElementById('general-error-banner');
    if (!b) {
      b = document.createElement('p');
      b.id = 'general-error-banner';
      b.style.cssText = 'color:#ef4444;font-size:.82rem;margin-bottom:12px;text-align:center;font-weight:600;';
      submitBtn.parentElement.insertBefore(b, submitBtn.parentElement.firstChild);
    }
    b.textContent = msg;
  }

  function clearBanner() {
    const b = document.getElementById('general-error-banner');
    if (b) b.textContent = '';
  }

  function resetBtn() {
    submitText.style.display    = 'inline';
    submitSpinner.style.display = 'none';
    submitBtn.disabled          = false;
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  /* ── Role toggle ──────────────────────────────────── */
  function updateRole() {
    const isWorker = workerRadio.checked;
    walletNotice.classList.toggle('is-visible', isWorker);
    tradeField.classList.toggle('is-visible', isWorker);
    if (!isWorker) { tradeSelect.value = ''; tradeSelect.required = false; }
    else           { tradeSelect.required = true; }
  }

  workerRadio.addEventListener('change', updateRole);
  clientRadio.addEventListener('change', updateRole);

  /* ── Step 1 → 2 ───────────────────────────────────── */
  next1Btn.addEventListener('click', () => {
    if (!workerRadio.checked && !clientRadio.checked) {
      const grid = document.querySelector('.role-grid');
      grid.style.animation = 'none';
      requestAnimationFrame(() => { grid.style.animation = 'shake 0.35s ease'; });
      return;
    }
    goToStep(2);
  });

  /* ── Step 2 → 3 ───────────────────────────────────── */
  next2Btn.addEventListener('click', () => {
    let valid = true;

    if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
      showError(nameInput, errName, 'Please enter your full name.'); valid = false;
    } else { clearError(nameInput, errName); }

    if (!isValidEmail(emailInput.value)) {
      showError(emailInput, errEmail, 'Enter a valid email address.'); valid = false;
    } else { clearError(emailInput, errEmail); }

    if (!phoneInput.value.trim() || phoneInput.value.trim().length < 10) {
      showError(phoneInput, errPhone, 'Enter a valid phone number (min 10 digits).'); valid = false;
    } else { clearError(phoneInput, errPhone); }

    if (workerRadio.checked && !tradeSelect.value) {
      showError(tradeSelect, errTrade, 'Please select your trade.'); valid = false;
    } else { clearError(tradeSelect, errTrade); }

    if (!valid) return;

    sumRole.textContent  = workerRadio.checked ? '🔧 Worker' : '🏠 Client';
    sumName.textContent  = nameInput.value.trim();
    sumEmail.textContent = emailInput.value.trim();

    if (workerRadio.checked && tradeSelect.value) {
      sumTradeRow.style.display = 'flex';
      sumTrade.textContent = tradeSelect.value;
    } else {
      sumTradeRow.style.display = 'none';
    }

    goToStep(3);
  });

  /* ── Back buttons ─────────────────────────────────── */
  back2Btn.addEventListener('click', () => goToStep(1));
  back3Btn.addEventListener('click', () => goToStep(2));

  /* ── Password show/hide ───────────────────────────── */
  togglePw.addEventListener('click', () => {
    const show = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    togglePw.textContent = show ? '🙈' : '👁';
  });

  toggleConfirm.addEventListener('click', () => {
    const show = confirmInput.type === 'password';
    confirmInput.type = show ? 'text' : 'password';
    toggleConfirm.textContent = show ? '🙈' : '👁';
  });

  /* ── Password strength meter ──────────────────────── */
  const levels = [
    { label: 'Too weak',  cls: 'is-weak',   count: 1 },
    { label: 'Fair',      cls: 'is-fair',   count: 2 },
    { label: 'Good',      cls: 'is-good',   count: 3 },
    { label: 'Strong 💪', cls: 'is-strong', count: 4 },
  ];

  function scorePassword(pw) {
    let s = 0;
    if (pw.length >= 6)  s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(s, 4);
  }

  pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    pwBars.forEach(b => { b.className = 'pw-bar'; });
    if (!val) { pwLabel.textContent = 'Enter a password'; return; }
    const lv = levels[(scorePassword(val) - 1)] || levels[0];
    pwLabel.textContent = lv.label;
    for (let i = 0; i < lv.count; i++) pwBars[i].classList.add(lv.cls);
  });

  /* ── Real-time confirm match ──────────────────────── */
  confirmInput.addEventListener('input', () => {
    if (confirmInput.value && confirmInput.value !== pwInput.value) {
      showError(confirmInput, errConfirm, 'Passwords do not match.');
    } else {
      clearError(confirmInput, errConfirm);
    }
  });

  /* ── Blur validators ──────────────────────────────── */
  nameInput.addEventListener('blur', () => {
    nameInput.value.trim().length < 2
      ? showError(nameInput, errName, 'Please enter your full name.')
      : clearError(nameInput, errName);
  });

  emailInput.addEventListener('blur', () => {
    isValidEmail(emailInput.value)
      ? clearError(emailInput, errEmail)
      : showError(emailInput, errEmail, 'Enter a valid email address.');
  });

  /* ── FORM SUBMIT ──────────────────────────────────── */
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearBanner();

    // Final client-side password checks
    let hasError = false;
    if (pwInput.value.length < 6) {
      showError(pwInput, errPw, 'Password must be at least 6 characters.');
      hasError = true;
    } else { clearError(pwInput, errPw); }

    if (confirmInput.value !== pwInput.value) {
      showError(confirmInput, errConfirm, 'Passwords do not match.');
      hasError = true;
    } else { clearError(confirmInput, errConfirm); }

    if (hasError) return;

    // Show loading
    submitText.style.display    = 'none';
    submitSpinner.style.display = 'inline-block';
    submitBtn.disabled          = true;

    const formData = new FormData(document.getElementById('register-form'));

    try {
      // ── POST to Flask on port 5000 ─────────────────────────────────────────
      const res = await fetch(`${FLASK_URL}/register`, {
        method: 'POST',
        body: formData
        // Do NOT set Content-Type — browser handles it for FormData
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Server returned non-JSON:', text.substring(0, 300));
        resetBtn();
        alert('Server error. Check the Flask console for details.');
        return;
      }

      const data = await res.json();

      if (data.success && data.needs_verify) {
        resetBtn();
        verifyEmailDisplay.textContent = data.email;
        goToStep(4);
        return;
      }

      if (data.success) {
        // fallback — shouldn't normally hit this path anymore
        window.location.href = data.redirect;
        return;
      }

    } catch (err) {
      console.error('Fetch error:', err);
      resetBtn();
      showBanner('Network error — make sure Flask is running on port 5000.');
    }
  });       
  
  submitVerifyBtn.addEventListener('click', async () => {
    const code = verifyCodeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      showError(verifyCodeInput, errVerify, 'Enter the 6-digit code.');
      return;
    }
    clearError(verifyCodeInput, errVerify);

    verifyText.style.display = 'none';
    verifySpinner.style.display = 'inline-block';
    submitVerifyBtn.disabled = true;

    try {
      const res  = await fetch(`${FLASK_URL}/verify-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmailDisplay.textContent, code })
      });
      const data = await res.json();

      if (data.success) {
        if (window.Swal) {
          Swal.fire({
            title: '🎉 Account Verified!',
            text: 'Your SkillChain account is ready.',
            icon: 'success',
            confirmButtonColor: '#e85c00',
            confirmButtonText: 'Go to Login →',
            allowOutsideClick: false
          }).then(() => { window.location.href = data.redirect; });
        } else {
          window.location.href = data.redirect;
        }
      } else {
        showError(verifyCodeInput, errVerify, data.message || 'Invalid code.');
        verifyText.style.display = 'inline';
        verifySpinner.style.display = 'none';
        submitVerifyBtn.disabled = false;
      }
    } catch {
      showError(verifyCodeInput, errVerify, 'Network error. Please try again.');
      verifyText.style.display = 'inline';
      verifySpinner.style.display = 'none';
      submitVerifyBtn.disabled = false;
    }
  });

  resendLink.addEventListener('click', async (e) => {
    e.preventDefault();
    resendLink.textContent = 'Sending…';
    try {
      const res  = await fetch(`${FLASK_URL}/resend-verification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmailDisplay.textContent })
      });
      const data = await res.json();
      resendLink.textContent = 'Resend code';
      Swal.fire({ title: data.success ? 'Code sent' : 'Error', text: data.message, icon: data.success ? 'success' : 'error', confirmButtonColor: '#e85c00', timer: 2200, showConfirmButton: false });
    } catch {
      resendLink.textContent = 'Resend code';
    }
  });




  /* ── Shake animation ──────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-6px)}
      40%{transform:translateX(6px)}
      60%{transform:translateX(-4px)}
      80%{transform:translateX(4px)}
    }
  `;
  document.head.appendChild(style);

  /* ── Init ─────────────────────────────────────────── */
  goToStep(1);

})();