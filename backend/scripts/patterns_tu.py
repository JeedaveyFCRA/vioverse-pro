"""
TransUnion Violation Patterns
Data-driven pattern definitions for violation detection
"""

VIOLATION_PATTERNS = {
    "Pay_Status_Bankruptcy": {
        "label_patterns": ["Pay Status", "Payment Status"],
        "value_patterns": [">Account Included in Bankruptcy<"],
        "severity": "Extreme",
        "rule_id": "EXT-001"
    },
    "High_Balance": {
        "label_patterns": ["High Balance", "Highest Balance"],
        "value_patterns": [r"\$[\d,]+"],
        "severity": "Severe",
        "rule_id": "SEV-001"
    },
    "Remarks_Chapter13": {
        "label_patterns": ["Remarks", "Comments"],
        "value_patterns": ["CHAPTER 13 BANKRUPTCY", "INCLUDED IN CH 13"],
        "severity": "Extreme",
        "rule_id": "EXT-002"
    },
    "Account_Status": {
        "label_patterns": ["Account Status"],
        "value_patterns": ["Included in Bankruptcy", "Wage Earner Plan"],
        "severity": "Severe",
        "rule_id": "SEV-002"
    },
    "Date_Updated": {
        "label_patterns": ["Date Updated", "Last Updated"],
        "value_patterns": ["Oct 2018", "10/2018", "2018-10"],
        "severity": "Serious",
        "rule_id": "SER-001"
    }
}

# Combination patterns that require multiple fields
COMBINATION_PATTERNS = {
    "COMBO_Bankruptcy_Complete": {
        "required_fields": ["Pay_Status_Bankruptcy", "Remarks_Chapter13"],
        "severity": "Extreme",
        "rule_id": "COMBO-001"
    }
}