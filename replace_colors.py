import os
import re

# Directory to scan
src_dir = os.path.join(os.path.dirname(__file__), 'src')

replacements = {
    # Backgrounds
    r'bg-white\b': 'bg-card',
    r'bg-\[\#F8F7F7\]': 'bg-background',
    r'bg-\[\#F7F7F6\]': 'bg-muted',
    r'bg-\[\#F3F3F1\]': 'bg-muted',
    # Text colors
    r'text-\[\#111111\]': 'text-foreground',
    r'text-\[\#1A1A1A\]': 'text-foreground',
    r'text-\[\#444444\]': 'text-muted-foreground',
    r'text-\[\#555555\]': 'text-muted-foreground',
    r'text-\[\#737373\]': 'text-muted-foreground',
    r'text-\[\#9B9B98\]': 'text-muted-foreground',
    r'text-\[\#AEAEAD\]': 'text-muted-foreground',
    r'text-\[\#CFCFCC\]': 'text-muted-foreground',
    r'text-gray-900\b': 'text-foreground',
    r'text-gray-700\b': 'text-muted-foreground',
    r'text-gray-600\b': 'text-muted-foreground',
    r'text-gray-500\b': 'text-muted-foreground',
    r'text-slate-900\b': 'text-foreground',
    r'text-slate-700\b': 'text-muted-foreground',
    r'text-slate-600\b': 'text-muted-foreground',
    r'text-slate-500\b': 'text-muted-foreground',
    # Borders
    r'border-\[\#E4E4E2\]': 'border-border',
    r'border-\[\#F0F0EF\]': 'border-border',
    r'border-gray-200\b': 'border-border',
    r'border-slate-200\b': 'border-border',
    # Hover states
    r'hover:bg-\[\#F7F7F6\]': 'hover:bg-muted',
    r'hover:bg-\[\#F3F3F1\]': 'hover:bg-muted',
    r'hover:bg-gray-50\b': 'hover:bg-muted',
    r'hover:bg-slate-50\b': 'hover:bg-muted',
    r'hover:text-\[\#111111\]': 'hover:text-foreground',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    for pattern, replacement in replacements.items():
        content = re.sub(pattern, replacement, content)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

print("Done replacing hardcoded colors.")
