"""
Banking API Integration Module
"""

from agents.banking.accounts import account_tools
from agents.banking.authentication import auth_tools
from agents.banking.support import support_tools
from agents.banking.transactions import transaction_tools

# Consolidate all Banking tools for easy import
all_banking_tools = (
    auth_tools
    + account_tools
    + transaction_tools
    + support_tools
)
