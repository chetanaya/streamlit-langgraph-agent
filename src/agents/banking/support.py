"""
Banking Support Services API Functions

This module provides tools for customer support and service requests.
"""

import json
from datetime import datetime
from typing import Any

from langchain_core.tools import tool

from agents.banking.data import (
    get_customer_data,
    get_fraud_alerts,
    get_support_tickets as get_customer_support_tickets,
    is_authenticated,
    add_support_ticket,
    update_support_ticket as update_customer_support_ticket
)


@tool
def create_support_ticket(customer_id: str, issue_type: str, description: str) -> str:
    """
    Creates a new customer support ticket.

    Args:
        customer_id (str): The customer ID
        issue_type (str): Type of issue (transaction_dispute, account_access, card_issue, etc.)
        description (str): Detailed description of the issue

    Returns:
        str: JSON string with ticket creation result
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required. Please authenticate before creating support tickets.",
                "authenticated": False
            })

        customer = get_customer_data(customer_id)
        if not customer:
            return json.dumps({
                "success": False,
                "message": "Customer not found."
            })

        # Generate ticket ID
        ticket_id = f"TICK{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Determine priority based on issue type
        priority_map = {
            "fraud_alert": "high",
            "account_locked": "high",
            "card_lost_stolen": "high",
            "transaction_dispute": "medium",
            "account_access": "medium",
            "general_inquiry": "low"
        }
        priority = priority_map.get(issue_type, "medium")

        # In a real system, this would create a ticket in the support system
        ticket_data = {
            "ticket_id": ticket_id,
            "customer_id": customer_id,
            "issue_type": issue_type,
            "description": description,
            "priority": priority,
            "status": "open",
            "created_date": datetime.now().isoformat(),
            "estimated_resolution": "2-3 business days" if priority == "low" else "1-2 business days"
        }

        return json.dumps({
            "success": True,
            "ticket": ticket_data,
            "message": f"Support ticket {ticket_id} created successfully. Priority: {priority}",
            "next_steps": [
                "You will receive email confirmation within 15 minutes",
                "A support representative will contact you within 24 hours",
                "Track your ticket status online or by calling customer service"
            ]
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error creating support ticket: {str(e)}"
        })


@tool
def get_support_tickets(customer_id: str) -> str:
    """
    Retrieves all support tickets for a customer.

    Args:
        customer_id (str): The customer ID

    Returns:
        str: JSON string with customer's support tickets
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required. Please authenticate before accessing support tickets.",
                "authenticated": False
            })

        tickets = get_customer_support_tickets(customer_id)
        
        return json.dumps({
            "success": True,
            "ticket_count": len(tickets),
            "tickets": tickets,
            "message": f"Retrieved {len(tickets)} support tickets.",
            "support_phone": "1-800-BANK-123",
            "support_hours": "24/7 for urgent issues, 8 AM - 8 PM for general inquiries"
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error retrieving support tickets: {str(e)}"
        })


@tool
def update_support_ticket(ticket_id: str, status: str = None, notes: str = None) -> str:
    """
    Updates an existing support ticket.

    Args:
        ticket_id (str): The ticket ID
        status (str): New status (open, in_progress, resolved, closed)
        notes (str): Additional notes or updates

    Returns:
        str: JSON string with update result
    """
    try:
        # In a real system, this would update the ticket in the database
        # For demo purposes, we'll simulate the update
        
        valid_statuses = ["open", "in_progress", "resolved", "closed"]
        if status and status not in valid_statuses:
            return json.dumps({
                "success": False,
                "message": f"Invalid status. Valid statuses: {', '.join(valid_statuses)}"
            })

        update_data = {
            "ticket_id": ticket_id,
            "updated_at": datetime.now().isoformat(),
            "updates": {}
        }

        if status:
            update_data["updates"]["status"] = status
        if notes:
            update_data["updates"]["notes"] = notes

        return json.dumps({
            "success": True,
            "ticket_id": ticket_id,
            "updates": update_data["updates"],
            "message": f"Ticket {ticket_id} updated successfully.",
            "updated_at": update_data["updated_at"]
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error updating support ticket: {str(e)}"
        })


@tool
def check_fraud_alerts(customer_id: str) -> str:
    """
    Retrieves fraud alerts and suspicious activity for a customer.

    Args:
        customer_id (str): The customer ID

    Returns:
        str: JSON string with fraud alerts
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required. Please authenticate before accessing fraud alerts.",
                "authenticated": False
            })

        fraud_alerts = get_fraud_alerts(customer_id)
        
        # Categorize alerts by risk level
        high_risk = [alert for alert in fraud_alerts if alert.get("risk_score", 0) >= 80]
        medium_risk = [alert for alert in fraud_alerts if 50 <= alert.get("risk_score", 0) < 80]
        low_risk = [alert for alert in fraud_alerts if alert.get("risk_score", 0) < 50]

        return json.dumps({
            "success": True,
            "total_alerts": len(fraud_alerts),
            "high_risk_alerts": len(high_risk),
            "medium_risk_alerts": len(medium_risk),
            "low_risk_alerts": len(low_risk),
            "alerts": fraud_alerts,
            "message": f"Found {len(fraud_alerts)} fraud alerts. {len(high_risk)} require immediate attention.",
            "fraud_hotline": "1-800-FRAUD-123",
            "immediate_actions": [
                "Review all alerts carefully",
                "Report any unauthorized transactions immediately",
                "Consider temporary card blocks for high-risk alerts"
            ]
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error retrieving fraud alerts: {str(e)}"
        })


@tool
def request_pin_change(customer_id: str, card_id: str) -> str:
    """
    Initiates a PIN change request for a debit/credit card.

    Args:
        customer_id (str): The customer ID
        card_id (str): The card ID

    Returns:
        str: JSON string with PIN change request result
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required. Please authenticate before requesting PIN changes.",
                "authenticated": False
            })

        customer = get_customer_data(customer_id)
        if not customer:
            return json.dumps({
                "success": False,
                "message": "Customer not found."
            })

        # Find the card
        card = None
        for c in customer["cards"]:
            if c["card_id"] == card_id:
                card = c
                break

        if not card:
            return json.dumps({
                "success": False,
                "message": "Card not found or not associated with this customer."
            })

        # Generate request ID
        request_id = f"PIN{datetime.now().strftime('%Y%m%d%H%M%S')}"

        return json.dumps({
            "success": True,
            "request_id": request_id,
            "card_number": card["card_number_masked"],
            "card_type": card["card_type"],
            "status": "initiated",
            "message": f"PIN change request {request_id} initiated for card {card['card_number_masked']}",
            "options": [
                "Visit any branch with valid ID to set new PIN",
                "Call customer service at 1-800-BANK-123 for phone PIN change",
                "Use online banking secure PIN change feature"
            ],
            "security_note": "For your security, you will need to verify your identity before the PIN change is completed."
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error requesting PIN change: {str(e)}"
        })


@tool
def get_branch_locations(customer_id: str, zip_code: str = None) -> str:
    """
    Retrieves nearby branch locations and ATM information.

    Args:
        customer_id (str): The customer ID
        zip_code (str): ZIP code to search near (optional)

    Returns:
        str: JSON string with branch locations
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required.",
                "authenticated": False
            })

        # For demo purposes, return sample branch data
        branches = [
            {
                "branch_id": "BR001",
                "name": "Main Street Branch",
                "address": "456 Main Street, Springfield, IL 62701",
                "phone": "(217) 555-0100",
                "hours": "Mon-Fri: 9 AM - 5 PM, Sat: 9 AM - 1 PM",
                "services": ["Full Service", "Notary", "Safe Deposit Boxes"],
                "atm_available": True,
                "drive_thru": True
            },
            {
                "branch_id": "BR002", 
                "name": "Downtown Branch",
                "address": "789 Commerce Ave, Springfield, IL 62702",
                "phone": "(217) 555-0200",
                "hours": "Mon-Fri: 8:30 AM - 6 PM, Sat: 9 AM - 2 PM",
                "services": ["Full Service", "Business Banking", "Loans"],
                "atm_available": True,
                "drive_thru": False
            }
        ]

        return json.dumps({
            "success": True,
            "search_area": zip_code or "Customer's area",
            "branches_found": len(branches),
            "branches": branches,
            "message": f"Found {len(branches)} branches in your area.",
            "atm_network": "Surcharge-free ATMs available nationwide"
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error retrieving branch locations: {str(e)}"
        })


@tool
def escalate_to_human_agent(customer_id: str, reason: str) -> str:
    """
    Escalates the customer to a human agent for complex issues.

    Args:
        customer_id (str): The customer ID
        reason (str): Reason for escalation

    Returns:
        str: JSON string with escalation result
    """
    try:
        # Check authentication
        if not is_authenticated(customer_id):
            return json.dumps({
                "success": False,
                "message": "Authentication required before escalation.",
                "authenticated": False
            })

        escalation_id = f"ESC{datetime.now().strftime('%Y%m%d%H%M%S')}"

        return json.dumps({
            "success": True,
            "escalation_id": escalation_id,
            "reason": reason,
            "status": "queued",
            "estimated_wait_time": "3-5 minutes",
            "message": "Your request has been escalated to a human agent.",
            "callback_option": "You can request a callback instead of waiting on hold",
            "priority_line": "1-800-PRIORITY for premium customers",
            "chat_option": "Live chat available on our website"
        })

    except Exception as e:
        return json.dumps({
            "success": False,
            "message": f"Error escalating to human agent: {str(e)}"
        })


# Export tools for use in the main assistant
support_tools = [
    create_support_ticket,
    get_support_tickets,
    update_support_ticket,
    check_fraud_alerts,
    request_pin_change,
    get_branch_locations,
    escalate_to_human_agent
]
