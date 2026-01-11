import json
import re

# Read the original script.js
with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the trainModels object
train_pattern = r'(\d+):\s*\{[\s\S]*?name:\s*"([^"]+)"[\s\S]*?coaches:\s*(\[[\s\S]*?\])\s*\},?\s*(?=\d+:|};)'

matches = re.finditer(train_pattern, content)

for match in matches:
    train_id = match.group(1)
    train_name = match.group(2)
    
    print(f"Processing train {train_id}...")
    
    # Skip 463 and 464 (already created)
    if train_id in ['463', '464']:
        continue
    
    # Extract just the coaches array for this train 
    # This is complex, so for now just notify which ones need creation
    print(f"  - {train_id}: {train_name}")

print("\nDone scanning!")
