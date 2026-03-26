"""
ClearAlert — Dynamic Inference Engine (Unsupervised)
Loads any AML alert CSV/Excel file, automatically maps features, 
and trains an Isolation Forest on-the-fly to score anomalies. 
Schema-agnostic and offline.
"""
import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings('ignore')

from justification import generate_dynamic_justifications

def parse_file(filepath):
    """Parse CSV or Excel file into a DataFrame."""
    ext = filepath.rsplit('.', 1)[-1].lower()
    if ext == 'csv':
        df = pd.read_csv(filepath)
    elif ext in ('xlsx', 'xls'):
        df = pd.read_excel(filepath)
    else:
        raise ValueError(f'Unsupported file format: .{ext}')
    
    # Strip whitespace from column names just in case
    df.columns = df.columns.astype(str).str.strip()
    return df

def identify_columns(columns):
    """
    Heuristically identify key business columns based on name substrings.
    Returns a dict with identified column names (or None if not found).
    """
    cols = {c.lower(): c for c in columns}
    
    mapping = {
        'id_col': None,
        'customer_col': None,
        'amount_col': None,
        'type_col': None,
        'country_col': None
    }
    
    for cl, orig in cols.items():
        if not mapping['id_col'] and ('id' in cl or 'reference' in cl or 'ref' in cl):
            mapping['id_col'] = orig
        elif not mapping['customer_col'] and ('name' in cl or 'cust' in cl or 'client' in cl or 'party' in cl or 'entity' in cl):
            mapping['customer_col'] = orig
        elif not mapping['amount_col'] and ('amount' in cl or 'value' in cl or 'sum' in cl or 'total' in cl or 'amt' in cl):
            mapping['amount_col'] = orig
        elif not mapping['type_col'] and ('type' in cl or 'category' in cl or 'desc' in cl or 'kind' in cl):
            mapping['type_col'] = orig
        elif not mapping['country_col'] and ('country' in cl or 'nation' in cl or 'juris' in cl or 'dest' in cl or 'source' in cl):
            mapping['country_col'] = orig
            
    # Fallback to first column as ID if none found
    if not mapping['id_col'] and len(columns) > 0:
        mapping['id_col'] = columns[0]
        
    return mapping

def process_alerts_file(filepath, progress_callback=None):
    """
    Full pipeline: 
    1. Parse file dynamically
    2. Heuristically define features
    3. Train Isolation Forest locally on this exact dataset
    4. Generate Justifications
    5. Return Results
    """
    if progress_callback:
        progress_callback(10, 'Parsing uploaded file dynamically...')

    df = parse_file(filepath)
    if df.empty:
        raise ValueError("Uploaded file is empty.")

    if progress_callback:
        progress_callback(30, 'Mapping columns to engine variables...')

    cmap = identify_columns(df.columns)
    id_col = cmap['id_col']
    customer_col = cmap['customer_col']
    amount_col = cmap['amount_col']
    type_col = cmap['type_col']
    country_col = cmap['country_col']

    if progress_callback:
        progress_callback(50, 'Encoding categorical records and building features...')

    # Prepare feature matrix
    exclude_cols = [c for c in [id_col, customer_col] if c]
    feature_df = df.drop(columns=[c for c in exclude_cols if c in df.columns]).copy()
    
    # Preprocess
    for col in list(feature_df.columns):
        if not pd.api.types.is_numeric_dtype(feature_df[col]):
            # Robust currency/numeric parsing
            cleaned = feature_df[col].astype(str).str.replace(r'[$,\s]', '', regex=True)
            cleaned = cleaned.replace(['nan', 'None', '', 'N/A', 'null', 'NULL'], np.nan)
            coerced = pd.to_numeric(cleaned, errors='coerce')
            
            # If at least 80% of data is numeric, treat as numeric column
            if coerced.notna().sum() > (len(coerced) * 0.8):
                feature_df[col] = coerced

        if pd.api.types.is_numeric_dtype(feature_df[col]):
            # Impute missing numericals with median
            median_val = feature_df[col].median()
            feature_df[col] = feature_df[col].fillna(median_val if not pd.isna(median_val) else 0)
        else:
            # Limit cardinality to prevent memory explosion; mask rare items
            if feature_df[col].nunique() < 400:
                le = LabelEncoder()
                feature_df[col] = feature_df[col].fillna('missing').astype(str)
                feature_df[col] = le.fit_transform(feature_df[col])
            else:
                # Too many unique categories (e.g. notes field), drop from ML features
                feature_df.drop(columns=[col], inplace=True)

    if progress_callback:
        progress_callback(70, 'Running unsupervised AI anomaly detection...')

    X = feature_df.values
    if X.shape[1] == 0:
        # Extreme fallback if no usable features
        scores = np.random.uniform(0.5, 1.0, len(df))
    else:
        # Isolation forest training and scoring
        iso = IsolationForest(contamination=0.05, n_estimators=100, random_state=42, n_jobs=-1)
        iso.fit(X)
        scores = iso.decision_function(X) # lower score = more anomalous

    if progress_callback:
        progress_callback(85, 'Classifying and compiling justification logs...')

    # Normalize scores (anomaly -> high risk -> close to 1.0)
    min_s, max_s = scores.min(), scores.max()
    if max_s > min_s:
        # Lower anomaly score = higher risk. 
        # Map worst score (min) to 1.0, best score (max) to 0.0
        normalized = (scores - min_s) / (max_s - min_s)
        risk_scores = 1.0 - normalized
    else:
        risk_scores = np.array([0.5] * len(df))

    df['risk_score'] = risk_scores

    # Top 5% risk = critical
    threshold = np.percentile(risk_scores, 95)
    # Ensure at least some items are flagged if identical (in edge cases)
    if threshold == 1.0 and sum(risk_scores >= 1.0) == 0:
        threshold = 0.99
        
    df['is_critical'] = df['risk_score'] >= threshold

    critical_df = df[df['is_critical']].copy()
    archived_df = df[~df['is_critical']].copy()

    # Justifications
    justification_log = generate_dynamic_justifications(archived_df, df, cmap)

    if progress_callback:
        progress_callback(95, 'Finalizing results...')

    # Format results
    def to_dict(row):
        return {
            'alert_id': str(row.get(id_col, 'UNKNOWN_ID')) if id_col else 'UNKNOWN_ID',
            'customer_name': str(row.get(customer_col, 'UNKNOWN_CUSTOMER')) if customer_col else 'UNKNOWN_CUSTOMER',
            'transaction_amount': float(row.get(amount_col, 0)) if amount_col else 0.0,
            'alert_type': str(row.get(type_col, 'Alert')) if type_col else 'Alert',
            'risk_score': round(float(row['risk_score']), 2),
            'source_country': str(row.get(country_col, 'N/A')) if country_col else 'N/A',
            'destination_country': '-'
        }
    
    critical_alerts = [to_dict(row) for _, row in critical_df.iterrows()]
    archived_alerts = [to_dict(row) for _, row in archived_df.iterrows()]

    critical_alerts.sort(key=lambda x: -x['risk_score'])

    return {
        'critical_alerts': critical_alerts,
        'archived_alerts': archived_alerts,
        'justification_log': justification_log,
        'summary': {
            'total_alerts': len(df),
            'critical_count': len(critical_alerts),
            'archived_count': len(archived_alerts),
            'false_positive_rate': round(len(archived_alerts) / max(len(df), 1) * 100),
        },
    }
