import json
from pathlib import Path

path = Path('data/headteam-vorlauf.json')
data = json.loads(path.read_text(encoding='utf-8'))

active = {
    '4ff1d75e-13cb-4bec-add8-ed2d97e2fe02': 'leitartikel',
    '293666ea-0632-4791-8460-a1fbcfd1702a': 'hoersaele',
    '4c763ef8-e5d2-46be-851e-2084d5aca5e7': 'hoersaele',
    '3218c0ec-f658-497b-bffd-fb3fe47e43ee': 'neue-produkte',
    'cc31d4f7-16b5-4bd4-9162-cad4b43b1454': 'leitartikel',
    '925a48e5-3d78-48f7-a0e7-5c21f5f6331c': 'hoersaele',
    '43fe73ee-8474-479a-a113-9273622e81e9': 'hoersaele',
    '67dda69c-cdea-42c3-8d54-0789de61343f': 'leitartikel',
    '5086a0d7-aaf9-46e8-830e-9b34bf751905': 'kms-content',
    '41b0dcd7-b118-483f-a2a4-04dd9db5b729': 'neue-produkte',
    'e06cc914-b161-4746-857b-dde7d08bf364': 'leitartikel',
}

archive = {
    'aae6b1fd-40fc-4c14-b65c-931de64b0a54': 'club-haus',
    '441e9ccb-bb18-4cac-87cf-1acd7f1583fe': 'club-haus',
    '4e0883a3-d4c4-402c-b747-7e02757279c5': 'club-haus',
    '2a1b2001-f224-48fe-9be0-c548f978aac1': 'oeffentlich',
    'e345d482-3fd9-40fd-8590-ad1f71e52c8b': 'oeffentlich',
    '0c5f5a3b-d6ed-4494-bd8a-55002fdcf659': 'club-haus',
}


def apply(items, mapping, label):
    seen = set()
    changed = 0
    for item in items:
        item_id = item.get('id')
        if item_id not in mapping:
            continue
        seen.add(item_id)
        wanted = mapping[item_id]
        current = item.get('category')
        if current not in (None, '', wanted):
            raise SystemExit(f'{label}: {item_id} has unexpected category {current!r}; refusing to overwrite with {wanted!r}')
        if current != wanted:
            item['category'] = wanted
            changed += 1
    missing = set(mapping) - seen
    if missing:
        raise SystemExit(f'{label}: IDs not found: {sorted(missing)}')
    return changed

changed_active = apply(data.get('projects', []), active, 'projects')
changed_archive = apply(data.get('archive', []), archive, 'archive')

path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Categories assigned: projects={changed_active}, archive={changed_archive}')
