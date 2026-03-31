import pandas as pd
import os

input_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'input', 'part-00000-66e0628d-2c7f-425a-8f5b-738bcd6bf198-c000.snappy.parquet')
output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'input', 'domains.txt')

df = pd.read_parquet(input_path)
df['root_domain'].to_csv(output_path, index=False, header=False)

print(f"Written {len(df)} domains to {output_path}")
