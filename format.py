import json

with open('./src/lib/lipstick-rooms-data.ts', 'r') as f:
    content = f.read()

# Let's just find the start of 'export const rooms'
start = content.find('export const rooms')
print(content[start:start+2000])
