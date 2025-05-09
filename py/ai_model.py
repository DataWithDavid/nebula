import pandas as pd
import numpy as np
from js import localStorage
import json
from datetime import datetime

class SimpleFinancialAI:
    def __init__(self):
        """Inicializa o modelo de IA com padrões básicos de categorização"""
        self.model = {
            'category_patterns': {
                'Alimentação': ['mercado', 'restaurante', 'lanche', 'comida', 'supermercado'],
                'Transporte': ['uber', 'taxi', 'ônibus', 'metro', 'combustível', 'posto', 'estacionamento'],
                'Moradia': ['aluguel', 'condomínio', 'luz', 'água', 'internet', 'energia', 'conta de luz'],
                'Lazer': ['cinema', 'parque', 'viagem', 'hobby', 'netflix', 'streaming', 'jogo'],
                'Saúde': ['médico', 'farmacia', 'plano de saúde', 'hospital', 'remédio'],
                'Educação': ['curso', 'livro', 'faculdade', 'escola', 'material escolar'],
                'Outros': []
            },
            'spending_habits': {},
            'last_trained': datetime.now().isoformat()
        }
        self.load_model()

    def load_model(self):
        """Carrega o modelo salvo do localStorage"""
        try:
            model_data = localStorage.getItem("nebula_ai_model")
            if model_data:
                loaded_model = json.loads(model_data)
                # Mescla os padrões existentes com os novos
                for category in self.model['category_patterns']:
                    if category in loaded_model['category_patterns']:
                        loaded_model['category_patterns'][category] = list(
                            set(loaded_model['category_patterns'][category] + 
                            self.model['category_patterns'][category]))
                
                self.model = {
                    **loaded_model,
                    'category_patterns': {
                        **self.model['category_patterns'],
                        **loaded_model.get('category_patterns', {})
                    }
                }
        except Exception as e:
            print(f"Erro ao carregar modelo: {str(e)}")
            self.save_model()

    def save_model(self):
        """Salva o modelo atual no localStorage"""
        try:
            self.model['last_trained'] = datetime.now().isoformat()
            localStorage.setItem("nebula_ai_model", json.dumps(self.model))
        except Exception as e:
            print(f"Erro ao salvar modelo: {str(e)}")

    def categorize_transaction(self, description):
        """
        Categoriza uma transação baseada na descrição
        Args:
            description (str): Descrição da transação
        Returns:
            str: Categoria determinada
        """
        if not description:
            return 'Outros'
            
        description_lower = description.lower()
        
        # Primeiro verifica por correspondências exatas
        for category, patterns in self.model['category_patterns'].items():
            if any(pattern.lower() == description_lower for pattern in patterns):
                return category
                
        # Depois verifica por substrings
        for category, patterns in self.model['category_patterns'].items():
            if any(pattern in description_lower for pattern in patterns):
                return category
                
        return 'Outros'

    def analyze_spending_habits(self, transactions_df):
        """
        Analisa hábitos de gastos do usuário
        Args:
            transactions_df (DataFrame): DataFrame de transações
        Returns:
            dict: Dicionário com análise de hábitos
        """
        if transactions_df.empty:
            return {}
            
        try:
            # Converter para DataFrame se necessário
            if not isinstance(transactions_df, pd.DataFrame):
                transactions_df = pd.DataFrame(transactions_df)
            
            # Garantir que temos as colunas necessárias
            if 'date' not in transactions_df.columns:
                transactions_df['date'] = pd.to_datetime(datetime.now().isoformat())
            else:
                transactions_df['date'] = pd.to_datetime(transactions_df['date'])
                
            if 'amount' not in transactions_df.columns:
                transactions_df['amount'] = 0.0
            else:
                transactions_df['amount'] = transactions_df['amount'].astype(float)
                
            if 'category' not in transactions_df.columns:
                transactions_df['category'] = 'Outros'
                
            if 'type' not in transactions_df.columns:
                transactions_df['type'] = 'expense'
            
            # Análise mensal
            monthly_analysis = transactions_df.groupby(
                [transactions_df['date'].dt.to_period('M'), 'type']
            )['amount'].sum().unstack().fillna(0)
            
            # Análise por categoria
            category_analysis = transactions_df[transactions_df['type'] == 'expense'] \
                .groupby('category')['amount'] \
                .agg(['sum', 'count', 'mean']) \
                .rename(columns={
                    'sum': 'total_gasto',
                    'count': 'quantidade',
                    'mean': 'media_por_transacao'
                })
            
            # Padrões de gastos
            spending_patterns = {
                'monthly_trend': monthly_analysis.to_dict(),
                'category_distribution': category_analysis.to_dict(),
                'average_monthly_spending': monthly_analysis['expense'].mean(),
                'most_common_category': category_analysis['total_gasto'].idxmax(),
                'last_updated': datetime.now().isoformat()
            }
            
            self.model['spending_habits'] = spending_patterns
            self.save_model()
            
            return spending_patterns
            
        except Exception as e:
            print(f"Erro na análise de hábitos: {str(e)}")
            return {}

    def predict_anomalies(self, transaction):
        """
        Detecta possíveis anomalias em novas transações
        Args:
            transaction (dict): Dicionário com dados da transação
        Returns:
            tuple: (bool, str) indicando se é anomalia e mensagem explicativa
        """
        try:
            if not self.model.get('spending_habits'):
                return False, "Modelo não treinado suficiente"
                
            category = transaction.get('category', 'Outros')
            amount = float(transaction.get('amount', 0))
            
            # Obter estatísticas da categoria
            cat_stats = self.model['spending_habits']['category_distribution'].get(category, {})
            
            if not cat_stats:
                return False, "Categoria sem histórico suficiente"
                
            avg_amount = cat_stats.get('media_por_transacao', 0)
            std_amount = cat_stats.get('std_por_transacao', avg_amount * 0.5)  # Estimativa se não houver std
            
            # Se o valor for maior que 3x o desvio padrão + média
            if amount > (avg_amount + 3 * std_amount):
                return True, f"Valor {amount:.2f} muito acima da média {avg_amount:.2f} para {category}"
                
            return False, "Transação dentro dos padrões normais"
            
        except Exception as e:
            print(f"Erro na detecção de anomalias: {str(e)}")
            return False, "Erro na análise"

    def train_model(self, transactions_data):
        """
        Treina o modelo com novos dados
        Args:
            transactions_data (list/DataFrame): Dados de transações para treinamento
        Returns:
            dict: Resultado do treinamento
        """
        try:
            # Converter para DataFrame se necessário
            if not isinstance(transactions_data, pd.DataFrame):
                transactions_df = pd.DataFrame(transactions_data)
            else:
                transactions_df = transactions_data.copy()
            
            # Processar categorias
            transactions_df['category'] = transactions_df.apply(
                lambda row: self.categorize_transaction(row.get('description', '')),
                axis=1
            )
            
            # Atualizar padrões de categorias
            self.update_category_patterns(transactions_df)
            
            # Analisar hábitos
            analysis = self.analyze_spending_habits(transactions_df)
            
            return {
                'status': 'success',
                'categories_updated': len(self.model['category_patterns']),
                'analysis': analysis,
                'last_trained': self.model['last_trained']
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

    def update_category_patterns(self, transactions_df):
        """
        Atualiza os padrões de categorias baseado nas transações
        Args:
            transactions_df (DataFrame): DataFrame de transações
        """
        try:
            # Agrupar descrições por categoria
            desc_by_category = transactions_df.groupby('category')['description'] \
                .apply(list).to_dict()
            
            # Atualizar padrões para cada categoria
            for category, descriptions in desc_by_category.items():
                if category not in self.model['category_patterns']:
                    self.model['category_patterns'][category] = []
                
                # Adicionar palavras únicas das descrições
                new_words = set()
                for desc in descriptions:
                    if isinstance(desc, str):
                        words = desc.lower().split()
                        new_words.update(words)
                
                # Adicionar apenas palavras novas
                current_patterns = set(self.model['category_patterns'][category])
                new_words = [word for word in new_words 
                           if word not in current_patterns and len(word) > 3]
                
                self.model['category_patterns'][category].extend(new_words)
            
            self.save_model()
            
        except Exception as e:
            print(f"Erro ao atualizar padrões: {str(e)}")

# Expor a classe para JavaScript
financial_ai = SimpleFinancialAI()