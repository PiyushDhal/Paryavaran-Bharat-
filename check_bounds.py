import re
content = open('frontend/src/lib/indiaStates.ts', 'r').read()
idx = content.find('name: "Rajasthan"')
end_idx = content.find('name: "Sikkim"')
rajasthan_text = content[idx:end_idx]
lons = [float(x) for x in re.findall(r'lon:\s*([\d\.]+)', rajasthan_text)]
lats = [float(x) for x in re.findall(r'lat:\s*([\d\.]+)', rajasthan_text)]
print(min(lons), max(lons), min(lats), max(lats))
