import os

for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if 'tone="emerald"' in content or 'tone="cyan"' in content:
                print("Fixing", path)
                content = content.replace('tone="emerald"', 'tone="steel"')
                content = content.replace('tone="cyan"', 'tone="steel"')
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
