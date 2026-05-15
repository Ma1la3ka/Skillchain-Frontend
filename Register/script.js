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
    [step1, step2, step3].forEach((s, i) => {
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

      if (data.success) {
        // Build wallet HTML for success popup
        let html = 'Your SkillChain account has been created.';
        if (data.squad) {
          html = `
            <p style="margin-bottom:12px">Your account is live and your Squad wallet is ready.</p>
            <div style="background:#f5f2ee;border-radius:8px;padding:12px 14px;text-align:left;font-size:0.875rem">
              <div style="margin-bottom:4px"><strong>Bank:</strong> ${data.squad.bank_name}</div>
              <div><strong>Account No:</strong>
                <span style="font-family:monospace;font-weight:700;color:#e85c00">
                  ${data.squad.account_number}
                </span>
              </div>
            </div>
          `;
        }

        // Use SweetAlert2 if available, else plain alert
        if (window.Swal) {
          Swal.fire({
            title: '🎉 Account Created!',
            html,
            icon: 'success',
            confirmButtonColor: '#e85c00',
            confirmButtonText: 'Go to Login →',
            allowOutsideClick: false
          }).then((result) => {
            if (result.isConfirmed) window.location.href = data.redirect;
          });
        } else {
          alert('Account created successfully!');
          window.location.href = data.redirect;
        }

      } else {
        resetBtn();
        const errs = data.errors || {};

        // Route each server error back to the correct step + field
        if (errs.role)     { showBanner(errs.role);                              goToStep(1); }
        if (errs.name)     { showError(nameInput,   errName,    errs.name);      goToStep(2); }
        if (errs.email)    { showError(emailInput,  errEmail,   errs.email);     goToStep(2); }
        if (errs.phone)    { showError(phoneInput,  errPhone,   errs.phone);     goToStep(2); }
        if (errs.trade)    { showError(tradeSelect, errTrade,   errs.trade);     goToStep(2); }
        if (errs.password) { showError(pwInput,     errPw,      errs.password);  goToStep(3); }
        if (errs.general)  { showBanner(errs.general); }
      }

    } catch (err) {
      console.error('Fetch error:', err);
      resetBtn();
      showBanner('Network error — make sure Flask is running on port 5000.');
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