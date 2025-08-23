"""
Banking Account Management API Functions

This module provides tools for account management operations.
"""

import json
from typing import Any

from langchain_core.tools import tool

from agents.banking.data import (
    get_customer_data,
    get_account_data,
    get_customer_accounts,
    is_authenticated
)


@tool
def get_account_balance(customer_id: str, account_id: str) -> str:
    """
    Retrieves the current balance for a specific account.

    Requires customer authentication before providing balance information.

    Args:
        customer_id (str): The customer ID
        account_id (str): The account ID (e.g., "ACC789012")

    Returns:
        str: JSON string with account balance information
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required. Please authenticate before accessing account information.",
                "authenticated": False
            })

        account = get_account_data(customer_id, account_id)
        if not account:
            return json.dumps({
                "success": False,
                "message": "Account not found or not associated with this customer."
            })

        return json.dumps({
            "success": True,
            "account_id": account["account_id"],
            "account_type": account["account_type"],
            "account_number": account["account_number_masked"],
            "current_balance": account["balance"],
            "available_balance": account["available_balance"],
            "status": account["status"],
            "message": f"Current balance for {account['account_type']} account {account['account_number_masked']}: ${account['balance']:,.2f}"
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error retrieving account balance: {str(e)}"
        })


@tool
def get_account_summary(customer_id: str) -> str:
    """
    Retrieves a summary of all accounts for a customer.

    Requires customer authentication before providing account information.

    Args:
        customer_id (str): The customer ID

    Returns:
        str: JSON string with summary of all customer accounts
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required. Please authenticate before accessing account information.",
                "authenticated": False
            })

        customer = get_customer_data(customer_id)
        if not customer:
            return json.dumps({
                "success": False,
                "message": "Customer not found."
            })

        accounts = get_customer_accounts(customer_id)
        total_balance = sum(account["balance"] for account in accounts)
        
        account_summary = []
        for account in accounts:
            account_summary.append({
                "account_id": account["account_id"],
                "account_type": account["account_type"],
                "account_number": account["account_number_masked"],
                "balance": account["balance"],
                "available_balance": account["available_balance"],
                "status": account["status"]
            })

        return json.dumps({
            "success": True,
            "customer_name": f"{customer['personal_info']['first_name']} {customer['personal_info']['last_name']}",
            "total_accounts": len(accounts),
            "total_balance": total_balance,
            "accounts": account_summary,
            "message": f"Account summary for {len(accounts)} accounts with total balance of ${total_balance:,.2f}"
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error retrieving account summary: {str(e)}"
        })


@tool
def get_account_statements(customer_id: str, account_id: str, months: int = 3) -> str:
    """
    Retrieves account statements for a specified period.

    Args:
        customer_id (str): The customer ID
        account_id (str): The account ID
        months (int): Number of months of statements to retrieve (default: 3)

    Returns:
        str: JSON string with account statement information
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required. Please authenticate before accessing account statements.",
                "authenticated": False
            })

        account = get_account_data(customer_id, account_id)
        if not account:
            return json.dumps({
                "success": False,
                "message": "Account not found or not associated with this customer."
            })

        # In a real system, this would generate actual statements
        # For demo purposes, we'll return statement availability info
        return json.dumps({
            "success": True,
            "account_id": account["account_id"],
            "account_type": account["account_type"],
            "account_number": account["account_number_masked"],
            "statement_period": f"Last {months} months",
            "statements_available": True,
            "message": f"Statements for the last {months} months are available. They can be downloaded from online banking or mailed to your address on file.",
            "online_banking_url": "https://bank.example.com/statements",
            "mailing_address": "123 Main St, Springfield, IL 62701"
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error retrieving account statements: {str(e)}"
        })


@tool
def update_account_preferences(customer_id: str, preferences: dict) -> str:
    """
    Updates account notification and communication preferences.

    Args:
        customer_id (str): The customer ID
        preferences (dict): Dictionary of preference updates

    Returns:
        str: JSON string with update result
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required. Please authenticate before updating preferences.",
                "authenticated": False
            })

        customer = get_customer_data(customer_id)
        if not customer:
            return json.dumps({
                "success": False,
                "message": "Customer not found."
            })

        # In a real system, this would update the database
        # For demo purposes, we'll simulate the update
        updated_preferences = {}
        
        if "email_alerts" in preferences:
            updated_preferences["email_alerts"] = preferences["email_alerts"]
        if "sms_alerts" in preferences:
            updated_preferences["sms_alerts"] = preferences["sms_alerts"]
        if "large_transaction_threshold" in preferences:
            updated_preferences["large_transaction_threshold"] = preferences["large_transaction_threshold"]
        if "low_balance_threshold" in preferences:
            updated_preferences["low_balance_threshold"] = preferences["low_balance_threshold"]

        return json.dumps({
            "success": True,
            "updated_preferences": updated_preferences,
            "message": "Account preferences updated successfully.",
            "effective_date": "Immediately"
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error updating account preferences: {str(e)}"
        })


@tool
def check_account_status(customer_id: str, account_id: str) -> str:
    """
    Checks the status and any restrictions on an account.

    Args:
        customer_id (str): The customer ID
        account_id (str): The account ID

    Returns:
        str: JSON string with account status information
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required. Please authenticate before checking account status.",
                "authenticated": False
            })

        account = get_account_data(customer_id, account_id)
        if not account:
            return json.dumps({
                "success": False,
                "message": "Account not found or not associated with this customer."
            })

        # Check for any restrictions or holds
        restrictions = []
        if account["balance"] < 0:
            restrictions.append("Overdraft")
        if account["available_balance"] < account["balance"]:
            restrictions.append("Pending transactions")

        return json.dumps({
            "success": True,
            "account_id": account["account_id"],
            "account_type": account["account_type"],
            "account_number": account["account_number_masked"],
            "status": account["status"],
            "opened_date": account["opened_date"],
            "restrictions": restrictions if restrictions else None,
            "message": f"Account {account['account_number_masked']} is {account['status']}" + 
                      (f" with restrictions: {', '.join(restrictions)}" if restrictions else " with no restrictions")
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error checking account status: {str(e)}"
        })


@tool
def get_account_products(customer_id: str) -> str:
    """
    Retrieves information about available banking products.

    Args:
        customer_id (str): The customer ID

    Returns:
        str: JSON string with available banking products
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required. Please authenticate before viewing product information.",
                "authenticated": False
            })

        # Sample products data - in a real system this would come from a products CSV
        products = [
            {
                "product_id": "PROD001",
                "name": "Premium Checking Account",
                "type": "checking",
                "features": ["No monthly fee", "ATM fee reimbursement", "Mobile check deposit"],
                "minimum_balance": 0,
                "interest_rate": 0.01
            },
            {
                "product_id": "PROD002",
                "name": "High Yield Savings",
                "type": "savings",
                "features": ["High interest rate", "No minimum balance", "Online banking"],
                "minimum_balance": 0,
                "interest_rate": 4.5
            }
        ]
        
        return json.dumps({
            "success": True,
            "available_products": products,
            "message": f"Found {len(products)} available banking products.",
            "contact_info": "Call 1-800-BANK-123 or visit a branch to open new accounts"
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error retrieving product information: {str(e)}"
        })


# Export tools for use in the main assistant
account_tools = [
    get_account_balance,
    get_account_summary,
    get_account_statements,
    update_account_preferences,
    check_account_status,
    get_account_products
]
