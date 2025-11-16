let currentToken = '';

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentToken = data.token;
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            document.getElementById('userName').textContent = data.user.name;
            loadApiKeyInfo();
        } else {
            alert('Login gagal: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function loadApiKeyInfo() {
    try {
        const response = await fetch('/api/apikey', {
            headers: {
                'Authorization': 'Bearer ' + currentToken
            }
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('apiKey').textContent = data.api_key;
            document.getElementById('saldoAmount').textContent = 'Rp ' + data.saldo.toLocaleString('id-ID');
            document.getElementById('ipWhitelist').value = data.ip_whitelist.join('\n');
        }
    } catch (error) {
        console.error('Error loading API info:', error);
    }
}

async function refreshApiKey() {
    if (!confirm('Yakin ingin refresh API Key? API Key lama akan tidak berlaku!')) {
        return;
    }

    try {
        const response = await fetch('/api/apikey/refresh', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + currentToken
            }
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('apiKey').textContent = data.api_key;
            alert('API Key berhasil di-refresh!');
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function checkSaldo() {
    try {
        const response = await fetch('/api/apikey/saldo', {
            headers: {
                'Authorization': 'Bearer ' + currentToken
            }
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('saldoAmount').textContent = 'Rp ' + data.saldo.toLocaleString('id-ID');
            alert('Saldo terbaru: Rp ' + data.saldo.toLocaleString('id-ID'));
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function updateWhitelist() {
    const ipText = document.getElementById('ipWhitelist').value;
    const ipAddresses = ipText.split('\n').filter(ip => ip.trim() !== '');

    try {
        const response = await fetch('/api/apikey/whitelist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + currentToken
            },
            body: JSON.stringify({ ip_addresses: ipAddresses })
        });

        const data = await response.json();

        if (data.success) {
            alert('IP Whitelist berhasil diupdate!');
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function testDeposit() {
    const nominal = document.getElementById('testNominal').value;
    const resultDiv = document.getElementById('testResult');

    try {
        const response = await fetch('/api/deposit/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + currentToken
            },
            body: JSON.stringify({ 
                nominal: parseInt(nominal),
                type: 'ewallet',
                method: 'qris'
            })
        });

        const data = await response.json();

        if (data.success) {
            resultDiv.innerHTML = `
                <div style="color: green; font-weight: bold;">
                    ✅ Deposit berhasil dibuat!<br>
                    ID: ${data.data.id}<br>
                    QR: ${data.data.qr_string.substring(0, 50)}...
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="color: red; font-weight: bold;">
                    ❌ Error: ${data.error}
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div style="color: red; font-weight: bold;">
                ❌ Network error: ${error.message}
            </div>
        `;
    }
}

function logout() {
    currentToken = '';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Check if already logged in
if (localStorage.getItem('atlantic_token')) {
    currentToken = localStorage.getItem('atlantic_token');
    // Auto login logic can be added here
}
