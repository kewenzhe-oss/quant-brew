from datetime import datetime, timedelta
import os
import time

os.environ['TZ'] = 'Asia/Shanghai'
time.tzset()

start_date = datetime(2025, 10, 29)
end_date = datetime(2026, 4, 29, 23, 59, 59)

before_time = int((end_date + timedelta(days=1)).timestamp())

total_seconds = (end_date - start_date).total_seconds()
end_time = datetime.fromtimestamp(before_time)
start_time = end_time - timedelta(seconds=total_seconds)
since = int(start_time.timestamp() * 1000)

print(f"before_time: {before_time}")
print(f"since: {since}")
print(f"since UTC: {datetime.utcfromtimestamp(since/1000)}")
print(f"end UTC: {datetime.utcfromtimestamp(before_time)}")
