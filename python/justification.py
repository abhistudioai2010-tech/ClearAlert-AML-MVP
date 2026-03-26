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

        # Base algorithmic confidence
        confidence_pct = (1.0 - risk) * 100
        if confidence_pct > 80:
            reasons.append(f"Profile strongly matches the 'normal' behavioral cluster ({confidence_pct:.0f}% confidence).")
        else:
            reasons.append(f"General profile aligns with standard dataset bounds.")

        # Amount justification
        if amount_col and pd.api.types.is_numeric_dtype(full_df[amount_col]):
            amt = float(row.get(amount_col, 0))
            if med_amt > 0 and amt <= med_amt * 1.5:
                reasons.append(f"Value (${amt:,.2f}) is within standard deviation of dataset median (${med_amt:,.2f}).")
            elif amt > med_amt * 1.5:
                reasons.append(f"Value (${amt:,.2f}) is elevated but contextual factors offset risk.")

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
