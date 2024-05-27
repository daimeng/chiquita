import os
import json

directory = os.fsencode('data/wtt_matches')
    
for file in os.listdir(directory):
    filename = os.fsdecode(file)
    if filename.endswith(".json"):
        path = os.path.join('data/wtt_matches', filename) 
        with open(path, 'r') as f:
            print(json.load(f))
