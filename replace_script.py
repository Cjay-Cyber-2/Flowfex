import os

root_dir = '/home/gamp/Flowfex'
exclude_dirs = {'.git', 'node_modules', 'build', 'dist', '.next'}

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return

    new_content = content
    # Replace Syniq -> Syniq
    new_content = new_content.replace('Syniq', 'Syniq')
    # Replace syniq -> syniq
    new_content = new_content.replace('syniq', 'syniq')
    # Replace SYNIQ -> SYNIQ
    new_content = new_content.replace('SYNIQ', 'SYNIQ')
    # Also handle Syniq -> Syniq
    new_content = new_content.replace('Syniq', 'Syniq')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for dirpath, dirnames, filenames in os.walk(root_dir):
    dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
    for filename in filenames:
        filepath = os.path.join(dirpath, filename)
        replace_in_file(filepath)
