#!/usr/bin/env python3
"""Download all configured Google Sheets tabs and update the static dataset atomically."""
import json, urllib.request, datetime, pathlib, sys
root = pathlib.Path(__file__).resolve().parent
sheet_id = '1vxjVxL8NHHB-GuJGvRq5187hKFCitA-QqIOFusBU8Ro'
months = json.loads((root / 'months.json').read_text(encoding='utf-8'))
data = {}
for month in months:
    url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:json'
    if month.get('gid') is not None:
        from urllib.parse import quote
        url += '&gid=' + quote(str(month['gid']))
    with urllib.request.urlopen(url, timeout=30) as response:
        text = response.read().decode('utf-8')
    payload = json.loads(text[text.index('(')+1:text.rindex(')')])
    if payload.get('status') != 'ok' or 'table' not in payload:
        raise RuntimeError(f"Не удалось загрузить {month['label']}: {payload}")
    data[month['key']] = payload['table']
result = {'months': months, 'tables': data, 'updatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
target = root / 'snapshot.js'
tmp = root / 'snapshot.js.tmp'
tmp.write_text('window.RATING_DATA = ' + json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
tmp.replace(target)
print('Данные обновлены:', result['updatedAt'])
