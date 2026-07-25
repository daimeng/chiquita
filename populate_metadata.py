import os
import json
import csv
from datetime import datetime

def main():
    tsv_path = 'data/tournaments_wtt.tsv'
    events_map = {}
    
    if os.path.exists(tsv_path):
        with open(tsv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            for row in reader:
                evt_id = str(row.get('EventId', '')).strip()
                if evt_id:
                    events_map[evt_id] = row

    wtt_matches_dir = 'data/wtt_matches'
    if not os.path.exists(wtt_matches_dir):
        print(f"Directory {wtt_matches_dir} does not exist.")
        return

    subdirs = [d for d in os.listdir(wtt_matches_dir) if os.path.isdir(os.path.join(wtt_matches_dir, d))]
    print(f"Found {len(subdirs)} folders in {wtt_matches_dir}")

    processed_count = 0
    for d in sorted(subdirs):
        dir_path = os.path.join(wtt_matches_dir, d)
        
        # Count JSON match files excluding metadata.json and results.meta
        match_files = [
            f for f in os.listdir(dir_path)
            if f.endswith('.json') and f not in ('metadata.json', 'results.meta')
        ]
        entries_downloaded = len(match_files)

        event_info = events_map.get(d, {})
        event_name = event_info.get('EventName', f"Event {d}")

        try:
            event_id_val = int(d)
        except ValueError:
            event_id_val = d

        completed_status = entries_downloaded > 0

        metadata = {
            "event_id": event_id_val,
            "event_name": event_name,
            "completed": completed_status,
            "retry_count": 0,
            "start_time": None,
            "end_time": None,
            "duration_seconds": None,
            "entries_downloaded": entries_downloaded,
            "exception": None,
            "last_updated": datetime.now().isoformat()
        }

        metadata_file = os.path.join(dir_path, 'metadata.json')
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        # Remove results.meta if present
        results_meta_file = os.path.join(dir_path, 'results.meta')
        if os.path.exists(results_meta_file):
            try:
                os.remove(results_meta_file)
            except Exception as e:
                print(f"Error removing results.meta in {dir_path}: {e}")

        processed_count += 1

    print(f"Successfully generated metadata.json in {processed_count} folders.")

if __name__ == '__main__':
    main()
