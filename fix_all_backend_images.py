import re
import glob

# Bad image patterns
BAD_SHOPPING_BAG = 'photo-1556909114-f6e7ad7d3136'
BAD_INVALID_PREFIX = 'photo-1558901366'

# Replacements for common products
REPLACEMENTS = {
    'instant pot': 'photo-1565958011703-44f9829ba187',
    'smart oven': 'photo-1594269807754-7b136c93e50e',
    'food processor': 'photo-1585658527410-298951f399c3',
    'kettle': 'photo-1544787219-7f47ccb76574',
    'blender': 'photo-1578936710445-4d5d8f5c6c5c',
    'mixer': 'photo-1585515656519-7d2e1d7b1f3e',
    'dutch oven': 'photo-1584992236310-6eddd54e5e81',
    'grill pan': 'photo-1585671964206-4c4ccacdbd3d',
    'frying pan': 'photo-1585671964206-4c4ccacdbd3d',
    'skillet': 'photo-1585671964206-4c4ccacdbd3d',
    'bakeware': 'photo-1586448934141-08771c5c6bab',
    'cooling rack': 'photo-1586953208448-b95a79798f07',
    'knife': 'photo-1544822688-38e74e522042',
    'kitchen tool': 'photo-1586953208448-b95a79798f07',
    'kitchen scale': 'photo-1586953208448-b95a79798f07',
    'can opener': 'photo-1586953208448-b95a79798f07',
    'utensil': 'photo-1586953208448-b95a79798f07',
    'tea maker': 'photo-1544787219-7f47ccb76574',
    'coffee maker': 'photo-1511920183459-fd8a5d6e7d4c',
    'coffee machine': 'photo-1495474472287-4d71bcdd2085',
    'tumbler': 'photo-1517254797898-04edd251bfb3',
    'sous vide': 'photo-1565958011703-44f9829ba187',
    'ice cream maker': 'photo-1560008581-09826d1de69e',
    'air fryer': 'photo-1563693997-2acf02296579',
    'slow cooker': 'photo-1565958011703-44f9829ba187',
    'toaster oven': 'photo-1594269807754-7b136c93e50e',
    'pasta maker': 'photo-1586953208448-b95a79798f07',
    'mandoline': 'photo-1586953208448-b95a79798f07',
    'rice cooker': 'photo-1565958011703-44f9829ba187',
    'popcorn': 'photo-1572177191856-4acf0c376cd7',
    'waffle maker': 'photo-1565299585323-27d8d2948192',
    'bread maker': 'photo-1509440159596-0249088772ff',
    'meat grinder': 'photo-1586953208448-b95a79798f07',
    'food dehydrator': 'photo-1590593162201-f67611c18bbe',
    'juicer': 'photo-1610970881699-44a5587cabec',
    'wine opener': 'photo-1510812431401-41d2bd2722f3',
    'spice rack': 'photo-1596040033229-a9821ebd058d',
    'cutting board': 'photo-1544822688-38e74e522042',
    'salad spinner': 'photo-1546069901-ba9599a7e63c',
    'garlic press': 'photo-1586953208448-b95a79798f07',
    'pepper mill': 'photo-1596040033229-a9821ebd058d',
    'thermometer': 'photo-1586953208448-b95a79798f07',
    'tongs': 'photo-1586953208448-b95a79798f07',
    'ladle': 'photo-1586953208448-b95a79798f07',
    'whisk': 'photo-1586953208448-b95a79798f07',
    'spatula': 'photo-1586953208448-b95a79798f07',
    'colander': 'photo-1586953208448-b95a79798f07',
    'grater': 'photo-1586953208448-b95a79798f07',
    'trash can': 'photo-1586953208448-b95a79798f07',
    'kitchen can': 'photo-1586953208448-b95a79798f07',
    'egg cooker': 'photo-1586953208448-b95a79798f07',
    'breakfast sandwich': 'photo-1565299585323-27d8d2948192',
    'countertop oven': 'photo-1594269807754-7b136c93e50e',
    'refrigerator': 'photo-1571175445120-83d0a7d6a439',
    'dishwasher': 'photo-1586953208448-b95a79798f07',
    'pressure cooker': 'photo-1565958011703-44f9829ba187',
    'cookware': 'photo-1584992236310-6eddd54e5e81',
}

def get_replacement(name_lower):
    for keyword, photo_id in REPLACEMENTS.items():
        if keyword in name_lower:
            return photo_id
    if 'coffee' in name_lower or 'espresso' in name_lower or 'nespresso' in name_lower:
        return 'photo-1495474472287-4d71bcdd2085'
    if 'tea' in name_lower or 'kettle' in name_lower:
        return 'photo-1544787219-7f47ccb76574'
    if 'knife' in name_lower or 'cutting' in name_lower:
        return 'photo-1544822688-38e74e522042'
    if 'pan' in name_lower or 'pot' in name_lower or 'cookware' in name_lower:
        return 'photo-1584992236310-6eddd54e5e81'
    if 'bake' in name_lower or 'pie' in name_lower or 'cake' in name_lower:
        return 'photo-1626803775151-61d756612fcd'
    if 'blender' in name_lower or 'mixer' in name_lower or 'processor' in name_lower:
        return 'photo-1578936710445-4d5d8f5c6c5c'
    if 'grill' in name_lower or 'fry' in name_lower:
        return 'photo-1585671964206-4c4ccacdbd3d'
    if 'container' in name_lower or 'storage' in name_lower or 'rack' in name_lower or 'tool' in name_lower:
        return 'photo-1586953208448-b95a79798f07'
    return None

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_name = None
    fixed_count = 0
    new_lines = []

    for line in lines:
        # Check if this line has a product name
        name_match = re.search(r"name:\s*'([^']+)'", line)
        if name_match:
            current_name = name_match.group(1)

        # Replace bad images
        if BAD_SHOPPING_BAG in line:
            if current_name:
                replacement = get_replacement(current_name.lower())
                if replacement:
                    line = line.replace(BAD_SHOPPING_BAG, replacement)
                    fixed_count += 1
                    print(f"Fixed shopping bag: {current_name}")
                else:
                    print(f"WARNING: No replacement for {current_name}")
        
        if BAD_INVALID_PREFIX in line:
            if current_name:
                replacement = get_replacement(current_name.lower())
                if replacement:
                    line = line.replace(BAD_INVALID_PREFIX, replacement)
                    # Keep the last 5 chars of the original ID to make it unique if needed
                    # Actually, just use the replacement photo ID fully
                    fixed_count += 1
                    print(f"Fixed invalid ID: {current_name}")
                else:
                    print(f"WARNING: No replacement for {current_name}")

        new_lines.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"Fixed {fixed_count} images in {filepath}\n")

# Fix all backend JS files
files = [
    r'c:\ojawa\backend\scripts\createMockVendor.js',
    r'c:\ojawa\backend\scripts\createKitchenProducts.js',
    r'c:\ojawa\backend\scripts\createMockVendorAPI.js',
    r'c:\ojawa\backend\scripts\createVendorAccount.js',
    r'c:\ojawa\backend\scripts\seedProducts.js',
]

for filepath in files:
    try:
        fix_file(filepath)
    except Exception as e:
        print(f"Error: {filepath}: {e}")
