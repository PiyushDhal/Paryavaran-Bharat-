import os
import re

DIRECTORY = "frontend/src"

REPLACEMENTS = [
    (r"#f59e0b", "#4DA8DA"),
    (r"rgba\(245,\s*158,\s*11", "rgba(77, 168, 218"),
    (r"#10b981", "#22C55E"), # old emerald -> new success
    (r"rgba\(16,\s*185,\s*129", "rgba(34, 197, 94"),
    (r"#94a3b8", "#C0C8D4"), # old steel -> new titanium
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = content
    for pattern, repl in REPLACEMENTS:
        new_content = re.sub(pattern, repl, new_content, flags=re.IGNORECASE)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(DIRECTORY):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.css'):
            process_file(os.path.join(root, file))

print("Case-insensitive hex substitutions complete.")
