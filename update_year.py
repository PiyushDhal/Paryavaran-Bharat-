import os

def replace_year_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content.replace("2026", "2026")

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('.'):
    if '.venv' in root or '.git' in root or 'node_modules' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.py') or file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            replace_year_in_file(filepath)

print("Year update completed.")
