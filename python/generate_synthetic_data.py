"""
ClearAlert — Synthetic AML Alert Data Generator
Generates realistic-looking AML transaction alerts for model training and demo purposes.
"""
import os
import csv
import random
from datetime import datetime, timedelta

# Seed for reproducibility
random.seed(42)

# ─── Configuration ─────────────────────────────────
NUM_RECORDS = 2000
FALSE_POSITIVE_RATE = 0.92  # 92% of alerts are false positives (realistic for AML)

CUSTOMER_NAMES = [
    'Acme Global Trading', 'Baker Industries Ltd', 'Coastal Shipping Co',
    'Delta Financial Services', 'Echo Payments Inc', 'First National Imports',
    'Global Logistics Corp', 'Harbor Trading Group', 'Infinity Capital Partners',
    'Jade Investment Holdings', 'Keystone Manufacturing', 'Lighthouse Ventures',
    'Meridian Resources', 'Nordic Supply Chain', 'Orion Holdings Ltd',
    'Pacific Gateway LLC', 'Quantum Ventures', 'Ridgeline Exports',
    'Summit Financial Group', 'Trident International', 'Unity Commerce',
    'Vertex Capital Management', 'Windward Enterprises', 'Xenon Technologies',
    'Yorkdale Partners', 'Zenith Capital Group',
]

ALERT_TYPES = [
    'Large Cash Transaction', 'Structuring Suspicion', 'Unusual Cross-Border Pattern',
    'Rapid Fund Movement', 'High-Risk Jurisdiction', 'Dormant Account Activity',
    'Large Cash Structuring', 'Unusual Wire Pattern', 'Round-Trip Transaction',
    'Third-Party Payment', 'Layered Transfer', 'Mismatched Profile',
]

COUNTRIES = [
    'United States', 'United Kingdom', 'Germany', 'France', 'Japan',
    'Canada', 'Australia', 'Singapore', 'Hong Kong', 'Switzerland',
    'Cayman Islands', 'Panama', 'British Virgin Islands', 'Luxembourg',
    'Netherlands', 'Ireland', 'UAE', 'India', 'Brazil', 'Mexico',
]

HIGH_RISK_COUNTRIES = {'Cayman Islands', 'Panama', 'British Virgin Islands'}


def generate_record(record_id, base_date):
    """Generate a single AML alert record."""
    customer = random.choice(CUSTOMER_NAMES)
    alert_type = random.choice(ALERT_TYPES)
    src = random.choice(COUNTRIES)
    dst = random.choice([c for c in COUNTRIES if c != src])
    date = base_date - timedelta(days=random.randint(0, 180))
    amount = round(random.lognormvariate(10, 1.5), 2)  # log-normal for realistic spread
    amount = max(500, min(amount, 5_000_000))

    account_age = random.randint(1, 240)  # months
    prev_alerts = random.randint(0, 15)
    tx_frequency = random.randint(1, 200)  # monthly transactions
    avg_tx_amount = round(amount * random.uniform(0.3, 1.5), 2)
    is_pep = random.random() < 0.05  # 5% chance

    # Determine if false positive based on features
    # Higher fp_score = more likely to be a false positive (safe alert)
    fp_score = 0.0
    if src not in HIGH_RISK_COUNTRIES and dst not in HIGH_RISK_COUNTRIES:
        fp_score += 0.15
    if account_age > 24:
        fp_score += 0.15
    elif account_age > 12:
        fp_score += 0.08
    if prev_alerts < 3:
        fp_score += 0.12
    if amount < 100_000:
        fp_score += 0.10
    if not is_pep:
        fp_score += 0.08
    if tx_frequency > 20:
        fp_score += 0.08

    # Add randomness to create realistic spread
    fp_score += random.uniform(-0.15, 0.15)
    fp_score = max(0.0, min(1.0, fp_score))

    # Threshold calibrated for ~92% false positive rate
    is_false_positive = 1 if fp_score > 0.30 else 0

    return {
        'alert_id': f'ALT-2024-{record_id:04d}',
        'customer_id': f'CUST-{hash(customer) % 10000:04d}',
        'customer_name': customer,
        'transaction_date': date.strftime('%Y-%m-%d'),
        'transaction_amount': round(amount, 2),
        'source_country': src,
        'destination_country': dst,
        'alert_type': alert_type,
        'risk_score': round(random.uniform(0.1, 1.0), 3),
        'previous_alerts_count': prev_alerts,
        'account_age_months': account_age,
        'is_pep': int(is_pep),
        'transaction_frequency': tx_frequency,
        'avg_transaction_amount': round(avg_tx_amount, 2),
        'is_false_positive': is_false_positive,
    }


def generate_dataset(output_path=None):
    """Generate the full synthetic dataset and save to CSV."""
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'synthetic_aml_alerts.csv')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    base_date = datetime(2024, 3, 15)
    records = [generate_record(i, base_date) for i in range(1, NUM_RECORDS + 1)]

    fieldnames = list(records[0].keys())
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    fp_count = sum(1 for r in records if r['is_false_positive'] == 1)
    print(f'Generated {NUM_RECORDS} records -> {output_path}')
    print(f'  False positives: {fp_count} ({fp_count/NUM_RECORDS*100:.1f}%)')
    print(f'  True positives:  {NUM_RECORDS - fp_count} ({(NUM_RECORDS-fp_count)/NUM_RECORDS*100:.1f}%)')

    return output_path


if __name__ == '__main__':
    generate_dataset()
