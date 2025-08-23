"""
Banking Data Management

This module provides pandas-based data access for banking CSV files.
Supports reading and writing customer interactions to CSV files.
"""

import os
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Base path for banking data CSV files
DATA_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'banking')

# In-memory storage for session data
_authenticated_sessions = {}
_auth_attempts = []

class BankingDataManager:
    """Manages banking data operations using pandas and CSV files."""
    
    def __init__(self):
        self.data_path = DATA_PATH
        self._ensure_data_path_exists()
    
    def _ensure_data_path_exists(self):
        """Ensure the data directory exists."""
        if not os.path.exists(self.data_path):
            os.makedirs(self.data_path, exist_ok=True)
    
    def _get_csv_path(self, filename: str) -> str:
        """Get full path to CSV file."""
        return os.path.join(self.data_path, filename)
    
    def _load_csv(self, filename: str) -> pd.DataFrame:
        """Load CSV file into DataFrame."""
        try:
            return pd.read_csv(self._get_csv_path(filename))
        except FileNotFoundError:
            return pd.DataFrame()
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            return pd.DataFrame()
    
    def _save_csv(self, df: pd.DataFrame, filename: str) -> bool:
        """Save DataFrame to CSV file."""
        try:
            df.to_csv(self._get_csv_path(filename), index=False)
            return True
        except Exception as e:
            print(f"Error saving {filename}: {e}")
            return False

# Global instance
data_manager = BankingDataManager()


def get_customer_data(customer_id: str) -> Dict[str, Any] | None:
    """Get customer data by customer ID from CSV."""
    try:
        customers_df = data_manager._load_csv('customers.csv')
        if customers_df.empty:
            return None
        
        customer_row = customers_df[customers_df['customer_id'] == customer_id]
        if customer_row.empty:
            return None
        
        # Convert to dictionary format similar to original structure
        row = customer_row.iloc[0]
        return {
            "customer_id": row['customer_id'],
            "personal_info": {
                "first_name": row['first_name'],
                "last_name": row['last_name'],
                "email": row['email'],
                "phone": row['phone'],
                "date_of_birth": row['date_of_birth'],
                "ssn_last_four": str(row['ssn_last_four']),
                "address": {
                    "street": row['street'],
                    "city": row['city'],
                    "state": row['state'],
                    "zip": str(row['zip'])
                }
            }
        }
    except Exception as e:
        print(f"Error getting customer data: {e}")
        return None


def get_account_data(customer_id: str, account_id: str) -> Dict[str, Any] | None:
    """Get account data for a specific customer and account from CSV."""
    try:
        accounts_df = data_manager._load_csv('accounts.csv')
        if accounts_df.empty:
            return None
        
        account_row = accounts_df[
            (accounts_df['customer_id'] == customer_id) & 
            (accounts_df['account_id'] == account_id)
        ]
        
        if account_row.empty:
            return None
        
        row = account_row.iloc[0]
        return {
            "account_id": row['account_id'],
            "customer_id": row['customer_id'],
            "account_type": row['account_type'],
            "account_number_masked": row['account_number_masked'],
            "balance": float(row['balance']),
            "available_balance": float(row['available_balance']),
            "status": row['status'],
            "opened_date": row['opened_date']
        }
    except Exception as e:
        print(f"Error getting account data: {e}")
        return None


def get_customer_accounts(customer_id: str) -> List[Dict[str, Any]]:
    """Get all accounts for a customer from CSV."""
    try:
        accounts_df = data_manager._load_csv('accounts.csv')
        if accounts_df.empty:
            return []
        
        customer_accounts = accounts_df[accounts_df['customer_id'] == customer_id]
        
        accounts = []
        for _, row in customer_accounts.iterrows():
            accounts.append({
                "account_id": row['account_id'],
                "account_type": row['account_type'],
                "account_number_masked": row['account_number_masked'],
                "balance": float(row['balance']),
                "available_balance": float(row['available_balance']),
                "status": row['status'],
                "opened_date": row['opened_date']
            })
        
        return accounts
    except Exception as e:
        print(f"Error getting customer accounts: {e}")
        return []


def get_transactions(customer_id: str, account_id: str = None, days: int = 30) -> List[Dict[str, Any]]:
    """Get transactions for a customer, optionally filtered by account and date range."""
    try:
        from datetime import timezone
        transactions_df = data_manager._load_csv('transactions.csv')
        if transactions_df.empty:
            return []
        
        # Filter by customer
        customer_transactions = transactions_df[transactions_df['customer_id'] == customer_id]
        
        # Filter by account if specified
        if account_id:
            customer_transactions = customer_transactions[customer_transactions['account_id'] == account_id]
        
        # Filter by date range if specified
        if days:
            cutoff_date = datetime.now() - timedelta(days=days)
            customer_transactions = customer_transactions.copy()
            customer_transactions['date_parsed'] = pd.to_datetime(customer_transactions['date'])
            customer_transactions = customer_transactions[customer_transactions['date_parsed'] >= cutoff_date]
        
        # Convert to list of dictionaries
        transactions = []
        for _, row in customer_transactions.iterrows():
            transaction = {
                "transaction_id": row['transaction_id'],
                "account_id": row['account_id'],
                "customer_id": row['customer_id'],
                "type": row['type'],
                "amount": float(row['amount']),
                "description": row['description'],
                "merchant": row['merchant'],
                "category": row['category'],
                "date": row['date'],
                "status": row['status'],
                "balance_after": float(row['balance_after'])
            }
            if pd.notna(row['failure_reason']):
                transaction['failure_reason'] = row['failure_reason']
            transactions.append(transaction)
        
        return sorted(transactions, key=lambda x: x["date"], reverse=True)
    except Exception as e:
        print(f"Error getting transactions: {e}")
        return []


def get_fraud_alerts(customer_id: str) -> List[Dict[str, Any]]:
    """Get fraud alerts for a customer from CSV."""
    try:
        fraud_df = data_manager._load_csv('fraud_alerts.csv')
        if fraud_df.empty:
            return []
        
        customer_alerts = fraud_df[fraud_df['customer_id'] == customer_id]
        
        alerts = []
        for _, row in customer_alerts.iterrows():
            alerts.append({
                "alert_id": row['alert_id'],
                "customer_id": row['customer_id'],
                "transaction_id": row['transaction_id'],
                "alert_type": row['alert_type'],
                "description": row['description'],
                "amount": float(row['amount']),
                "merchant": row['merchant'],
                "date": row['date'],
                "status": row['status'],
                "risk_score": int(row['risk_score'])
            })
        
        return alerts
    except Exception as e:
        print(f"Error getting fraud alerts: {e}")
        return []


def get_support_tickets(customer_id: str) -> List[Dict[str, Any]]:
    """Get support tickets for a customer from CSV."""
    try:
        tickets_df = data_manager._load_csv('support_tickets.csv')
        if tickets_df.empty:
            return []
        
        customer_tickets = tickets_df[tickets_df['customer_id'] == customer_id]
        
        tickets = []
        for _, row in customer_tickets.iterrows():
            ticket = {
                "ticket_id": row['ticket_id'],
                "customer_id": row['customer_id'],
                "type": row['type'],
                "status": row['status'],
                "priority": row['priority'],
                "description": row['description'],
                "created_date": row['created_date'],
                "last_updated": row['last_updated']
            }
            if pd.notna(row['amount_disputed']):
                ticket['amount_disputed'] = float(row['amount_disputed'])
            if pd.notna(row['transaction_id']):
                ticket['transaction_id'] = row['transaction_id']
            tickets.append(ticket)
        
        return tickets
    except Exception as e:
        print(f"Error getting support tickets: {e}")
        return []


# Authentication and session management functions
def is_authenticated(customer_id: str) -> bool:
    """Check if customer is authenticated in current session."""
    return customer_id in _authenticated_sessions


def set_authenticated(customer_id: str, method: str = "multi_factor"):
    """Mark customer as authenticated."""
    _authenticated_sessions[customer_id] = {
        "authenticated_at": datetime.now().isoformat(),
        "method": method
    }


def clear_authentication(customer_id: str):
    """Clear customer authentication."""
    if customer_id in _authenticated_sessions:
        del _authenticated_sessions[customer_id]


def log_auth_attempt(customer_id: str, success: bool, method: str, details: str = ""):
    """Log authentication attempt."""
    _auth_attempts.append({
        "customer_id": customer_id,
        "timestamp": datetime.now().isoformat(),
        "success": success,
        "method": method,
        "details": details
    })


def get_auth_attempts(customer_id: str = None) -> List[Dict[str, Any]]:
    """Get authentication attempts, optionally filtered by customer."""
    if customer_id:
        return [attempt for attempt in _auth_attempts 
                if attempt["customer_id"] == customer_id]
    return _auth_attempts


# Write operations for customer interactions
def add_transaction(customer_id: str, account_id: str, transaction_data: Dict[str, Any]) -> bool:
    """Add a new transaction to the CSV file."""
    try:
        transactions_df = data_manager._load_csv('transactions.csv')
        
        # Create new transaction row
        new_transaction = pd.DataFrame([transaction_data])
        
        # Append to existing data
        updated_df = pd.concat([transactions_df, new_transaction], ignore_index=True)
        
        # Save back to CSV
        return data_manager._save_csv(updated_df, 'transactions.csv')
    except Exception as e:
        print(f"Error adding transaction: {e}")
        return False


def add_support_ticket(customer_id: str, ticket_data: Dict[str, Any]) -> bool:
    """Add a new support ticket to the CSV file."""
    try:
        tickets_df = data_manager._load_csv('support_tickets.csv')
        
        # Create new ticket row
        new_ticket = pd.DataFrame([ticket_data])
        
        # Append to existing data
        updated_df = pd.concat([tickets_df, new_ticket], ignore_index=True)
        
        # Save back to CSV
        return data_manager._save_csv(updated_df, 'support_tickets.csv')
    except Exception as e:
        print(f"Error adding support ticket: {e}")
        return False


def update_account_balance(customer_id: str, account_id: str, new_balance: float, available_balance: float = None) -> bool:
    """Update account balance in the CSV file."""
    try:
        accounts_df = data_manager._load_csv('accounts.csv')
        
        # Find and update the account
        mask = (accounts_df['customer_id'] == customer_id) & (accounts_df['account_id'] == account_id)
        if mask.any():
            accounts_df.loc[mask, 'balance'] = new_balance
            if available_balance is not None:
                accounts_df.loc[mask, 'available_balance'] = available_balance
            
            return data_manager._save_csv(accounts_df, 'accounts.csv')
        return False
    except Exception as e:
        print(f"Error updating account balance: {e}")
        return False


def update_support_ticket(ticket_id: str, updates: Dict[str, Any]) -> bool:
    """Update an existing support ticket in the CSV file."""
    try:
        tickets_df = data_manager._load_csv('support_tickets.csv')
        
        # Find and update the ticket
        mask = tickets_df['ticket_id'] == ticket_id
        if mask.any():
            for field, value in updates.items():
                if field in tickets_df.columns:
                    tickets_df.loc[mask, field] = value
            
            return data_manager._save_csv(tickets_df, 'support_tickets.csv')
        return False
    except Exception as e:
        print(f"Error updating support ticket: {e}")
        return False


def get_authentication_data(customer_id: str) -> Dict[str, Any] | None:
    """Get authentication data for a customer from CSV."""
    try:
        auth_df = data_manager._load_csv('authentication.csv')
        if auth_df.empty:
            return None
        
        auth_row = auth_df[auth_df['customer_id'] == customer_id]
        if auth_row.empty:
            return None
        
        row = auth_row.iloc[0]
        return {
            "customer_id": row['customer_id'],
            "two_factor_enabled": bool(row['two_factor_enabled']),
            "last_login": row['last_login']
        }
    except Exception as e:
        print(f"Error getting authentication data: {e}")
        return None


def get_security_questions(customer_id: str) -> List[Dict[str, Any]]:
    """Get security questions for a customer from CSV."""
    try:
        sq_df = data_manager._load_csv('security_questions.csv')
        if sq_df.empty:
            return []
        
        customer_questions = sq_df[sq_df['customer_id'] == customer_id]
        
        questions = []
        for _, row in customer_questions.iterrows():
            questions.append({
                "question_id": row['question_id'],
                "customer_id": row['customer_id'],
                "question": row['question'],
                "answer_hash": row['answer_hash']
            })
        
        return questions
    except Exception as e:
        print(f"Error getting security questions: {e}")
        return []
