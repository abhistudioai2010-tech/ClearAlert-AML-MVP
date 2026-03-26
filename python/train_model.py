"""
ClearAlert — ML Model Training Pipeline
Trains a Random Forest classifier on synthetic AML alert data and exports to ONNX format.
"""
import os
import sys
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder

try:
    import onnxruntime
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False
    print('[WARN] ONNX libs not found. Model will be saved as pickle only.', file=sys.stderr)


# Feature columns used for training and inference
FEATURE_COLUMNS = [
    'transaction_amount', 'risk_score', 'previous_alerts_count',
    'account_age_months', 'is_pep', 'transaction_frequency',
    'avg_transaction_amount', 'source_country_encoded',
    'destination_country_encoded', 'alert_type_encoded',
]

LABEL_COLUMN = 'is_false_positive'


def prepare_features(df):
    """Encode categorical features and return feature matrix + encoders."""
    encoders = {}

    for col in ['source_country', 'destination_country', 'alert_type']:
        le = LabelEncoder()
        df[f'{col}_encoded'] = le.fit_transform(df[col].astype(str))
        encoders[col] = le

    X = df[FEATURE_COLUMNS].values.astype(np.float32)
    return X, encoders


def train_model(data_path=None, model_dir=None):
    """Train and export the ML model."""
    if data_path is None:
        data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'synthetic_aml_alerts.csv')
    if model_dir is None:
        model_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'model')

    os.makedirs(model_dir, exist_ok=True)

    # Load data
    print(f'Loading data from {data_path}...')
    df = pd.read_csv(data_path)
    print(f'  {len(df)} records loaded')

    # Prepare features
    X, encoders = prepare_features(df)
    y = df[LABEL_COLUMN].values

    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Train Random Forest
    print('Training Random Forest...')
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    # Evaluate
    y_pred = rf.predict(X_test)
    print('\n── Classification Report ──')
    print(classification_report(y_test, y_pred, target_names=['True Positive', 'False Positive']))

    # Feature importance
    importances = sorted(zip(FEATURE_COLUMNS, rf.feature_importances_), key=lambda x: -x[1])
    print('── Feature Importance ──')
    for name, imp in importances:
        print(f'  {name:35s} {imp:.4f}')

    # Save pickle model
    pickle_path = os.path.join(model_dir, 'rf_model.pkl')
    with open(pickle_path, 'wb') as f:
        pickle.dump(rf, f)
    print(f'\nPickle model saved: {pickle_path}')

    # Save encoders
    enc_path = os.path.join(model_dir, 'encoders.pkl')
    with open(enc_path, 'wb') as f:
        pickle.dump(encoders, f)
    print(f'Encoders saved: {enc_path}')

    # Export to ONNX
    if HAS_ONNX:
        try:
            initial_type = [('float_input', FloatTensorType([None, len(FEATURE_COLUMNS)]))]
            onnx_model = convert_sklearn(rf, initial_types=initial_type)
            onnx_path = os.path.join(model_dir, 'rf_model.onnx')
            with open(onnx_path, 'wb') as f:
                f.write(onnx_model.SerializeToString())
            print(f'ONNX model saved: {onnx_path}')
        except Exception as e:
            print(f'[WARN] ONNX export failed: {e}', file=sys.stderr)

    # Save feature column names for inference
    meta_path = os.path.join(model_dir, 'model_meta.pkl')
    with open(meta_path, 'wb') as f:
        pickle.dump({'feature_columns': FEATURE_COLUMNS, 'label_column': LABEL_COLUMN}, f)
    print(f'Model metadata saved: {meta_path}')

    return rf, encoders


if __name__ == '__main__':
    train_model()
