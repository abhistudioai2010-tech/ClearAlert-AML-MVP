"""
ClearAlert — Dynamic Justification Generator
Generates statistical, human-readable justifications for auto-archived alerts
based on the dynamically identified schema.
"""
import pandas as pd
import numpy as np

def generate_dynamic_justifications(archived_df, full_df, cmap):
    """
    Generate dynamic rationale based on dataset cluster statistics and properties.
    """
    if archived_df.empty:
        return []

    id_col = cmap['id_col']
    customer_col = cmap['customer_col']
    amount_col = cmap['amount_col']
    type_col = cmap['type_col']
    country_col = cmap['country_col']
    
    justifications = []

    # Calculate some dataset globals
    med_amt = full_df[amount_col].median() if amount_col and pd.api.types.is_numeric_dtype(full_df[amount_col]) else 0
    cust_freq = full_df[customer_col].value_counts().to_dict() if customer_col else {}
    
    for _, row in archived_df.iterrows():
        reasons = []
        alert_id = str(row.get(id_col, 'UNKNOWN_ID')) if id_col else 'UNKNOWN_ID'
        customer = str(row.get(customer_col, 'UNKNOWN_CUSTOMER')) if customer_col else 'UNKNOWN_CUSTOMER'
        risk = float(row.get('risk_score', 0))

        # Logic-based justifications (Priority)
        logic_score = float(row.get('logic_score', 0))
        if logic_score > 0:
            if amount_col and 9000 <= float(row.get(amount_col, 0)) < 10000:
                reasons.append("Flagged for potential 'Structuring' behavior (transaction near $10k reporting limit).")
            
            if country_col:
                cntry = str(row.get(country_col, '')).lower()
                high_risk = ['panama', 'cayman', 'bahamas', 'belize', 'seychelles', 'bermuda']
                if any(hr in cntry for hr in high_risk):
                    reasons.append(f"Entity is operating in a high-risk jurisdiction ({cntry.title()}).")
            
            # Count for velocity
            if customer_col:
                count = cust_freq.get(row.get(customer_col), 0)
                if count > 3:
                     reasons.append(f"Account Velocity Alert: {count} transactions detected in this batch.")

        # Statistical justifications
        ml_score = float(row.get('ml_score', 0))
        if ml_score < 0.3:
            reasons.append(f"Statistical profile is highly consistent with established local benchmarks ({ (1-ml_score)*100:.0f}% confidence).")
        
        # Amount justification fallback
        if amount_col and pd.api.types.is_numeric_dtype(full_df[amount_col]):
            amt = float(row.get(amount_col, 0))
            if med_amt > 0 and amt <= med_amt * 1.5:
                reasons.append(f"Transaction value is within the standard range for this dataset.")

        # Frequency justification
        if customer_col:
            count = cust_freq.get(row.get(customer_col), 0)
            if count > 2:
                reasons.append(f"Entity exhibits a recurring, consistent pattern ({count} transactions logged).")

        # Type/Country
        if type_col and country_col:
            typ = str(row.get(type_col, 'Data'))
            cntry = str(row.get(country_col, 'Origin'))
            reasons.append(f"Standard {typ} routing configuration involving {cntry}.")

        # Trim to top 3 reasons for readability
        justification_text = " ".join(reasons[:3])

        justifications.append({
            'alert_id': alert_id,
            'customer_name': customer,
            'justification': justification_text,
            'confidence': round(1.0 - risk, 2),
        })

    return justifications
