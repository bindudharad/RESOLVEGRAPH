import sqlite3
import json

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

# Check CaseEvent
cursor.execute("SELECT id, caseId, eventType, metadataJson FROM CaseEvent WHERE metadataJson LIKE '%6111%'")
rows = cursor.fetchall()
print(f"Found {len(rows)} CaseEvent rows with anomalous dates:")
for r in rows:
    ev_id, case_id, ev_type, meta_json = r
    print(f"Event: {ev_id}, Case: {case_id}, Type: {ev_type}")
    try:
        data = json.loads(meta_json)
        print("  Original:", data)
        if "purchaseDate" in data and isinstance(data["purchaseDate"], str) and "6111" in data["purchaseDate"]:
            fixed_date = data["purchaseDate"].replace("61110-", "2026-").replace("61111-", "2026-")
            data["purchaseDate"] = fixed_date
            new_meta = json.dumps(data)
            cursor.execute("UPDATE CaseEvent SET metadataJson = ? WHERE id = ?", (new_meta, ev_id))
            print(f"  Fixed to: {fixed_date}")
    except Exception as e:
        print(f"  Error parsing metadata: {e}")

# Check CaseTimelineEvent
cursor.execute("SELECT id, caseId, eventType, metadataJson FROM CaseTimelineEvent WHERE metadataJson LIKE '%6111%'")
tl_rows = cursor.fetchall()
print(f"Found {len(tl_rows)} CaseTimelineEvent rows with anomalous dates:")
for r in tl_rows:
    ev_id, case_id, ev_type, meta_json = r
    print(f"TimelineEvent: {ev_id}, Case: {case_id}")
    try:
        data = json.loads(meta_json)
        if "purchaseDate" in data and isinstance(data["purchaseDate"], str) and "6111" in data["purchaseDate"]:
            fixed_date = data["purchaseDate"].replace("61110-", "2026-").replace("61111-", "2026-")
            data["purchaseDate"] = fixed_date
            new_meta = json.dumps(data)
            cursor.execute("UPDATE CaseTimelineEvent SET metadataJson = ? WHERE id = ?", (new_meta, ev_id))
            print(f"  Fixed to: {fixed_date}")
    except Exception as e:
        print(f"  Error: {e}")

conn.commit()
conn.close()
print("Done fixing anomalous date events.")
