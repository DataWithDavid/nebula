import pandas as pd
import numpy as np
from js import localStorage, console

class FinancialAnalyzer:
    def __init__(self):
        self.transactions = self.load_transactions()
        self.goals = self.load_goals()
    
    def load_transactions(self):
        """Carrega transações do IndexedDB via JavaScript"""
        transactions_json = localStorage.getItem("nebula_transactions")
        if transactions_json:
            return pd.read_json(transactions_json)
        return pd.DataFrame(columns=[
            'id', 'date', 'amount', 'category', 'description', 'type'
        ])
    
    def load_goals(self):
        """Carrega metas do IndexedDB via JavaScript"""
        goals_json = localStorage.getItem("nebula_goals")
        if goals_json:
            return pd.read_json(goals_json)
        return pd.DataFrame(columns=[
            'id', 'name', 'target_amount', 'current_amount', 
            'target_date', 'category'
        ])
    
    def add_transaction(self, transaction_data):
        """Adiciona uma nova transação"""
        new_id = str(int(np.random.rand() * 10**9))
        new_trans = pd.DataFrame([{
            'id': new_id,
            'date': transaction_data.get('date', pd.Timestamp.now().isoformat()),
            'amount': float(transaction_data['amount']),
            'category': transaction_data.get('category', 'Outros'),
            'description': transaction_data.get('description', ''),
            'type': transaction_data.get('type', 'expense')
        }])
        
        self.transactions = pd.concat([self.transactions, new_trans], ignore_index=True)
        self.save_transactions()
        return new_id
    
    def save_transactions(self):
        """Salva transações no IndexedDB via JavaScript"""
        localStorage.setItem("nebula_transactions", self.transactions.to_json())
    
    def save_goals(self):
        """Salva metas no IndexedDB via JavaScript"""
        localStorage.setItem("nebula_goals", self.goals.to_json())
    
    def get_balance(self):
        """Calcula o saldo atual"""
        income = self.transactions[self.transactions['type'] == 'income']['amount'].sum()
        expenses = self.transactions[self.transactions['type'] == 'expense']['amount'].sum()
        return income - expenses
    
    def get_monthly_summary(self):
        """Gera resumo mensal por categoria"""
        if self.transactions.empty:
            return {}
            
        df = self.transactions.copy()
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M')
        
        current_month = pd.Timestamp.now().to_period('M')
        monthly_data = df[df['month'] == current_month]
        
        if monthly_data.empty:
            return {}
            
        expenses = monthly_data[monthly_data['type'] == 'expense']
        income = monthly_data[monthly_data['type'] == 'income']
        
        expense_by_category = expenses.groupby('category')['amount'].sum().to_dict()
        income_by_category = income.groupby('category')['amount'].sum().to_dict()
        
        return {
            'expenses': expense_by_category,
            'income': income_by_category,
            'total_expenses': expenses['amount'].sum(),
            'total_income': income['amount'].sum(),
            'balance': income['amount'].sum() - expenses['amount'].sum()
        }
    
    def predict_future(self, months=3):
        """Previsão simples para os próximos meses"""
        if self.transactions.empty:
            return {}
            
        df = self.transactions.copy()
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M')
        
        # Agrupar por mês e tipo
        monthly = df.groupby(['month', 'type'])['amount'].sum().unstack()
        monthly = monthly.fillna(0)
        
        # Previsão simples (média móvel)
        if len(monthly) >= 3:
            pred_income = monthly['income'].rolling(3).mean().iloc[-1]
            pred_expense = monthly['expense'].rolling(3).mean().iloc[-1]
        else:
            pred_income = monthly['income'].mean() if 'income' in monthly else 0
            pred_expense = monthly['expense'].mean() if 'expense' in monthly else 0
        
        predictions = []
        current_month = pd.Timestamp.now().to_period('M')
        
        for i in range(1, months + 1):
            month = current_month + i
            predictions.append({
                'month': str(month),
                'predicted_income': float(pred_income),
                'predicted_expense': float(pred_expense),
                'predicted_balance': float(pred_income - pred_expense)
            })
        
        return predictions
    
    def check_alerts(self):
        """Verifica condições para alertas"""
        alerts = []
        balance = self.get_balance()
        
        # Verificar saldo baixo
        if balance < 0:
            alerts.append({
                'type': 'negative_balance',
                'message': f'Seu saldo está negativo: R${balance:.2f}',
                'severity': 'high'
            })
        
        # Verificar metas próximas do prazo
        if not self.goals.empty:
            now = pd.Timestamp.now()
            upcoming_goals = self.goals[
                (pd.to_datetime(self.goals['target_date'])) - now <= pd.Timedelta(days=30)
            ]
            
            for _, goal in upcoming_goals.iterrows():
                progress = goal['current_amount'] / goal['target_amount']
                if progress < 0.75:
                    alerts.append({
                        'type': 'goal_reminder',
                        'message': f'Meta "{goal["name"]}" está com progresso baixo ({progress:.0%})',
                        'severity': 'medium'
                    })
        
        return alerts

# Expor a classe para JavaScript
analyzer = FinancialAnalyzer()