// Estado da aplicação
let state = {
    currentUser: null,
    transactions: [
        // Dados de exemplo para teste
        {
            id: "1",
            date: new Date().toISOString(),
            description: "Salário",
            amount: 5000,
            category: "Rendimento",
            type: "income"
        },
        {
            id: "2",
            date: new Date().toISOString(),
            description: "Supermercado",
            amount: 350,
            category: "Alimentação",
            type: "expense"
        }
    ],
    goals: [
        {
            id: "1",
            name: "Viagem à Europa",
            target_amount: 15000,
            current_amount: 5000,
            target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            category: "Viagem"
        }
    ],
    alerts: [],
    settings: {
        currency: 'BRL',
        theme: 'dark',
        alertThreshold: 1000,
        language: 'pt-BR'
    },
    charts: {}
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    
    if (state.currentUser) {
        showApp();
        updateDashboard(); // Carrega o dashboard imediatamente
    } else {
        showAuth();
    }
});

// ======================
// FUNÇÕES DE AUTENTICAÇÃO
// ======================

function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    if (state.currentUser) {
        document.getElementById('user-email').textContent = state.currentUser.email;
    }
    applyTheme();
}

function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('user-email').textContent = state.currentUser.email;
    applyTheme();
}

function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showAlert('Preencha todos os campos', 'error');
        return;
    }
    
    // Simular autenticação
    const users = JSON.parse(localStorage.getItem('nebula_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        state.currentUser = user;
        if (user.settings) {
            state.settings = user.settings;
        }
        saveToLocalStorage();
        showApp();
        showDashboard();
        showAlert('Login realizado com sucesso', 'success');
    } else {
        showAlert('E-mail ou senha incorretos', 'error');
    }
}

async function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (!name || !email || !password) {
        showAlert('Preencha todos os campos', 'error');
        return;
    }
    
    // Verificar se o usuário já existe
    const users = JSON.parse(localStorage.getItem('nebula_users') || '[]');
    if (users.some(u => u.email === email)) {
        showAlert('E-mail já cadastrado', 'error');
        return;
    }
    
    // Criar novo usuário
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password, // Na prática, usar hash
        createdAt: new Date().toISOString(),
        settings: state.settings
    };
    
    users.push(newUser);
    localStorage.setItem('nebula_users', JSON.stringify(users));
    
    state.currentUser = newUser;
    saveToLocalStorage();
    
    showApp();
    showDashboard();
    showAlert('Conta criada com sucesso!', 'success');
}

function logout() {
    state.currentUser = null;
    saveToLocalStorage();
    showAuth();
    showLogin();
}

// ======================
// FUNÇÕES DE VISUALIZAÇÃO
// ======================

function showDashboard() {
    state.currentView = 'dashboard';
    const content = `
        <div class="view-container">
            <div class="view-header">
                <h2 class="view-title">Dashboard</h2>
                <div>
                    <button class="btn" onclick="refreshDashboard()">Atualizar</button>
                </div>
            </div>
            
            <div class="dashboard">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Resumo Financeiro</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="balance-chart"></canvas>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Gastos por Categoria</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="category-chart"></canvas>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Metas em Progresso</h3>
                    </div>
                    <div id="goals-progress"></div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Previsão Financeira</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="forecast-chart"></canvas>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Últimas Transações</h3>
                    </div>
                    <div id="recent-transactions"></div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Alertas</h3>
                    </div>
                    <div id="alerts-list"></div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    updateDashboard();
}

function showTransactions() {
    state.currentView = 'transactions';
    const content = `
        <div class="view-container">
            <div class="view-header">
                <h2 class="view-title">Transações</h2>
                <div>
                    <button class="btn" onclick="showAddTransaction()">Nova Transação</button>
                    <button class="btn btn-secondary" onclick="importTransactions()">Importar</button>
                </div>
            </div>
            
            <div class="tabs">
                <div class="tab active" onclick="filterTransactions('all')">Todas</div>
                <div class="tab" onclick="filterTransactions('income')">Receitas</div>
                <div class="tab" onclick="filterTransactions('expense')">Despesas</div>
            </div>
            
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Valor</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="transactions-list">
                        <!-- Transações serão inseridas aqui -->
                    </tbody>
                </table>
            </div>
            
            <div id="transaction-modal" class="modal" style="display:none;">
                <div class="modal-content">
                    <span class="close" onclick="closeModal('transaction-modal')">&times;</span>
                    <h3 id="modal-transaction-title">Adicionar Transação</h3>
                    <form id="transaction-form">
                        <div class="form-group">
                            <label for="trans-date">Data</label>
                            <input type="date" id="trans-date" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="trans-description">Descrição</label>
                            <input type="text" id="trans-description" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="trans-amount">Valor</label>
                            <input type="number" id="trans-amount" class="form-control" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="trans-category">Categoria</label>
                            <select id="trans-category" class="form-control" required>
                                <option value="Alimentação">Alimentação</option>
                                <option value="Transporte">Transporte</option>
                                <option value="Moradia">Moradia</option>
                                <option value="Lazer">Lazer</option>
                                <option value="Saúde">Saúde</option>
                                <option value="Educação">Educação</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="trans-type">Tipo</label>
                            <select id="trans-type" class="form-control" required>
                                <option value="expense">Despesa</option>
                                <option value="income">Receita</option>
                            </select>
                        </div>
                        <input type="hidden" id="trans-id">
                        <button type="submit" class="btn">Salvar</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    document.getElementById('transaction-form').addEventListener('submit', saveTransaction);
    loadTransactions();
}

function showGoals() {
    state.currentView = 'goals';
    const content = `
        <div class="view-container">
            <div class="view-header">
                <h2 class="view-title">Metas Financeiras</h2>
                <div>
                    <button class="btn" onclick="showAddGoal()">Nova Meta</button>
                </div>
            </div>
            
            <div id="goals-list">
                <!-- Metas serão inseridas aqui -->
            </div>
            
            <div id="goal-modal" class="modal" style="display:none;">
                <div class="modal-content">
                    <span class="close" onclick="closeModal('goal-modal')">&times;</span>
                    <h3 id="modal-goal-title">Adicionar Meta</h3>
                    <form id="goal-form">
                        <div class="form-group">
                            <label for="goal-name">Nome da Meta</label>
                            <input type="text" id="goal-name" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="goal-target">Valor Alvo</label>
                            <input type="number" id="goal-target" class="form-control" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="goal-current">Valor Atual</label>
                            <input type="number" id="goal-current" class="form-control" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="goal-date">Data Limite</label>
                            <input type="date" id="goal-date" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="goal-category">Categoria</label>
                            <select id="goal-category" class="form-control" required>
                                <option value="Viagem">Viagem</option>
                                <option value="Compras">Compras</option>
                                <option value="Educação">Educação</option>
                                <option value="Emergência">Emergência</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                        <input type="hidden" id="goal-id">
                        <button type="submit" class="btn">Salvar</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    document.getElementById('goal-form').addEventListener('submit', saveGoal);
    loadGoals();
}

function showReports() {
    state.currentView = 'reports';
    const content = `
        <div class="view-container">
            <div class="view-header">
                <h2 class="view-title">Relatórios</h2>
                <div>
                    <button class="btn" onclick="generateReport()">Gerar Relatório</button>
                </div>
            </div>
            
            <div class="report-options">
                <div class="report-card" onclick="showReport('monthly')">
                    <h3>Relatório Mensal</h3>
                    <p>Resumo completo do mês atual</p>
                </div>
                
                <div class="report-card" onclick="showReport('category')">
                    <h3>Por Categoria</h3>
                    <p>Análise de gastos por categoria</p>
                </div>
                
                <div class="report-card" onclick="showReport('yearly')">
                    <h3>Anual</h3>
                    <p>Visão geral do ano</p>
                </div>
                
                <div class="report-card" onclick="showReport('custom')">
                    <h3>Personalizado</h3>
                    <p>Crie um relatório com seus critérios</p>
                </div>
            </div>
            
            <div id="report-content">
                <!-- Conteúdo do relatório será exibido aqui -->
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
}

function showSettings() {
    state.currentView = 'settings';
    const content = `
        <div class="view-container">
            <div class="view-header">
                <h2 class="view-title">Configurações</h2>
            </div>
            
            <div class="settings-section">
                <h3>Preferências</h3>
                <div class="form-group">
                    <label for="currency">Moeda</label>
                    <select id="currency" class="form-control">
                        <option value="BRL">Real Brasileiro (R$)</option>
                        <option value="USD">Dólar Americano ($)</option>
                        <option value="EUR">Euro (€)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="language">Idioma</label>
                    <select id="language" class="form-control">
                        <option value="pt-BR">Português (Brasil)</option>
                        <option value="en-US">Inglês (EUA)</option>
                        <option value="es-ES">Espanhol</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Tema Escuro</label>
                    <label class="toggle-switch">
                        <input type="checkbox" id="dark-theme">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>Alertas</h3>
                <div class="form-group">
                    <label for="alert-threshold">Limite para Alertas (R$)</label>
                    <input type="number" id="alert-threshold" class="form-control" value="${state.settings.alertThreshold}">
                </div>
            </div>
            
            <div class="settings-section">
                <h3>Conta</h3>
                <button class="btn" onclick="updateSettings()">Salvar Configurações</button>
                <button class="btn btn-secondary" onclick="exportData()">Exportar Dados</button>
                <button class="btn btn-secondary" onclick="requestDeleteAccount()">Excluir Conta</button>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    
    // Preencher valores atuais
    document.getElementById('currency').value = state.settings.currency;
    document.getElementById('language').value = state.settings.language;
    document.getElementById('dark-theme').checked = state.settings.theme === 'dark';
}

// ===================
// FUNÇÕES DE DADOS
// ===================

async function updateDashboard() {
    try {
        // Simular análise financeira
        const summary = {
            total_income: state.transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0),
            total_expenses: state.transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0),
            expenses: state.transactions
                .filter(t => t.type === 'expense')
                .reduce((acc, t) => {
                    acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount);
                    return acc;
                }, {})
        };
        
        // Simular previsões
        const predictions = [];
        const now = new Date();
        
        for (let i = 1; i <= 3; i++) {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
            predictions.push({
                month: nextMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
                predicted_income: summary.total_income * (1 + (Math.random() * 0.1 - 0.05)),
                predicted_expense: summary.total_expenses * (1 + (Math.random() * 0.1 - 0.05))
            });
        }
        
        // Simular alertas
        const alerts = [];
        const balance = summary.total_income - summary.total_expenses;
        
        if (balance < 0) {
            alerts.push({
                type: 'negative_balance',
                message: `Seu saldo está negativo: ${formatCurrency(balance)}`,
                severity: 'high'
            });
        }
        
        if (summary.total_expenses > state.settings.alertThreshold) {
            alerts.push({
                type: 'high_spending',
                message: `Seus gastos estão altos este mês: ${formatCurrency(summary.total_expenses)}`,
                severity: 'medium'
            });
        }
        
        // Atualizar gráficos
        renderCharts(summary, predictions);
        
        // Atualizar lista de transações recentes
        updateRecentTransactions();
        
        // Atualizar metas
        updateGoalsProgress();
        
        // Mostrar alertas
        displayAlerts(alerts);
        
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        showAlert('Erro ao carregar dados do dashboard', 'error');
    }
}

function renderCharts(summary, predictions) {
    // Gráfico de saldo
    const balanceCtx = document.getElementById('balance-chart')?.getContext('2d');
    if (balanceCtx) {
        if (state.charts.balance) state.charts.balance.destroy();
        
        state.charts.balance = new Chart(balanceCtx, {
            type: 'bar',
            data: {
                labels: ['Receitas', 'Despesas', 'Saldo'],
                datasets: [{
                    label: 'Valores',
                    data: [
                        summary.total_income || 0,
                        summary.total_expenses || 0,
                        (summary.total_income || 0) - (summary.total_expenses || 0)
                    ],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Gráfico de categorias
    const categoryCtx = document.getElementById('category-chart')?.getContext('2d');
    if (categoryCtx) {
        if (state.charts.category) state.charts.category.destroy();
        
        const categories = Object.keys(summary.expenses || {});
        const amounts = Object.values(summary.expenses || {});
        
        state.charts.category = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: amounts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // Gráfico de previsão
    const forecastCtx = document.getElementById('forecast-chart')?.getContext('2d');
    if (forecastCtx) {
        if (state.charts.forecast) state.charts.forecast.destroy();
        
        const months = predictions.map(p => p.month);
        const incomes = predictions.map(p => p.predicted_income);
        const expenses = predictions.map(p => p.predicted_expense);
        
        state.charts.forecast = new Chart(forecastCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Receitas Previstas',
                        data: incomes,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.1,
                        fill: true
                    },
                    {
                        label: 'Despesas Previstas',
                        data: expenses,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.1,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

function updateRecentTransactions() {
    const recentTransactions = state.transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    const container = document.getElementById('recent-transactions');
    if (container) {
        container.innerHTML = recentTransactions.map(t => `
            <div class="transaction-item">
                <div>${formatDate(t.date)}</div>
                <div>${t.description}</div>
                <div class="${t.type === 'income' ? 'text-income' : 'text-expense'}">
                    ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                </div>
            </div>
        `).join('');
    }
}

function loadTransactions(filter = 'all') {
    const filteredTransactions = filter === 'all' 
        ? state.transactions 
        : state.transactions.filter(t => t.type === filter);
    
    const container = document.getElementById('transactions-list');
    if (container) {
        container.innerHTML = filteredTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(t => `
                <tr>
                    <td>${formatDate(t.date)}</td>
                    <td>${t.description}</td>
                    <td>${t.category}</td>
                    <td class="${t.type === 'income' ? 'text-income' : 'text-expense'}">
                        ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                    </td>
                    <td>
                        <button class="btn-icon" onclick="editTransaction('${t.id}')">✏️</button>
                        <button class="btn-icon" onclick="deleteTransaction('${t.id}')">🗑️</button>
                    </td>
                </tr>
            `).join('');
    }
}

function filterTransactions(type) {
    // Atualizar tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filtrar transações
    loadTransactions(type);
}

function loadGoals() {
    const container = document.getElementById('goals-list');
    if (container) {
        container.innerHTML = state.goals
            .sort((a, b) => new Date(a.target_date) - new Date(b.target_date))
            .map(g => `
                <div class="goal-card">
                    <div class="goal-header">
                        <h4>${g.name}</h4>
                        <div>
                            <button class="btn-icon" onclick="editGoal('${g.id}')">✏️</button>
                            <button class="btn-icon" onclick="deleteGoal('${g.id}')">🗑️</button>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(g.current_amount / g.target_amount) * 100}%"></div>
                    </div>
                    <div class="goal-details">
                        <span>${formatCurrency(g.current_amount)} de ${formatCurrency(g.target_amount)}</span>
                        <span>${calculateProgress(g)}% concluído</span>
                        <span>Vence em ${formatDate(g.target_date)}</span>
                    </div>
                </div>
            `).join('');
    }
}

function updateGoalsProgress() {
    const container = document.getElementById('goals-progress');
    if (container) {
        container.innerHTML = state.goals
            .map(g => `
                <div class="goal-progress">
                    <h4>${g.name}</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(g.current_amount / g.target_amount) * 100}%"></div>
                    </div>
                    <div class="goal-details">
                        <span>${formatCurrency(g.current_amount)} de ${formatCurrency(g.target_amount)}</span>
                        <span>${calculateProgress(g)}% concluído</span>
                    </div>
                </div>
            `).join('');
    }
}

function displayAlerts(alerts) {
    const container = document.getElementById('alerts-list');
    if (container) {
        container.innerHTML = alerts
            .map(a => `
                <div class="alert alert-${a.severity === 'high' ? 'error' : 'warning'}">
                    <span>${a.message}</span>
                    <button onclick="this.parentElement.remove()">&times;</button>
                </div>
            `).join('');
    }
}

// ========================
// FUNÇÕES DE MANIPULAÇÃO
// ========================

function showAddTransaction() {
    const modal = document.getElementById('transaction-modal');
    document.getElementById('modal-transaction-title').textContent = 'Adicionar Transação';
    document.getElementById('trans-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('trans-id').value = '';
    document.getElementById('transaction-form').reset();
    modal.style.display = 'block';
}

function editTransaction(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (transaction) {
        const modal = document.getElementById('transaction-modal');
        document.getElementById('modal-transaction-title').textContent = 'Editar Transação';
        document.getElementById('trans-id').value = transaction.id;
        document.getElementById('trans-date').value = transaction.date.split('T')[0];
        document.getElementById('trans-description').value = transaction.description;
        document.getElementById('trans-amount').value = transaction.amount;
        document.getElementById('trans-category').value = transaction.category;
        document.getElementById('trans-type').value = transaction.type;
        modal.style.display = 'block';
    }
}

function saveTransaction(e) {
    e.preventDefault();
    
    const id = document.getElementById('trans-id').value || Date.now().toString();
    const date = document.getElementById('trans-date').value;
    const description = document.getElementById('trans-description').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const category = document.getElementById('trans-category').value;
    const type = document.getElementById('trans-type').value;
    
    const transaction = {
        id,
        date,
        description,
        amount,
        category,
        type
    };
    
    // Atualizar ou adicionar transação
    const index = state.transactions.findIndex(t => t.id === id);
    if (index >= 0) {
        state.transactions[index] = transaction;
    } else {
        state.transactions.push(transaction);
    }
    
    saveToLocalStorage();
    closeModal('transaction-modal');
    
    // Atualizar view atual
    if (state.currentView === 'dashboard') {
        updateDashboard();
    } else if (state.currentView === 'transactions') {
        loadTransactions();
    }
    
    showAlert('Transação salva com sucesso!', 'success');
}

function deleteTransaction(id) {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveToLocalStorage();
        
        if (state.currentView === 'dashboard') {
            updateDashboard();
        } else if (state.currentView === 'transactions') {
            loadTransactions();
        }
        
        showAlert('Transação excluída com sucesso!', 'success');
    }
}

function showAddGoal() {
    const modal = document.getElementById('goal-modal');
    document.getElementById('modal-goal-title').textContent = 'Adicionar Meta';
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-date').value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById('goal-form').reset();
    modal.style.display = 'block';
}

function editGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (goal) {
        const modal = document.getElementById('goal-modal');
        document.getElementById('modal-goal-title').textContent = 'Editar Meta';
        document.getElementById('goal-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.target_amount;
        document.getElementById('goal-current').value = goal.current_amount;
        document.getElementById('goal-date').value = goal.target_date.split('T')[0];
        document.getElementById('goal-category').value = goal.category;
        modal.style.display = 'block';
    }
}

function saveGoal(e) {
    e.preventDefault();
    
    const id = document.getElementById('goal-id').value || Date.now().toString();
    const name = document.getElementById('goal-name').value;
    const target_amount = parseFloat(document.getElementById('goal-target').value);
    const current_amount = parseFloat(document.getElementById('goal-current').value);
    const target_date = document.getElementById('goal-date').value;
    const category = document.getElementById('goal-category').value;
    
    const goal = {
        id,
        name,
        target_amount,
        current_amount,
        target_date,
        category
    };
    
    // Atualizar ou adicionar meta
    const index = state.goals.findIndex(g => g.id === id);
    if (index >= 0) {
        state.goals[index] = goal;
    } else {
        state.goals.push(goal);
    }
    
    saveToLocalStorage();
    closeModal('goal-modal');
    
    // Atualizar view atual
    if (state.currentView === 'dashboard') {
        updateDashboard();
    } else if (state.currentView === 'goals') {
        loadGoals();
    }
    
    showAlert('Meta salva com sucesso!', 'success');
}

function deleteGoal(id) {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
        state.goals = state.goals.filter(g => g.id !== id);
        saveToLocalStorage();
        
        if (state.currentView === 'dashboard') {
            updateDashboard();
        } else if (state.currentView === 'goals') {
            loadGoals();
        }
        
        showAlert('Meta excluída com sucesso!', 'success');
    }
}

function updateSettings() {
    const currency = document.getElementById('currency').value;
    const language = document.getElementById('language').value;
    const theme = document.getElementById('dark-theme').checked ? 'dark' : 'light';
    const alertThreshold = parseFloat(document.getElementById('alert-threshold').value);
    
    state.settings = {
        currency,
        language,
        theme,
        alertThreshold
    };
    
    // Atualizar configurações do usuário
    if (state.currentUser) {
        const users = JSON.parse(localStorage.getItem('nebula_users') || '[]');
        const userIndex = users.findIndex(u => u.id === state.currentUser.id);
        
        if (userIndex >= 0) {
            users[userIndex].settings = state.settings;
            localStorage.setItem('nebula_users', JSON.stringify(users));
            state.currentUser.settings = state.settings;
        }
    }
    
    saveToLocalStorage();
    applyTheme();
    showAlert('Configurações salvas com sucesso!', 'success');
}

function applyTheme() {
    if (state.settings.theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function exportData() {
    const data = {
        transactions: state.transactions,
        goals: state.goals,
        settings: state.settings
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `nebula-finance-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showAlert('Dados exportados com sucesso!', 'success');
}

function requestDeleteAccount() {
    if (confirm('Tem certeza que deseja excluir sua conta? Todos os dados serão perdidos permanentemente.')) {
        // Remover usuário
        const users = JSON.parse(localStorage.getItem('nebula_users') || '[]');
        const updatedUsers = users.filter(u => u.id !== state.currentUser.id);
        localStorage.setItem('nebula_users', JSON.stringify(updatedUsers));
        
        // Limpar dados
        state.currentUser = null;
        state.transactions = [];
        state.goals = [];
        localStorage.removeItem('nebula_state');
        
        showAuth();
        showLogin();
        showAlert('Conta excluída com sucesso', 'success');
    }
}

function showReport(type) {
    let reportContent = '';
    
    switch (type) {
        case 'monthly':
            const now = new Date();
            const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
            const year = now.getFullYear();
            
            const monthlyIncome = state.transactions
                .filter(t => t.type === 'income' && new Date(t.date).getMonth() === now.getMonth())
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            const monthlyExpenses = state.transactions
                .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === now.getMonth())
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            reportContent = `
                <h3>Relatório Mensal - ${monthName}/${year}</h3>
                <div class="report-stats">
                    <div class="stat-card">
                        <h4>Receitas</h4>
                        <p class="text-income">${formatCurrency(monthlyIncome)}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Despesas</h4>
                        <p class="text-expense">${formatCurrency(monthlyExpenses)}</p>
                    </div>
                    <div class="stat-card">
                        <h4>Saldo</h4>
                        <p class="${monthlyIncome - monthlyExpenses >= 0 ? 'text-income' : 'text-expense'}">
                            ${formatCurrency(monthlyIncome - monthlyExpenses)}
                        </p>
                    </div>
                </div>
            `;
            break;
            
        case 'yearly':
            // Implementar relatório anual
            reportContent = '<h3>Relatório Anual</h3><p>Em desenvolvimento</p>';
            break;
            
        case 'category':
            // Implementar relatório por categoria
            reportContent = '<h3>Relatório por Categoria</h3><p>Em desenvolvimento</p>';
            break;
            
        default:
            reportContent = '<h3>Relatório Personalizado</h3><p>Em desenvolvimento</p>';
    }
    
    document.getElementById('report-content').innerHTML = reportContent;
}

function generateReport() {
    // Implementar geração de relatório em PDF
    showAlert('Exportação para PDF em desenvolvimento', 'info');
}

function importTransactions() {
    // Implementar importação de transações
    showAlert('Importação de transações em desenvolvimento', 'info');
}

// =====================
// FUNÇÕES DE UTILIDADE
// =====================

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function saveToLocalStorage() {
    localStorage.setItem('nebula_state', JSON.stringify(state));
}

function loadFromLocalStorage() {
    const savedState = localStorage.getItem('nebula_state');
    if (savedState) {
        state = JSON.parse(savedState);
    }
}

function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: state.settings.currency
    }).format(amount);
}

function calculateProgress(goal) {
    return Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
}

function refreshDashboard() {
    updateDashboard();
    showAlert('Dashboard atualizado', 'success');
}

// Inicializar Pyodide
async function loadPyodide() {
    let pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
    });
    await pyodide.loadPackage("micropip");
    await pyodide.runPythonAsync(`
        import micropip
        await micropip.install('pandas')
        await micropip.install('numpy')
    `);
    return pyodide;
}

// ======================
// FUNÇÕES DO DASHBOARD
// ======================

function updateDashboard() {
    try {
        // Calcular totais
        const summary = {
            total_income: state.transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0),
            total_expenses: state.transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0),
            expenses: state.transactions
                .filter(t => t.type === 'expense')
                .reduce((acc, t) => {
                    acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount);
                    return acc;
                }, {})
        };

        // Criar previsões simuladas
        const predictions = [];
        const now = new Date();
        
        for (let i = 1; i <= 3; i++) {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
            predictions.push({
                month: nextMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
                predicted_income: summary.total_income * (0.9 + Math.random() * 0.2), // Variação de ±10%
                predicted_expense: summary.total_expenses * (0.9 + Math.random() * 0.2)
            });
        }

        // Verificar alertas
        const alerts = [];
        const balance = summary.total_income - summary.total_expenses;
        
        if (balance < 0) {
            alerts.push({
                type: 'negative_balance',
                message: `Seu saldo está negativo: ${formatCurrency(balance)}`,
                severity: 'high'
            });
        }

        if (summary.total_expenses > state.settings.alertThreshold) {
            alerts.push({
                type: 'high_spending',
                message: `Seus gastos estão altos este mês: ${formatCurrency(summary.total_expenses)}`,
                severity: 'medium'
            });
        }

        // Atualizar gráficos
        renderCharts(summary, predictions);
        
        // Atualizar transações recentes
        updateRecentTransactions();
        
        // Atualizar metas
        updateGoalsProgress();
        
        // Mostrar alertas
        displayAlerts(alerts);

    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        showAlert('Erro ao carregar dados do dashboard', 'error');
    }
}

function renderCharts(summary, predictions) {
    // Gráfico de saldo
    const balanceCtx = document.getElementById('balance-chart')?.getContext('2d');
    if (balanceCtx) {
        if (state.charts.balance) state.charts.balance.destroy();
        
        state.charts.balance = new Chart(balanceCtx, {
            type: 'bar',
            data: {
                labels: ['Receitas', 'Despesas', 'Saldo'],
                datasets: [{
                    label: 'Valores',
                    data: [
                        summary.total_income || 0,
                        summary.total_expenses || 0,
                        (summary.total_income || 0) - (summary.total_expenses || 0)
                    ],
                    backgroundColor: [
                        'rgba(0, 212, 255, 0.7)',
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)'
                    ],
                    borderColor: [
                        'rgba(0, 212, 255, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#e2e2e2'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#e2e2e2'
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico de categorias
    const categoryCtx = document.getElementById('category-chart')?.getContext('2d');
    if (categoryCtx) {
        if (state.charts.category) state.charts.category.destroy();
        
        const categories = Object.keys(summary.expenses || {});
        const amounts = Object.values(summary.expenses || {});
        
        state.charts.category = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: amounts,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#e2e2e2'
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    // Gráfico de previsão
    const forecastCtx = document.getElementById('forecast-chart')?.getContext('2d');
    if (forecastCtx) {
        if (state.charts.forecast) state.charts.forecast.destroy();
        
        const months = predictions.map(p => p.month);
        const incomes = predictions.map(p => p.predicted_income);
        const expenses = predictions.map(p => p.predicted_expense);
        
        state.charts.forecast = new Chart(forecastCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Receitas Previstas',
                        data: incomes,
                        borderColor: 'rgba(0, 212, 255, 1)',
                        backgroundColor: 'rgba(0, 212, 255, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Despesas Previstas',
                        data: expenses,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e2e2e2'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#e2e2e2'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#e2e2e2'
                        }
                    }
                }
            }
        });
    }
}

function updateRecentTransactions() {
    const container = document.getElementById('recent-transactions');
    if (container) {
        const recent = [...state.transactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        container.innerHTML = recent.map(t => `
            <div class="transaction-item">
                <div class="trans-date">${formatDate(t.date)}</div>
                <div class="trans-desc">${t.description}</div>
                <div class="trans-amount ${t.type === 'income' ? 'income' : 'expense'}">
                    ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                </div>
            </div>
        `).join('');
    }
}

function updateGoalsProgress() {
    const container = document.getElementById('goals-progress');
    if (container) {
        container.innerHTML = state.goals.map(g => `
            <div class="goal-card">
                <div class="goal-header">
                    <h4>${g.name}</h4>
                    <span class="goal-date">${formatDate(g.target_date)}</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${Math.min(100, (g.current_amount / g.target_amount) * 100)}%"></div>
                </div>
                <div class="goal-details">
                    <span>${formatCurrency(g.current_amount)} de ${formatCurrency(g.target_amount)}</span>
                    <span>${Math.round((g.current_amount / g.target_amount) * 100)}%</span>
                </div>
            </div>
        `).join('');
    }
}

function displayAlerts(alerts) {
    const container = document.getElementById('alerts-list');
    if (container) {
        container.innerHTML = alerts.map(a => `
            <div class="alert ${a.severity === 'high' ? 'alert-error' : 'alert-warning'}">
                <span>${a.message}</span>
                <button onclick="this.parentElement.remove()">&times;</button>
            </div>
        `).join('');
    }
}

// ======================
// FUNÇÕES DE FORMULÁRIO
// ======================

function showAddTransaction() {
    const modal = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <span class="close-modal" onclick="closeModal()">&times;</span>
                <h3>Adicionar Transação</h3>
                <form id="transaction-form" onsubmit="saveTransaction(event)">
                    <div class="form-group">
                        <label for="trans-date">Data</label>
                        <input type="date" id="trans-date" class="form-control" required 
                               value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label for="trans-description">Descrição</label>
                        <input type="text" id="trans-description" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="trans-amount">Valor</label>
                        <input type="number" id="trans-amount" class="form-control" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="trans-category">Categoria</label>
                        <select id="trans-category" class="form-control" required>
                            <option value="Alimentação">Alimentação</option>
                            <option value="Transporte">Transporte</option>
                            <option value="Moradia">Moradia</option>
                            <option value="Lazer">Lazer</option>
                            <option value="Saúde">Saúde</option>
                            <option value="Educação">Educação</option>
                            <option value="Rendimento">Rendimento</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="trans-type">Tipo</label>
                        <select id="trans-type" class="form-control" required>
                            <option value="expense">Despesa</option>
                            <option value="income">Receita</option>
                        </select>
                    </div>
                    <button type="submit" class="btn">Salvar</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

function saveTransaction(e) {
    e.preventDefault();
    
    const transaction = {
        id: Date.now().toString(),
        date: document.getElementById('trans-date').value,
        description: document.getElementById('trans-description').value,
        amount: parseFloat(document.getElementById('trans-amount').value),
        category: document.getElementById('trans-category').value,
        type: document.getElementById('trans-type').value
    };
    
    state.transactions.push(transaction);
    saveToLocalStorage();
    closeModal();
    updateDashboard();
    showAlert('Transação adicionada com sucesso!', 'success');
}

// ======================
// FUNÇÕES AUXILIARES
// ======================

function formatCurrency(amount) {
    return amount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: state.settings.currency
    });
}

function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.getElementById('alert-container').appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

function applyTheme() {
    document.documentElement.style.setProperty('--primary-dark', '#0f0c29');
    document.documentElement.style.setProperty('--primary-medium', '#302b63');
    document.documentElement.style.setProperty('--primary-light', '#24243e');
    document.documentElement.style.setProperty('--accent-color', '#00f5d4');
    document.documentElement.style.setProperty('--text-light', '#f8f9fa');
    
    // Estilo específico para selects
    const style = document.createElement('style');
    style.innerHTML = `
        .form-control {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: #f8f9fa !important;
            border: 1px solid rgba(0, 245, 212, 0.3) !important;
        }
        .form-control option {
            background-color: #302b63 !important;
            color: #f8f9fa !important;
        }
    `;
    document.head.appendChild(style);
}

function saveToLocalStorage() {
    localStorage.setItem('nebula_state', JSON.stringify(state));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('nebula_state');
    if (saved) {
        state = JSON.parse(saved);
    }
}

// Inicializa o dashboard quando a página carrega
window.onload = () => {
    if (document.getElementById('main-content')) {
        updateDashboard();
    }
};

let pyodideReady = loadPyodide();