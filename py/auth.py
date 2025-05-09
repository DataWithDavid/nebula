from js import localStorage
import json

class AuthManager:
    def __init__(self):
        self.current_user = None
    
    def register_user(self, user_data):
        """Registra um novo usuário"""
        users = self.get_all_users()
        
        # Verificar se o e-mail já existe
        if any(u['email'] == user_data['email'] for u in users):
            return {'success': False, 'message': 'E-mail já cadastrado'}
        
        # Criar novo usuário
        new_user = {
            'id': str(hash(user_data['email'])),
            'name': user_data['name'],
            'email': user_data['email'],
            'password': user_data['password'],  # Em produção, usar hash
            'created_at': self.get_current_timestamp(),
            'settings': {
                'currency': 'BRL',
                'theme': 'dark'
            }
        }
        
        users.append(new_user)
        localStorage.setItem("nebula_users", json.dumps(users))
        
        return {'success': True, 'user': new_user}
    
    def login(self, email, password):
        """Autentica um usuário"""
        users = self.get_all_users()
        user = next((u for u in users if u['email'] == email and u['password'] == password), None)
        
        if user:
            self.current_user = user
            return {'success': True, 'user': user}
        else:
            return {'success': False, 'message': 'E-mail ou senha incorretos'}
    
    def logout(self):
        """Desconecta o usuário atual"""
        self.current_user = None
        return {'success': True}
    
    def update_user_settings(self, user_id, new_settings):
        """Atualiza configurações do usuário"""
        users = self.get_all_users()
        user_index = next((i for i, u in enumerate(users) if u['id'] == user_id), None)
        
        if user_index is not None:
            users[user_index]['settings'] = {
                **users[user_index].get('settings', {}),
                **new_settings
            }
            localStorage.setItem("nebula_users", json.dumps(users))
            
            if self.current_user and self.current_user['id'] == user_id:
                self.current_user['settings'] = users[user_index]['settings']
            
            return {'success': True}
        else:
            return {'success': False, 'message': 'Usuário não encontrado'}
    
    def get_all_users(self):
        """Obtém todos os usuários registrados"""
        users_json = localStorage.getItem("nebula_users")
        return json.loads(users_json) if users_json else []
    
    def get_current_timestamp(self):
        """Retorna timestamp atual em formato ISO"""
        from datetime import datetime
        return datetime.now().isoformat()

# Expor a classe para JavaScript
auth_manager = AuthManager()