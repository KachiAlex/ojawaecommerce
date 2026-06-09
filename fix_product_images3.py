import re

# Specific product name -> image replacements
SPECIFIC_FIXES = {
    "Wilton Perfect Results Premium Baking Set": "https://images.unsplash.com/photo-1586448934141-08771c5c6bab?w=400",
    "Hario V60 Ceramic Dripper": "https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400",
    "YETI Rambler 20 oz Tumbler": "https://images.unsplash.com/photo-1517254797898-04edd251bfb3?w=400",
    "SousVide Supreme Water Oven": "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400",
    "Cuisinart Ice Cream Maker": "https://images.unsplash.com/photo-1560008581-09826d1de69e?w=400",
    "SimpleHuman Rectangular Step Trash Can": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
    "Kamenstein Spice Rack": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400",
    "Chefman Electric Spiralizer": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
    "Dash Rapid Egg Cooker": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
    "Presto PopLite Hot Air Popcorn Popper": "https://images.unsplash.com/photo-1572177191856-4acf0c376cd7?w=400",
    "Wolf Gourmet Countertop Oven": "https://images.unsplash.com/photo-1594269807754-7b136c93e50e?w=400",
    "Vitamix A3500 Ascent Blender": "https://images.unsplash.com/photo-1578936710445-4d5d8f5c6c5c?w=400",
    "KitchenAid Commercial Stand Mixer": "https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400",
    "Sub-Zero Built-in Refrigerator": "https://images.unsplash.com/photo-1571175445120-83d0a7d6a439?w=400",
    "Miele G 7000 Series Dishwasher": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400",
    "USA Pan Bakeware Set": "https://images.unsplash.com/photo-1586448934141-08771c5c6bab?w=400",
    "Emile Henry Pie Dish": "https://images.unsplash.com/photo-1626803775151-61d756612fcd?w=400",
    "Nordic Ware Bundt Pan": "https://images.unsplash.com/photo-1626803775151-61d756612fcd?w=400",
    "OXO Good Grips Cooling Rack": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
    "OXO Good Grips Kitchen Tool Set": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
    "Cuisinart Digital Kitchen Scale": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
    "Zyliss Lock-N-Lift Can Opener": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
    "Joseph Joseph Elevate Utensil Set": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
}

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    fixed_count = 0

    for product_name, new_image in SPECIFIC_FIXES.items():
        # Find the product block and replace its image
        # Pattern: name: 'Product Name', ... images: ['OLD_URL']
        pattern = rf"(name:\s*'{re.escape(product_name)}'[\s\S]*?images:\s*\[)'https://images\.unsplash\.com/[^']+\?w=400'(\])"
        
        def replace_match(m):
            nonlocal fixed_count
            fixed_count += 1
            return f"{m.group(1)}'{new_image}'{m.group(2)}"
        
        new_content, count = re.subn(pattern, replace_match, content)
        if count > 0:
            content = new_content
            print(f"Fixed ({count}x): {product_name}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\nTotal fixed: {fixed_count}")

fix_file(r'c:\ojawa\backend\scripts\seed50KitchenProducts.js')
