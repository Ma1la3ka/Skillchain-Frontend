let currentEmail = "";
let currentToken = "";

const showStep = (stepNum) => {
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    document.getElementById(`step-${stepNum}`).classList.add('active');
};

// Step 1: Request Code
document.getElementById('btn-send-code').onclick = async () => {
    currentEmail = document.getElementById('reset-email').value;
    const response = await fetch('http://127.0.0.1:5000/forgot-password', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: currentEmail })
    });
    const data = await response.json();
    if(data.success) {
        document.getElementById('display-email').innerText = currentEmail;
        showStep(2);
    } else {
        alert(data.message);
    }
};

// Step 2: Transition to Step 3
document.getElementById('btn-verify-token').onclick = () => {
    currentToken = document.getElementById('reset-token').value;
    if(currentToken.length === 6) {
        showStep(3);
    } else {
        alert("Please enter the 6-digit code.");
    }
};

// Step 3: Final Reset
document.getElementById('btn-finish-reset').onclick = async () => {
    const password = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;

    if(password !== confirm) return alert("Passwords do not match");

    const response = await fetch('http://127.0.0.1:5000/reset-password-final', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            email: currentEmail, 
            token: currentToken, 
            password: password 
        })
    });
    const data = await response.json();
    if(data.success) {
        alert("Success! Log in with your new password.");
        window.location.href = data.redirect;
    } else {
        alert(data.message);
    }
};