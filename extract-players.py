#!/usr/bin/env python3
import os
import json
import pandas as pd
from collections import defaultdict

def main():
    print("Loading tournaments...")
    tf = pd.read_csv('data/tournaments_wtt.tsv', sep='\t', parse_dates=['StartDateTime', 'EndDateTime'])
    tf.sort_values(by=['StartDateTime'], inplace=True)

    players = []
    genders = defaultdict(lambda: None)

    print("Extracting players from matches...")
    for row in tf.itertuples():
        evt = os.path.join('data/wtt_matches', str(row.EventId))
        if not os.path.isdir(evt):
            continue

        for filename in os.listdir(evt):
            if not filename.endswith(".json"):
                continue

            with open(os.path.join('data/wtt_matches', str(row.EventId), filename)) as f:
                m = json.load(f)

            gender = m['documentCode'][3]

            # Updated structure starting June 2026, Event 3241
            m = m.get('match_card') or m

            isTeam = False
            for c in m['competitiors']:
                if isTeam:
                    break

                for p in c['players']:
                    p['gender'] = gender
                    pid = int(p['playerId'])
                    if pid > 100000000 or pid < 90000:
                        isTeam = True
                    if isTeam:
                        break

                    if not p['playerOrgCode']:
                        p['playerOrgCode'] = c['competitiorOrg']
                    players.append(p)

            if isTeam and m['teamParentData']:
                for _m in m['teamParentData']['extended_info']['matches']:
                    if not _m.get('match_result'):
                        continue

                    mm = _m['match_result']
                    for c in mm['competitiors']:
                        for p in c['players']:
                            p['gender'] = gender
                            pid = int(p['playerId'])
                            if pid > 100000000 or pid < 90000:
                                continue

                            if not p['playerOrgCode']:
                                p['playerOrgCode'] = c['competitiorOrg']
                            players.append(p)

    print(f"Extracted {len(players)} player records. Building DataFrame...")
    pf = pd.DataFrame(players)
    if 'playerPosition' in pf.columns:
        pf.drop(columns=['playerPosition'], inplace=True)

    print("Cleaning player records (deduplicating and resolving conflicts)...")
    cleaned = []
    for player_id, rows in pf.groupby('playerId'):
        clrow = {
            'id': player_id,
            'org': None,
            'name': '',
            'gender': 'X',
        }
        for row in rows.itertuples():
            if row.gender != 'X':
                clrow['gender'] = row.gender
            if '^' in clrow['name'] or (clrow['name'] != row.playerName and min(sum(1 for c in clrow['name'] if c.isupper()), 4) < min(sum(1 for c in row.playerName if c.isupper()), 4)):
                clrow['name'] = row.playerName
            if not clrow['org']:
                clrow['org'] = row.playerOrgCode
            elif row.playerOrgCode:
                # take shorter country code, don't want double codes
                if len(row.playerOrgCode) < len(clrow['org']):
                    clrow['org'] = row.playerOrgCode

        cleaned.append(clrow)
    
    cf = pd.DataFrame(cleaned)
    print(f"Deduplicated to {len(cf)} unique players.")

    print("Saving cleaned players list to TSV...")
    os.makedirs('data/wtt_cleaned', exist_ok=True)
    cf.to_csv('data/wtt_cleaned/players.tsv', index=False, sep='\t')
    print("Done!")

if __name__ == '__main__':
    main()
