"""
Banking Transaction API Functions

This module provides tools for transaction management and history.
"""

import json
from datetime import datetime

from langchain_core.tools import tool

from agents.banking.data import (
    get_transactions,
    get_account_data,
    is_authenticated,
)


@tool
def get_transaction_history(customer_id: str, account_id: str, days: int = 30) -> str:
    """
    Retrieves transaction history for a specific account.

    Args:
        customer_id (str): The customer ID
        account_id (str): The account ID
        days (int): Number of days of history to retrieve (default: 30)

    Returns:
        str: JSON string with transaction history
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps(
                {
                    "success": False,
                    "message": "Authentication required. Please authenticate before accessing transaction history.",
                    "authenticated": False,
                }
            )

        account = get_account_data(customer_id, account_id)
        if not account:
            return json.dumps(
                {
                    "success": False,
                    "message": "Account not found or not associated with this customer.",
                }
            )

        transactions = get_transactions(customer_id, account_id, days)

        return json.dumps(
            {
                "success": True,
                "account_id": account_id,
                "account_number": account["account_number_masked"],
                "period": f"Last {days} days",
                "transaction_count": len(transactions),
                "transactions": transactions,
                "message": f"Retrieved {len(transactions)} transactions for the last {days} days.",
            }
        )

    except Exception as e:
        return json.dumps(
            {
                "success": False,
                "message": f"Error retrieving transaction history: {str(e)}",
            }
        )


@tool
def search_transactions(customer_id: str, account_id: str, criteria: dict) -> str:
    """
    Searches transactions based on specific criteria.

    Args:
        customer_id (str): The customer ID
        account_id (str): The account ID
        criteria (dict): Search criteria (merchant, amount_min, amount_max, category, status)

    Returns:
        str: JSON string with matching transactions
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps(
                {
                    "success": False,
                    "message": "Authentication required. Please authenticate before searching transactions.",
                    "authenticated": False,
                }
            )

        account = get_account_data(customer_id, account_id)
        if not account:
            return json.dumps(
                {
                    "success": False,
                    "message": "Account not found or not associated with this customer.",
                }
            )

        # Get all transactions for the account
        all_transactions = get_transactions(
            customer_id, account_id, days=365
        )  # Search last year

        # Filter based on criteria
        filtered_transactions = []
        for transaction in all_transactions:
            match = True

            if "merchant" in criteria:
                if criteria["merchant"].lower() not in transaction["merchant"].lower():
                    match = False

            if "amount_min" in criteria:
                if abs(transaction["amount"]) < criteria["amount_min"]:
                    match = False

            if "amount_max" in criteria:
                if abs(transaction["amount"]) > criteria["amount_max"]:
                    match = False

            if "category" in criteria:
                if transaction["category"] != criteria["category"]:
                    match = False

            if "status" in criteria:
                if transaction["status"] != criteria["status"]:
                    match = False

            if match:
                filtered_transactions.append(transaction)

        return json.dumps(
            {
                "success": True,
                "account_id": account_id,
                "search_criteria": criteria,
                "matches_found": len(filtered_transactions),
                "transactions": filtered_transactions,
                "message": f"Found {len(filtered_transactions)} transactions matching your criteria.",
            }
        )

    except Exception as e:
        return json.dumps(
            {"success": False, "message": f"Error searching transactions: {str(e)}"}
        )


@tool
def initiate_transfer(
    customer_id: str, from_account: str, to_account: str, amount: float
) -> str:
    """
    Initiates a transfer between customer accounts.

    Args:
        customer_id (str): The customer ID
        from_account (str): Source account ID
        to_account (str): Destination account ID
        amount (float): Transfer amount

    Returns:
        str: JSON string with transfer result
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps(
                {
                    "success": False,
                    "message": "Authentication required. Please authenticate before initiating transfers.",
                    "authenticated": False,
                }
            )

        # Validate accounts
        from_acc = get_account_data(customer_id, from_account)
        to_acc = get_account_data(customer_id, to_account)

        if not from_acc:
            return json.dumps(
                {
                    "success": False,
                    "message": "Source account not found or not associated with this customer.",
                }
            )

        if not to_acc:
            return json.dumps(
                {
                    "success": False,
                    "message": "Destination account not found or not associated with this customer.",
                }
            )

        # Check available balance
        if from_acc["available_balance"] < amount:
            return json.dumps(
                {
                    "success": False,
                    "message": f"Insufficient funds. Available balance: ${from_acc['available_balance']:,.2f}, Transfer amount: ${amount:,.2f}",
                }
            )

        # In a real system, this would process the actual transfer
        # For demo purposes, we'll simulate the transfer
        transfer_id = f"TXF{datetime.now().strftime('%Y%m%d%H%M%S')}"

        return json.dumps(
            {
                "success": True,
                "transfer_id": transfer_id,
                "from_account": from_acc["account_number_masked"],
                "to_account": to_acc["account_number_masked"],
                "amount": amount,
                "status": "pending",
                "estimated_completion": "Within 1 business day",
                "message": f"Transfer of ${amount:,.2f} initiated successfully. Transfer ID: {transfer_id}",
            }
        )

    except Exception as e:
        return json.dumps(
            {"success": False, "message": f"Error initiating transfer: {str(e)}"}
        )


@tool
def get_pending_transactions(customer_id: str, account_id: str) -> str:
    """
    Retrieves pending or processing transactions for an account.

    Args:
        customer_id (str): The customer ID
        account_id (str): The account ID

    Returns:
        str: JSON string with pending transactions
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps(
                {
                    "success": False,
                    "message": "Authentication required. Please authenticate before accessing pending transactions.",
                    "authenticated": False,
                }
            )

        account = get_account_data(customer_id, account_id)
        if not account:
            return json.dumps(
                {
                    "success": False,
                    "message": "Account not found or not associated with this customer.",
                }
            )

        # Get all transactions and filter for pending/processing
        all_transactions = get_transactions(
            customer_id, account_id, days=365
        )  # Get all transactions
        pending_transactions = [
            t for t in all_transactions if t["status"] in ["pending", "processing"]
        ]

        return json.dumps(
            {
                "success": True,
                "account_id": account_id,
                "account_number": account["account_number_masked"],
                "pending_count": len(pending_transactions),
                "pending_transactions": pending_transactions,
                "message": f"Found {len(pending_transactions)} pending transactions.",
            }
        )

    except Exception as e:
        return json.dumps(
            {
                "success": False,
                "message": f"Error retrieving pending transactions: {str(e)}",
            }
        )


@tool
def dispute_transaction(customer_id: str, transaction_id: str, reason: str) -> str:
    """
    Files a dispute for a specific transaction.

    Args:
        customer_id (str): The customer ID
        transaction_id (str): The transaction ID to dispute
        reason (str): Reason for the dispute

    Returns:
        str: JSON string with dispute filing result
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps(
                {
                    "success": False,
                    "message": "Authentication required. Please authenticate before filing disputes.",
                    "authenticated": False,
                }
            )

        # Find the transaction
        all_transactions = get_transactions(
            customer_id, days=365
        )  # Get all customer transactions
        transaction = None
        for t in all_transactions:
            if t["transaction_id"] == transaction_id:
                transaction = t
                break

        if not transaction:
            return json.dumps(
                {
                    "success": False,
                    "message": "Transaction not found or not associated with this customer.",
                }
            )

        # Generate dispute case number
        dispute_id = f"DISP{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # In a real system, this would create a dispute record
        return json.dumps(
            {
                "success": True,
                "dispute_id": dispute_id,
                "transaction_id": transaction_id,
                "transaction_amount": transaction["amount"],
                "transaction_merchant": transaction["merchant"],
                "dispute_reason": reason,
                "status": "under_review",
                "estimated_resolution": "5-10 business days",
                "message": f"Dispute filed successfully. Case number: {dispute_id}. You will receive updates via email and mail.",
                "next_steps": [
                    "Review will begin within 2 business days",
                    "Temporary credit may be issued during investigation",
                    "Additional documentation may be requested",
                ],
            }
        )

    except Exception as e:
        return json.dumps(
            {"success": False, "message": f"Error filing dispute: {str(e)}"}
        )


@tool
def get_transaction_categories(customer_id: str) -> str:
    """
    Retrieves available transaction categories for filtering and analysis.

    Args:
        customer_id (str): The customer ID

    Returns:
        str: JSON string with available categories
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps(
                {
                    "success": False,
                    "message": "Authentication required.",
                    "authenticated": False,
                }
            )

        # Get unique categories from transactions
        all_transactions = get_transactions(
            customer_id, days=365
        )  # Get all customer transactions
        categories = set()
        for transaction in all_transactions:
            categories.add(transaction["category"])

        return json.dumps(
            {
                "success": True,
                "categories": sorted(list(categories)),
                "message": "Available transaction categories for filtering and search.",
            }
        )

    except Exception as e:
        return json.dumps(
            {"success": False, "message": f"Error retrieving categories: {str(e)}"}
        )


# Export tools for use in the main assistant
transaction_tools = [
    get_transaction_history,
    search_transactions,
    initiate_transfer,
    get_pending_transactions,
    dispute_transaction,
    get_transaction_categories,
]
