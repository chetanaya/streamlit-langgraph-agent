"""
Banking Authentication API Functions

This module provides tools for customer authentication and security verification.
"""

import json
from typing import Any

from langchain_core.tools import tool

from agents.banking.data import (
    get_customer_data,
    is_authenticated,
    set_authenticated,
    log_auth_attempt,
)


@tool
def authenticate_customer(
    customer_id: str, ssn_last_four: str, date_of_birth: str
) -> str:
    """
    Performs complete customer authentication using identity verification.

    Verifies customer ID, last 4 digits of SSN, and date of birth.
    Upon successful verification, the customer is fully authenticated.

    Args:
        customer_id (str): The customer ID (e.g., "CUST001234")
        ssn_last_four (str): Last 4 digits of SSN
        date_of_birth (str): Date of birth in YYYY-MM-DD format

    Returns:
        str: JSON string with authentication result
    """
    try:
        customer = get_customer_data(customer_id)
        if not customer:
            log_auth_attempt(customer_id, False, "initial_auth", "Customer not found")
            return json.dumps(
                {
                    "success": False,
                    "message": "Customer not found. Please verify your customer ID.",
                    "authenticated": False,
                }
            )

        personal_info = customer["personal_info"]

        # Verify SSN last 4 and date of birth
        if (
            personal_info["ssn_last_four"] == ssn_last_four
            and personal_info["date_of_birth"] == date_of_birth
        ):
            # Set customer as fully authenticated
            set_authenticated(customer_id, "full_auth")
            log_auth_attempt(
                customer_id, True, "full_auth", "Customer authentication successful"
            )
            return json.dumps(
                {
                    "success": True,
                    "message": "Authentication successful. You are now fully authenticated.",
                    "authenticated": True,
                    "authentication_level": "full",
                    "customer_name": f"{personal_info['first_name']} {personal_info['last_name']}",
                }
            )
        else:
            log_auth_attempt(customer_id, False, "full_auth", "Invalid credentials")
            return json.dumps(
                {
                    "success": False,
                    "message": "Authentication failed. Please verify your information.",
                    "authenticated": False,
                }
            )

    except Exception as e:
        log_auth_attempt(customer_id, False, "full_auth", f"Error: {str(e)}")
        return json.dumps(
            {
                "success": False,
                "message": f"Authentication error: {str(e)}",
                "authenticated": False,
            }
        )


@tool
def check_two_factor_auth(customer_id: str) -> str:
    """
    Checks the two-factor authentication status for a customer.

    Args:
        customer_id (str): The customer ID

    Returns:
        str: JSON string with 2FA status
    """
    try:
        customer = get_customer_data(customer_id)
        if not customer:
            return json.dumps({"success": False, "message": "Customer not found."})

        two_factor_enabled = customer["authentication"]["two_factor_enabled"]
        last_login = customer["authentication"]["last_login"]

        return json.dumps(
            {
                "success": True,
                "two_factor_enabled": two_factor_enabled,
                "last_login": last_login,
                "message": f"2FA is {'enabled' if two_factor_enabled else 'disabled'} for this account.",
            }
        )

    except Exception as e:
        return json.dumps(
            {"success": False, "message": f"Error checking 2FA status: {str(e)}"}
        )


@tool
def log_authentication_attempt(
    customer_id: str, success: bool, method: str, details: str = ""
) -> str:
    """
    Logs an authentication attempt for security auditing.

    Args:
        customer_id (str): The customer ID
        success (bool): Whether the authentication was successful
        method (str): The authentication method used
        details (str): Additional details about the attempt

    Returns:
        str: JSON string confirming the log entry
    """
    try:
        log_auth_attempt(customer_id, success, method, details)

        return json.dumps(
            {
                "success": True,
                "message": "Authentication attempt logged successfully.",
                "logged_at": "current_timestamp",
            }
        )

    except Exception as e:
        return json.dumps(
            {
                "success": False,
                "message": f"Error logging authentication attempt: {str(e)}",
            }
        )


@tool
def check_authentication_status(customer_id: str) -> str:
    """
    Checks if a customer is currently authenticated in the session.

    Args:
        customer_id (str): The customer ID

    Returns:
        str: JSON string with authentication status
    """
    try:
        authenticated = is_authenticated(customer_id)

        return json.dumps(
            {
                "success": True,
                "authenticated": authenticated,
                "message": f"Customer is {'authenticated' if authenticated else 'not authenticated'}.",
            }
        )

    except Exception as e:
        return json.dumps(
            {
                "success": False,
                "message": f"Error checking authentication status: {str(e)}",
            }
        )


# Export tools for use in the main assistant
auth_tools = [
    authenticate_customer,
    check_two_factor_auth,
    log_authentication_attempt,
    check_authentication_status,
]
