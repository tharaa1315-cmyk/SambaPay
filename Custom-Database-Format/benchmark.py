import os
import sys
import time
import random
import string
import gc
import multiprocessing
from typing import List, Dict, Optional

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("[!] 'psutil' not installed. RAM measurements will show N/A. Run: pip install psutil\n")

try:
    import resource
    HAS_RESOURCE = True
except ImportError:
    HAS_RESOURCE = False  # not available on Windows

try:
    import pymongo
    from pymongo.errors import ConnectionFailure
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False
    print("[!] 'pymongo' not installed. MongoDB benchmark will be skipped. Run: pip install pymongo\n")

# Import the new universal schema-validated Rust PyO3 module
from blaze_rust import BlazeCollection

# --- 1. Configuration ---
NUM_RECORDS = 100_000  # 100k records stress test
NUM_SEARCHES = 100
NUM_DELETIONS = 100

DEPARTMENTS = ["Engineering", "HR", "Sales", "Design", "Marketing", "Finance"]
DESIGNATIONS = ["Manager", "Developer", "Analyst", "Lead", "Intern", "Director"]

CUSTOM_SCHEMA = {
    "emp_id": "str",
    "name": "str",
    "department": "str",
    "designation": "str",
    "salary": "float"
}


# --- 2. Measurement & Generation helpers ---
def generate_random_name() -> str:
    """Generates a random alphabetic name with length between 4 and 20 characters."""
    length = random.randint(4, 20)
    letters = string.ascii_letters
    return ''.join(random.choice(letters) for _ in range(length)).capitalize()


def get_ram_mb() -> Optional[float]:
    if not HAS_PSUTIL:
        return None
    gc.collect()
    return psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)


def get_peak_rss_mb() -> Optional[float]:
    if not HAS_RESOURCE:
        return None
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return peak / (1024 * 1024) if sys.platform == "darwin" else peak / 1024


def fmt_mb(value: Optional[float]) -> str:
    return f"{value:.2f} MB" if value is not None else "N/A"


def fmt_sec(value: Optional[float]) -> str:
    return f"{value:.4f} sec" if value is not None else "N/A"


def get_mongo_server_ram_mb(client) -> Optional[float]:
    try:
        status = client.admin.command("serverStatus")
        wt_cache = status.get("wiredTiger", {}).get("cache", {})
        bytes_in_cache = wt_cache.get("bytes currently in the cache")
        
        if bytes_in_cache is not None and bytes_in_cache > 0:
            return float(bytes_in_cache) / (1024 * 1024)
            
        return float(status["mem"]["resident"])
    except Exception as e:
        print(f"[!] Error reading MongoDB RAM: {e}")
        return None


def generate_synthetic_data(count: int):
    """Generates synthetic records with dynamic random names and strict schema dtypes."""
    print(f"[*] Generating {count:,} synthetic employee records with dynamic random names (length 4-20)...")
    names_pool = [generate_random_name() for _ in range(30)]
    
    data = []
    for i in range(1, count + 1):
        data.append({
            "emp_id": f"OXP-{i:06d}",
            "name": random.choice(names_pool),
            "department": random.choice(DEPARTMENTS),
            "designation": random.choice(DESIGNATIONS),
            "salary": round(random.uniform(30000.0, 150000.0), 2)
        })
    return data, names_pool


def get_file_size_mb(filepath: str) -> float:
    return os.path.getsize(filepath) / (1024 * 1024) if os.path.exists(filepath) else 0.0


# --- 3. MongoDB Benchmark (Chunked Bulk Ingestion with Index on Name) ---
def benchmark_mongodb(data: List[Dict], names_pool: List[str]) -> Optional[Dict]:
    if not HAS_PYMONGO:
        return None

    print("\n--- Running MongoDB Benchmark (Chunked Bulk Ingestion) ---")
    client = pymongo.MongoClient("mongodb://127.0.0.1:27017/", serverSelectionTimeoutMS=5000)

    try:
        try:
            client.admin.command("ping")
        except ConnectionFailure:
            print("[!] Could not connect to local MongoDB server. Skipping benchmark.")
            return None

        db = client["hrms_bench_db"]
        collection = db["employees"]
        collection.drop()
        
        collection.create_index("name")

        mongo_data = [dict(d) for d in data]
        server_ram_before = get_mongo_server_ram_mb(client)

        chunk_size = 10_000
        inserted_ids = []
        start_time = time.perf_counter()
        for i in range(0, len(mongo_data), chunk_size):
            chunk = mongo_data[i:i + chunk_size]
            result = collection.insert_many(chunk, ordered=False)
            inserted_ids.extend(result.inserted_ids)
        insert_time = time.perf_counter() - start_time

        server_ram_after = get_mongo_server_ram_mb(client)

        search_names = random.choices(names_pool, k=NUM_SEARCHES)
        start_time = time.perf_counter()
        for name in search_names:
            _ = list(collection.find({"name": name}))
        search_time = time.perf_counter() - start_time

        delete_ids = random.sample(inserted_ids, NUM_DELETIONS)
        start_time = time.perf_counter()
        for _id in delete_ids:
            collection.delete_one({"_id": _id})
        delete_time = time.perf_counter() - start_time

        try:
            stats = db.command("collstats", "employees")
            disk_size = (stats.get("size", 0) + stats.get("totalIndexSize", 0)) / (1024 * 1024)
        except Exception:
            disk_size = 0.0

        ram_diff = None
        if server_ram_before is not None and server_ram_after is not None:
            ram_diff = max(0.0, server_ram_after - server_ram_before)

        return {
            "insert_time": insert_time,
            "search_time": search_time,
            "delete_time": delete_time,
            "ram_diff": ram_diff,
            "peak_ram": None,
            "disk_size": disk_size,
        }
    finally:
        client.close()


# --- 4. Custom DB (Rust/PyO3) Benchmark with Universal Collection ---
def benchmark_custom_db(data: List[Dict], names_pool: List[str]) -> Dict:
    print("\n--- Running Custom BlazeCollection (Universal Rust Engine) Benchmark ---")
    db_name = "custom_bench_rust"
    
    db_extensions = [".cstore", ".cidx", ".free"]
    for ext in db_extensions:
        if os.path.exists(db_name + ext):
            os.remove(db_name + ext)

    ram_before = get_ram_mb()

    # Initialize universal collection with 'name' as the index field
    db = BlazeCollection(db_name, index_field="name", schema=CUSTOM_SCHEMA)

    start_time = time.perf_counter()
    for row in data:
        db.insert(row, auto_flush=False)  # 1-by-1 insertion loop with native dtype verification
    db.flush()
    insert_time = time.perf_counter() - start_time

    ram_after = get_ram_mb()

    search_names = random.choices(names_pool, k=NUM_SEARCHES)
    start_time = time.perf_counter()
    for name in search_names:
        _ = db.search_by_index(name)
    search_time = time.perf_counter() - start_time

    delete_ids = random.sample(range(len(data)), NUM_DELETIONS)
    start_time = time.perf_counter()
    for rid in delete_ids:
        db.delete(rid, auto_flush=False)
    db.flush()
    delete_time = time.perf_counter() - start_time

    disk_size = sum(get_file_size_mb(db_name + ext) for ext in db_extensions)

    return {
        "insert_time": insert_time,
        "search_time": search_time,
        "delete_time": delete_time,
        "ram_diff": None if ram_after is None or ram_before is None else max(0.0, ram_after - ram_before),
        "peak_ram": get_peak_rss_mb(),
        "disk_size": disk_size,
    }


# --- 5. Process Isolation Wrappers ---
def run_mongo_isolated(queue):
    random.seed(42)
    data, names_pool = generate_synthetic_data(NUM_RECORDS)
    queue.put(benchmark_mongodb(data, names_pool))


def run_custom_db_isolated(queue):
    random.seed(42)
    data, names_pool = generate_synthetic_data(NUM_RECORDS)
    queue.put(benchmark_custom_db(data, names_pool))


# --- 6. Table rendering ---
def print_table(headers: List[str], rows: List[List[str]]) -> None:
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))

    def fmt_row(cells: List[str]) -> str:
        return " | ".join(cell.ljust(widths[i]) for i, cell in enumerate(cells))

    print(fmt_row(headers))
    print("-+-".join("-" * w for w in widths))
    for row in rows:
        print(fmt_row(row))


# --- 7. Main Execution & Comparison ---
def main():
    print("\n=====================================================================================================")
    print(f"       BENCHMARK ({NUM_RECORDS:,} Records, Dynamic Schema, Universal Collection)                     ")
    print("=====================================================================================================")

    mongo_res = None
    if HAS_PYMONGO:
        q_mongo = multiprocessing.Queue()
        p2 = multiprocessing.Process(target=run_mongo_isolated, args=(q_mongo,))
        p2.start()
        mongo_res = q_mongo.get()
        p2.join()

    q_custom = multiprocessing.Queue()
    p3 = multiprocessing.Process(target=run_custom_db_isolated, args=(q_custom,))
    p3.start()
    custom_res = q_custom.get()
    p3.join()

    def col(res, key, fmt):
        if res is None:
            return "N/A (skipped)"
        return fmt(res[key])

    headers = ["Metric", "MongoDB (Bulk)", "Custom DB (1-by-1 Dtype Checked)"]
    rows = [
        ["1. Insert Time", col(mongo_res, "insert_time", fmt_sec), fmt_sec(custom_res["insert_time"])],
        [f"2. Search Time ({NUM_SEARCHES:,} queries, Indexed)", col(mongo_res, "search_time", fmt_sec), fmt_sec(custom_res["search_time"])],
        [f"3. Delete Time ({NUM_DELETIONS:,} deletes, 1-by-1)", col(mongo_res, "delete_time", fmt_sec), fmt_sec(custom_res["delete_time"])],
        ["4. RAM Delta (before -> after insert)", col(mongo_res, "ram_diff", fmt_mb), fmt_mb(custom_res["ram_diff"])],
        ["5. Peak RSS (whole run, this process)", "N/A (server process)", fmt_mb(custom_res["peak_ram"])],
        ["6. Disk Usage (Total Size)", col(mongo_res, "disk_size", fmt_mb), fmt_mb(custom_res["disk_size"])],
    ]
    print_table(headers, rows)

    print("\nNotes:")
    print(" - Schema enforced dynamically via Rust engine during every record insertion.")
    print(" - Index field is dynamically configured to 'name' via Trie.")
    print("=====================================================================================================")


if __name__ == "__main__":
    main()