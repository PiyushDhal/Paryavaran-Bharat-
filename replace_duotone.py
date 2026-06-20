import os
import re

DIRECTORY = "frontend/src"

REPLACEMENTS = [
    # Replace colors
    (r"text-mint", "text-brand-steel"),
    (r"bg-mint", "bg-brand-steel"),
    (r"border-mint", "border-brand-steel"),
    (r"ring-mint", "ring-brand-amber"),
    
    (r"text-brand-green", "text-brand-amber"),
    (r"bg-brand-green", "bg-brand-amber"),
    (r"border-brand-green", "border-brand-amber"),
    
    (r"text-brand-emerald", "text-brand-amber"),
    (r"bg-brand-emerald", "bg-brand-amber"),
    
    (r"text-emerald-300", "text-brand-steel"),
    (r"text-emerald-400", "text-brand-amber"),
    (r"text-emerald-500", "text-brand-amber"),
    (r"bg-emerald-\d+/\d+", "bg-brand-amber/10"),
    (r"bg-emerald-\d+", "bg-brand-amber"),
    
    # Hex codes to Tailwind classes where possible, or new Hex
    (r"text-\[\#34D399\]", "text-brand-amber"),
    (r"bg-\[\#34D399\]", "bg-brand-amber"),
    (r"text-\[\#10B981\]", "text-brand-amber"),
    (r"bg-\[\#10B981\]", "bg-brand-amber"),
    (r"text-\[\#A7F3D0\]", "text-brand-steel"),
    
    # Specific Hex Strings used in charts/styles
    (r"#34D399", "#F59E0B"), # Emerald -> Amber
    (r"#10B981", "#F59E0B"), # Green -> Amber
    (r"#A7F3D0", "#94A3B8"), # Mint -> Steel Blue
    
    # Glow text classes
    (r"glow-emerald", "glow-amber"),
    (r"glow-mint", "glow-steel")
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = content
    for pattern, repl in REPLACEMENTS:
        new_content = re.sub(pattern, repl, new_content)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(DIRECTORY):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.css'):
            process_file(os.path.join(root, file))

print("Style 4 Duotone substitutions complete.")
