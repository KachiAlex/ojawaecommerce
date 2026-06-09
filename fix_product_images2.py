import re

# Product name keyword -> appropriate image URL
IMAGE_MAP = {
    'pressure cooker': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
    'espresso machine': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    'food processor': 'https://images.unsplash.com/photo-1585658527410-298951f399c3?w=400',
    'stand mixer': 'https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400',
    'dutch oven': 'https://images.unsplash.com/photo-1584992236310-6eddd54e5e81?w=400',
    'cookware set': 'https://images.unsplash.com/photo-1584992236310-6eddd54e5e81?w=400',
    'grill pan': 'https://images.unsplash.com/photo-1585671964206-4c4ccacdbd3d?w=400',
    'frying pan': 'https://images.unsplash.com/photo-1585671964206-4c4ccacdbd3d?w=400',
    'skillet': 'https://images.unsplash.com/photo-1585671964206-4c4ccacdbd3d?w=400',
    'bakeware set': 'https://images.unsplash.com/photo-1586448934141-08771c5c6bab?w=400',
    'pie dish': 'https://images.unsplash.com/photo-1626803775151-61d756612fcd?w=400',
    'bundt pan': 'https://images.unsplash.com/photo-1626803775151-61d756612fcd?w=400',
    'cooling rack': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'knife set': 'https://images.unsplash.com/photo-1544822688-38e74e522042?w=400',
    'kitchen tool set': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'kitchen scale': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'can opener': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'utensil set': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'tea maker': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
    'coffee maker': 'https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400',
    'tumbler': 'https://images.unsplash.com/photo-1517254797898-04edd251bfb3?w=400',
    'sous vide': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
    'ice cream maker': 'https://images.unsplash.com/photo-1560008581-09826d1de69e?w=400',
    'air fryer': 'https://images.unsplash.com/photo-1563693997-2acf02296579?w=400',
    'slow cooker': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
    'toaster oven': 'https://images.unsplash.com/photo-1594269807754-7b136c93e50e?w=400',
    'blender': 'https://images.unsplash.com/photo-1578936710445-4d5d8f5c6c5c?w=400',
    'pasta maker': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    'mandoline': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    'rice cooker': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
    'popcorn': 'https://images.unsplash.com/photo-1572177191856-4acf0c376cd7?w=400',
    'waffle maker': 'https://images.unsplash.com/photo-1565299585323-27d8d2948192?w=400',
    'bread maker': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    'meat grinder': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'food dehydrator': 'https://images.unsplash.com/photo-1590593162201-f67611c18bbe?w=400',
    'juicer': 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400',
    'wine opener': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400',
    'spice rack': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
    'cutting board': 'https://images.unsplash.com/photo-1544822688-38e74e522042?w=400',
    'salad spinner': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    'garlic press': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'pepper mill': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
    'thermometer': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'tongs': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'ladle': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'whisk': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'spatula': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'colander': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'grater': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'trash can': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'egg cooker': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400',
    'breakfast sandwich': 'https://images.unsplash.com/photo-1565299585323-27d8d2948192?w=400',
    'countertop oven': 'https://images.unsplash.com/photo-1594269807754-7b136c93e50e?w=400',
    'refrigerator': 'https://images.unsplash.com/photo-1571175445120-83d0a7d6a439?w=400',
    'dishwasher': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
}

def get_image_for_product(name):
    name_lower = name.lower()
    for keyword, image in IMAGE_MAP.items():
        if keyword in name_lower:
            return image
    if 'coffee' in name_lower or 'espresso' in name_lower or 'nespresso' in name_lower:
        return 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'
    if 'tea' in name_lower or 'kettle' in name_lower:
        return 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400'
    if 'knife' in name_lower or 'cutting' in name_lower:
        return 'https://images.unsplash.com/photo-1544822688-38e74e522042?w=400'
    if 'pan' in name_lower or 'pot' in name_lower or 'cookware' in name_lower or 'dutch oven' in name_lower:
        return 'https://images.unsplash.com/photo-1584992236310-6eddd54e5e81?w=400'
    if 'bake' in name_lower or 'pie' in name_lower or 'cake' in name_lower:
        return 'https://images.unsplash.com/photo-1626803775151-61d756612fcd?w=400'
    if 'blender' in name_lower or 'mixer' in name_lower or 'processor' in name_lower:
        return 'https://images.unsplash.com/photo-1578936710445-4d5d8f5c6c5c?w=400'
    if 'grill' in name_lower or 'fry' in name_lower:
        return 'https://images.unsplash.com/photo-1585671964206-4c4ccacdbd3d?w=400'
    if 'container' in name_lower or 'storage' in name_lower or 'rack' in name_lower or 'tool' in name_lower:
        return 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400'
    return 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_name = None
    fixed_count = 0
    new_lines = []

    for i, line in enumerate(lines):
        # Check if this line has a product name
        name_match = re.search(r"name:\s*'([^']+)'", line)
        if name_match:
            current_name = name_match.group(1)

        # Check if this line has a bad image URL
        if 'photo-1556909114-f6e7ad7d3136' in line or 'photo-1558901366' in line:
            if current_name:
                new_image = get_image_for_product(current_name)
                if new_image != 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400':
                    line = re.sub(
                        r"images:\s*\['https://images\.unsplash\.com/[^']+\?w=400'\]",
                        f"images: ['{new_image}']",
                        line
                    )
                    fixed_count += 1
                    print(f"Fixed: {current_name} -> {new_image}")

        new_lines.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"\nTotal fixed: {fixed_count} images in {filepath}")

fix_file(r'c:\ojawa\backend\scripts\seed50KitchenProducts.js')
