use pyo3::prelude::*;
use pyo3::exceptions::{PyKeyError, PyTypeError};
use pyo3::types::{PyDict, PyList, PyString, PyFloat, PyLong, PyBool};
use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{self, Read, Seek, SeekFrom, Write};

#[cfg(unix)]
use std::os::unix::fs::FileExt;
#[cfg(windows)]
use std::os::windows::fs::FileExt;

// ==========================================
// 0. POSITIONED I/O HELPERS
// ==========================================
#[inline]
fn read_at_exact(f: &File, offset: u64, buf: &mut [u8]) -> io::Result<()> {
    #[cfg(unix)] { f.read_exact_at(buf, offset) }
    #[cfg(windows)] {
        let mut total = 0usize;
        while total < buf.len() {
            let n = f.seek_read(&mut buf[total..], offset + total as u64)?;
            if n == 0 { return Err(io::Error::new(io::ErrorKind::UnexpectedEof, "unexpected EOF")); }
            total += n;
        }
        Ok(())
    }
    #[cfg(not(any(unix, windows)))] {
        let mut f2 = f.try_clone()?;
        f2.seek(SeekFrom::Start(offset))?;
        f2.read_exact(buf)
    }
}

#[inline]
fn write_at_exact(f: &File, offset: u64, buf: &[u8]) -> io::Result<()> {
    #[cfg(unix)] { f.write_all_at(buf, offset) }
    #[cfg(windows)] {
        let mut total = 0usize;
        while total < buf.len() {
            let n = f.seek_write(&buf[total..], offset + total as u64)?;
            if n == 0 { return Err(io::Error::new(io::ErrorKind::WriteZero, "failed to write")); }
            total += n;
        }
        Ok(())
    }
    #[cfg(not(any(unix, windows)))] {
        let mut f2 = f.try_clone()?;
        f2.seek(SeekFrom::Start(offset))?;
        f2.write_all(buf)
    }
}

// ==========================================
// 1. DYNAMIC FIELD & RECORD STRUCTURE
// ==========================================
#[derive(Clone, Debug)]
pub enum FieldValue {
    Str(String),
    Float(f64),
    Int(i64),
    Bool(bool),
    Null,
}

#[pyclass]
#[derive(Clone, Debug)]
pub struct Record {
    #[pyo3(get, set)] pub record_id: i32,
    fields: HashMap<String, FieldValue>,
}

#[pymethods]
impl Record {
    // Removed #[getter] so Python can call it as a method: record.get_fields()
    fn get_fields(&self, py: Python) -> PyResult<PyObject> {
        let dict = PyDict::new(py);
        dict.set_item("record_id", self.record_id)?;
        for (k, v) in &self.fields {
            match v {
                FieldValue::Str(s) => { dict.set_item(k, s)?; }
                FieldValue::Float(f) => { dict.set_item(k, f)?; }
                FieldValue::Int(i) => { dict.set_item(k, i)?; }
                FieldValue::Bool(b) => { dict.set_item(k, b)?; }
                FieldValue::Null => { dict.set_item(k, py.None())?; }
            }
        }
        Ok(dict.into())
    }

    fn __repr__(&self) -> String {
        format!("<Record id={} fields_count={}>", self.record_id, self.fields.len())
    }
}

impl Record {
    fn serialize(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        buf.extend_from_slice(&self.record_id.to_le_bytes());
        buf.extend_from_slice(&(self.fields.len() as u32).to_le_bytes());

        for (k, v) in &self.fields {
            let k_bytes = k.as_bytes();
            buf.extend_from_slice(&(k_bytes.len() as u16).to_le_bytes());
            buf.extend_from_slice(k_bytes);

            match v {
                FieldValue::Str(s) => {
                    buf.push(1);
                    let s_bytes = s.as_bytes();
                    buf.extend_from_slice(&(s_bytes.len() as u32).to_le_bytes());
                    buf.extend_from_slice(s_bytes);
                }
                FieldValue::Float(f) => {
                    buf.push(2);
                    buf.extend_from_slice(&f.to_le_bytes());
                }
                FieldValue::Int(i) => {
                    buf.push(3);
                    buf.extend_from_slice(&i.to_le_bytes());
                }
                FieldValue::Bool(b) => {
                    buf.push(4);
                    buf.push(if *b { 1 } else { 0 });
                }
                FieldValue::Null => {
                    buf.push(5);
                }
            }
        }
        buf
    }

    #[inline(always)]
    fn deserialize(raw_bytes: &[u8]) -> Self {
        let mut pos = 0;
        let record_id = i32::from_le_bytes(raw_bytes[pos..pos+4].try_into().unwrap());
        pos += 4;
        let num_fields = u32::from_le_bytes(raw_bytes[pos..pos+4].try_into().unwrap()) as usize;
        pos += 4;

        let mut fields = HashMap::with_capacity(num_fields);

        for _ in 0..num_fields {
            let k_len = u16::from_le_bytes(raw_bytes[pos..pos+2].try_into().unwrap()) as usize;
            pos += 2;
            let key = unsafe { std::str::from_utf8_unchecked(&raw_bytes[pos..pos+k_len]) }.to_string();
            pos += k_len;

            let type_tag = raw_bytes[pos];
            pos += 1;

            let val = match type_tag {
                1 => {
                    let s_len = u32::from_le_bytes(raw_bytes[pos..pos+4].try_into().unwrap()) as usize;
                    pos += 4;
                    let s = unsafe { std::str::from_utf8_unchecked(&raw_bytes[pos..pos+s_len]) }.to_string();
                    pos += s_len;
                    FieldValue::Str(s)
                }
                2 => {
                    let f = f64::from_le_bytes(raw_bytes[pos..pos+8].try_into().unwrap());
                    pos += 8;
                    FieldValue::Float(f)
                }
                3 => {
                    let i = i64::from_le_bytes(raw_bytes[pos..pos+8].try_into().unwrap());
                    pos += 8;
                    FieldValue::Int(i)
                }
                4 => {
                    let b = raw_bytes[pos] != 0;
                    pos += 1;
                    FieldValue::Bool(b)
                }
                _ => FieldValue::Null,
            };

            fields.insert(key, val);
        }

        Record { record_id, fields }
    }
}

// ==========================================
// 2. DYNAMIC TRIE INDEX
// ==========================================
#[derive(Default)]
struct TrieNode {
    children: Vec<(char, u32)>,
    pointers: Vec<u32>,
}

struct StringTrie {
    arena: Vec<TrieNode>,
}

impl Default for StringTrie {
    fn default() -> Self {
        Self { arena: vec![TrieNode::default()] }
    }
}

impl StringTrie {
    #[inline]
    fn child_or_insert(&mut self, node: u32, ch: char) -> u32 {
        match self.arena[node as usize].children.binary_search_by_key(&ch, |&(c, _)| c) {
            Ok(pos) => self.arena[node as usize].children[pos].1,
            Err(pos) => {
                let new_idx = self.arena.len() as u32;
                self.arena.push(TrieNode::default());
                self.arena[node as usize].children.insert(pos, (ch, new_idx));
                new_idx
            }
        }
    }

    fn insert(&mut self, key: &str, pointer: u32) {
        let mut curr = 0u32;
        for ch in key.chars().flat_map(|c| c.to_lowercase()) {
            curr = self.child_or_insert(curr, ch);
        }
        self.arena[curr as usize].pointers.push(pointer);
    }

    #[inline]
    fn find_node(&self, key: &str) -> Option<u32> {
        let mut curr = 0u32;
        for ch in key.chars().flat_map(|c| c.to_lowercase()) {
            let children = &self.arena[curr as usize].children;
            match children.binary_search_by_key(&ch, |&(c, _)| c) {
                Ok(pos) => curr = children[pos].1,
                Err(_) => return None,
            }
        }
        Some(curr)
    }

    fn search(&self, key: &str) -> &[u32] {
        self.find_node(key)
            .map(|idx| self.arena[idx as usize].pointers.as_slice())
            .unwrap_or(&[])
    }

    fn remove_pointer(&mut self, key: &str, pointer: u32) -> bool {
        if let Some(idx) = self.find_node(key) {
            let node = &mut self.arena[idx as usize];
            if let Some(pos) = node.pointers.iter().position(|&p| p == pointer) {
                node.pointers.swap_remove(pos);
                return true;
            }
        }
        false
    }

    fn optimize_ram(&mut self) {
        self.arena.shrink_to_fit();
        for node in &mut self.arena {
            node.children.shrink_to_fit();
            node.pointers.shrink_to_fit();
        }
    }
}

// ==========================================
// 3. ROW STORAGE (RAM-Cached Index)
// ==========================================
#[derive(Clone, Copy)]
struct IdxEntry {
    offset: u64,
    length: u32,
    active: u8,
}

impl IdxEntry {
    #[inline]
    fn to_bytes(&self) -> [u8; 13] {
        let mut buf = [0u8; 13];
        buf[0..8].copy_from_slice(&self.offset.to_le_bytes());
        buf[8..12].copy_from_slice(&self.length.to_le_bytes());
        buf[12] = self.active;
        buf
    }

    #[inline]
    fn from_bytes(buf: &[u8; 13]) -> Self {
        IdxEntry {
            offset: u64::from_le_bytes(buf[0..8].try_into().unwrap()),
            length: u32::from_le_bytes(buf[8..12].try_into().unwrap()),
            active: buf[12],
        }
    }
}

struct RowStorage {
    data_fp: File,
    idx_fp: File,
    free_fp: File,
    index_cache: Vec<IdxEntry>,
    free_slots: Vec<u32>,
    free_dirty: bool,
    data_len: u64,
    num_slots: u32,
}

impl RowStorage {
    fn new(base_path: &str) -> Self {
        let data_fp = OpenOptions::new().read(true).write(true).create(true).open(format!("{}.cstore", base_path)).unwrap();
        let idx_fp = OpenOptions::new().read(true).write(true).create(true).open(format!("{}.cidx", base_path)).unwrap();
        let mut free_fp = OpenOptions::new().read(true).write(true).create(true).open(format!("{}.free", base_path)).unwrap();

        let data_len = data_fp.metadata().unwrap().len();
        let num_slots = (idx_fp.metadata().unwrap().len() / 13) as u32;

        let total_bytes = (num_slots as usize) * 13;
        let mut idx_buf = vec![0u8; total_bytes];
        if total_bytes > 0 { read_at_exact(&idx_fp, 0, &mut idx_buf).unwrap(); }
        
        let mut index_cache = Vec::with_capacity(num_slots as usize);
        for chunk in idx_buf.chunks_exact(13) {
            index_cache.push(IdxEntry::from_bytes(chunk.try_into().unwrap()));
        }

        let mut free_buf = Vec::new();
        free_fp.seek(SeekFrom::Start(0)).unwrap();
        free_fp.read_to_end(&mut free_buf).unwrap();
        let mut free_slots = Vec::with_capacity(free_buf.len() / 4);
        for chunk in free_buf.chunks_exact(4) {
            free_slots.push(u32::from_le_bytes(chunk.try_into().unwrap()));
        }

        Self { data_fp, idx_fp, free_fp, index_cache, free_slots, free_dirty: false, data_len, num_slots }
    }

    #[inline]
    fn get_slot(&mut self) -> u32 {
        if let Some(slot) = self.free_slots.pop() {
            self.free_dirty = true;
            return slot;
        }
        let slot = self.num_slots;
        self.num_slots += 1;
        slot
    }

    fn write(&mut self, record: &mut Record, auto_flush: bool) -> u32 {
        let slot = self.get_slot();
        record.record_id = slot as i32;
        let bytes = record.serialize();

        let offset = self.data_len;
        write_at_exact(&self.data_fp, offset, &bytes).unwrap();
        self.data_len += bytes.len() as u64;

        let entry = IdxEntry { offset, length: bytes.len() as u32, active: 1 };
        write_at_exact(&self.idx_fp, (slot as u64) * 13, &entry.to_bytes()).unwrap();

        if (slot as usize) < self.index_cache.len() {
            self.index_cache[slot as usize] = entry;
        } else {
            self.index_cache.push(entry);
        }

        if auto_flush { self.flush(); }
        slot
    }

    #[inline]
    fn read_into(&self, slot: u32, buf: &mut Vec<u8>) -> Option<Record> {
        let entry = self.index_cache.get(slot as usize)?; 
        if entry.active == 0 { return None; }

        buf.resize(entry.length as usize, 0);
        read_at_exact(&self.data_fp, entry.offset, buf).ok()?;
        Some(Record::deserialize(buf))
    }

    fn read(&self, slot: u32) -> Option<Record> {
        let mut buf = Vec::new();
        self.read_into(slot, &mut buf)
    }

    fn delete(&mut self, slot: u32, auto_flush: bool) -> bool {
        if let Some(entry) = self.index_cache.get_mut(slot as usize) {
            if entry.active == 0 { return false; }
            entry.active = 0;
            write_at_exact(&self.idx_fp, (slot as u64) * 13, &entry.to_bytes()).unwrap();
            
            self.free_slots.push(slot);
            self.free_dirty = true;
            if auto_flush { self.flush(); }
            true
        } else {
            false
        }
    }

    fn flush(&mut self) {
        self.data_fp.sync_all().unwrap();
        self.idx_fp.sync_all().unwrap();
        if self.free_dirty {
            let mut buf = Vec::with_capacity(self.free_slots.len() * 4);
            for &s in &self.free_slots { buf.extend_from_slice(&s.to_le_bytes()); }
            self.free_fp.set_len(0).unwrap();
            self.free_fp.seek(SeekFrom::Start(0)).unwrap();
            self.free_fp.write_all(&buf).unwrap();
            self.free_fp.sync_all().unwrap();
            self.free_dirty = false;
        }
    }
}

// ==========================================
// 4. DATABASE API (UNIVERSAL COLLECTION)
// ==========================================
#[pyclass]
pub struct BlazeCollection {
    storage: RowStorage,
    trie: StringTrie,
    schema: HashMap<String, String>, 
    index_field: String, // Dynamic field to index via Trie (e.g., "name", "employee_id")
}

impl BlazeCollection {
    fn validate_and_parse(&self, data: &PyDict) -> PyResult<Record> {
        let mut fields = HashMap::new();

        for (k, v) in data.iter() {
            let key: String = k.extract()?;
            
            if v.is_none() {
                fields.insert(key, FieldValue::Null);
                continue;
            }

            let dtype = self.schema.get(&key).map(|s| s.as_str()).unwrap_or("str");
            let field_val = match dtype {
                "str" => {
                    if let Ok(s) = v.downcast::<PyString>() {
                        FieldValue::Str(s.to_string())
                    } else {
                        return Err(PyTypeError::new_err(format!("TypeError: Field '{}' expected type 'str'", key)));
                    }
                }
                "float" => {
                    if let Ok(f) = v.downcast::<PyFloat>() {
                        FieldValue::Float(f.value())
                    } else if let Ok(i) = v.downcast::<PyLong>() {
                        FieldValue::Float(i.extract::<i64>()? as f64)
                    } else {
                        return Err(PyTypeError::new_err(format!("TypeError: Field '{}' expected numeric type", key)));
                    }
                }
                "int" => {
                    if let Ok(i) = v.downcast::<PyLong>() {
                        FieldValue::Int(i.extract::<i64>()?)
                    } else {
                        return Err(PyTypeError::new_err(format!("TypeError: Field '{}' expected type 'int'", key)));
                    }
                }
                "bool" => {
                    if let Ok(b) = v.downcast::<PyBool>() {
                        FieldValue::Bool(b.is_true())
                    } else {
                        return Err(PyTypeError::new_err(format!("TypeError: Field '{}' expected type 'bool'", key)));
                    }
                }
                _ => {
                    if let Ok(s) = v.downcast::<PyString>() {
                        FieldValue::Str(s.to_string())
                    } else {
                        FieldValue::Null
                    }
                }
            };
            fields.insert(key, field_val);
        }

        Ok(Record { record_id: -1, fields })
    }

    fn merge_and_validate(&self, existing: &Record, updates: &PyDict) -> PyResult<Record> {
        let mut fields = existing.fields.clone();

        for (k, v) in updates.iter() {
            let key: String = k.extract()?;
            
            if v.is_none() {
                fields.insert(key, FieldValue::Null);
                continue;
            }

            let dtype = self.schema.get(&key).map(|s| s.as_str()).unwrap_or("str");
            let field_val = match dtype {
                "str" => {
                    if let Ok(s) = v.downcast::<PyString>() { FieldValue::Str(s.to_string()) } 
                    else { return Err(PyTypeError::new_err(format!("TypeError: Field '{}' expected type 'str'", key))); }
                }
                "float" => {
                    if let Ok(f) = v.downcast::<PyFloat>() { FieldValue::Float(f.value()) } 
                    else if let Ok(i) = v.downcast::<PyLong>() { FieldValue::Float(i.extract::<i64>()? as f64) } 
                    else { return Err(PyTypeError::new_err(format!("TypeError: Field '{}' expected numeric type", key))); }
                }
                "int" => {
                    if let Ok(i) = v.downcast::<PyLong>() { FieldValue::Int(i.extract::<i64>()?) } 
                    else { return Err(PyTypeError::new_err(format!("TypeError: Field '{}' expected type 'int'", key))); }
                }
                "bool" => {
                    if let Ok(b) = v.downcast::<PyBool>() { FieldValue::Bool(b.is_true()) } 
                    else { return Err(PyTypeError::new_err(format!("TypeError: Field '{}' expected type 'bool'", key))); }
                }
                _ => FieldValue::Null,
            };
            fields.insert(key, field_val);
        }

        Ok(Record { record_id: existing.record_id, fields })
    }

    fn matches_filters(&self, rec: &Record, filters: &PyDict) -> PyResult<bool> {
        for (k, v) in filters.iter() {
            let key: String = k.extract()?;
            
            if key == "record_id" {
                if let Ok(rid) = v.extract::<i32>() {
                    if rec.record_id != rid { return Ok(false); }
                }
                continue;
            }

            let Some(field_val) = rec.fields.get(&key) else { return Ok(false); };
            
            match field_val {
                FieldValue::Str(s) => {
                    if let Ok(val_str) = v.extract::<String>() {
                        if s != &val_str { return Ok(false); }
                    } else { return Ok(false); }
                }
                FieldValue::Float(f) => {
                    if let Ok(val_f) = v.extract::<f64>() {
                        if *f != val_f { return Ok(false); }
                    } else if let Ok(val_i) = v.extract::<i64>() {
                        if *f != (val_i as f64) { return Ok(false); }
                    } else { return Ok(false); }
                }
                FieldValue::Int(i) => {
                    if let Ok(val_i) = v.extract::<i64>() {
                        if *i != val_i { return Ok(false); }
                    } else { return Ok(false); }
                }
                FieldValue::Bool(b) => {
                    if let Ok(val_b) = v.extract::<bool>() {
                        if *b != val_b { return Ok(false); }
                    } else { return Ok(false); }
                }
                FieldValue::Null => {
                    if !v.is_none() { return Ok(false); }
                }
            }
        }
        Ok(true)
    }
}

#[pymethods]
impl BlazeCollection {
    #[new]
    #[pyo3(signature = (path, index_field="id".to_string(), schema=None))]
    fn new(path: String, index_field: String, schema: Option<&PyDict>) -> PyResult<Self> {
        let storage = RowStorage::new(&path);
        let mut trie = StringTrie::default();
        let mut schema_map = HashMap::new();

        if let Some(py_dict) = schema {
            for (key, val) in py_dict.iter() {
                let k: String = key.extract()?;
                let v: String = val.extract()?;
                schema_map.insert(k, v);
            }
        }

        let mut scratch_buf = Vec::new();
        for (slot, entry) in storage.index_cache.iter().enumerate() {
            if entry.active == 1 {
                scratch_buf.resize(entry.length as usize, 0);
                if read_at_exact(&storage.data_fp, entry.offset, &mut scratch_buf).is_ok() {
                    let rec = Record::deserialize(&scratch_buf);
                    
                    // Insert into Trie if the dynamic index_field exists and is a String
                    if let Some(FieldValue::Str(s)) = rec.fields.get(&index_field) {
                        trie.insert(s, slot as u32);
                    }
                }
            }
        }

        trie.optimize_ram();
        Ok(BlazeCollection { storage, trie, schema: schema_map, index_field })
    }

    #[pyo3(signature = (data, auto_flush=true))]
    fn insert(&mut self, data: &PyDict, auto_flush: bool) -> PyResult<u32> {
        let mut rec = self.validate_and_parse(data)?;
        let slot = self.storage.write(&mut rec, auto_flush);
        
        if let Some(FieldValue::Str(s)) = rec.fields.get(&self.index_field) {
            self.trie.insert(s, slot);
        }
        Ok(slot)
    }

    #[pyo3(signature = (records_list, auto_flush=true))]
    fn batch_insert(&mut self, records_list: &PyList, auto_flush: bool) -> PyResult<Vec<u32>> {
        let mut inserted_ids = Vec::with_capacity(records_list.len());

        for item in records_list {
            let dict = item.downcast::<PyDict>()
                .map_err(|_| PyTypeError::new_err("Each item in batch_insert list must be a dictionary"))?;
            
            let mut scratch_rec = self.validate_and_parse(dict)?;
            let slot = self.storage.write(&mut scratch_rec, false);
            
            if let Some(FieldValue::Str(s)) = scratch_rec.fields.get(&self.index_field) {
                self.trie.insert(s, slot);
            }
            inserted_ids.push(slot);
        }

        if auto_flush { self.storage.flush(); }
        Ok(inserted_ids)
    }

    #[pyo3(signature = (record_id))]
    fn get(&self, record_id: u32) -> PyResult<Option<Record>> {
        Ok(self.storage.read(record_id))
    }

    #[pyo3(signature = (limit=None))]
    fn search_all(&self, limit: Option<usize>) -> PyResult<Vec<Record>> {
        let actual_limit = limit.unwrap_or(usize::MAX);
        let mut results = Vec::new();
        let mut scratch_buf = Vec::new();

        for (slot, entry) in self.storage.index_cache.iter().enumerate() {
            if entry.active == 1 {
                if let Some(rec) = self.storage.read_into(slot as u32, &mut scratch_buf) {
                    results.push(rec);
                    if results.len() >= actual_limit { break; }
                }
            }
        }
        Ok(results)
    }

    #[pyo3(signature = (index_value, limit=None))]
    fn search_by_index(&self, index_value: &str, limit: Option<usize>) -> PyResult<Vec<Record>> {
        let pointers = self.trie.search(index_value);
        let actual_limit = limit.unwrap_or(pointers.len());
        
        let mut results = Vec::with_capacity(pointers.len().min(actual_limit));
        let mut scratch_buf = Vec::new();

        for &p in pointers.iter().take(actual_limit) {
            if let Some(rec) = self.storage.read_into(p, &mut scratch_buf) {
                results.push(rec);
            }
        }
        Ok(results)
    }

    #[pyo3(signature = (filters, limit=None))]
    fn search_conditional(&self, filters: &PyDict, limit: Option<usize>) -> PyResult<Vec<Record>> {
        let actual_limit = limit.unwrap_or(usize::MAX);
        let mut results = Vec::new();
        let mut scratch_buf = Vec::new();

        for (slot, entry) in self.storage.index_cache.iter().enumerate() {
            if entry.active == 1 {
                if let Some(rec) = self.storage.read_into(slot as u32, &mut scratch_buf) {
                    if self.matches_filters(&rec, filters)? {
                        results.push(rec);
                        if results.len() >= actual_limit { break; }
                    }
                }
            }
        }
        Ok(results)
    }

    #[pyo3(signature = (record_id, updates, auto_flush=true))]
    fn update(&mut self, record_id: u32, updates: &PyDict, auto_flush: bool) -> PyResult<bool> {
        let existing = match self.storage.read(record_id) {
            Some(rec) => rec,
            None => return Ok(false),
        };

        let mut new_rec = self.merge_and_validate(&existing, updates)?;
        new_rec.record_id = record_id as i32;

        if let Some(FieldValue::Str(s)) = existing.fields.get(&self.index_field) {
            self.trie.remove_pointer(s, record_id);
        }

        self.storage.delete(record_id, false);
        
        let bytes = new_rec.serialize();
        let _ = self.storage.get_slot(); // Pop the free slot generated by delete to reuse it seamlessly
        let offset = self.storage.data_len;
        write_at_exact(&self.storage.data_fp, offset, &bytes).unwrap();
        self.storage.data_len += bytes.len() as u64;

        let entry = IdxEntry { offset, length: bytes.len() as u32, active: 1 };
        write_at_exact(&self.storage.idx_fp, (record_id as u64) * 13, &entry.to_bytes()).unwrap();
        self.storage.index_cache[record_id as usize] = entry;

        if let Some(FieldValue::Str(s)) = new_rec.fields.get(&self.index_field) {
            self.trie.insert(s, record_id);
        }

        if auto_flush { self.storage.flush(); }
        Ok(true)
    }

    #[pyo3(signature = (filters, updates, auto_flush=true))]
    fn update_conditional(&mut self, filters: &PyDict, updates: &PyDict, auto_flush: bool) -> PyResult<usize> {
        let mut scratch_buf = Vec::new();
        let mut matched_slots = Vec::new();

        for (slot, entry) in self.storage.index_cache.iter().enumerate() {
            if entry.active == 1 {
                if let Some(rec) = self.storage.read_into(slot as u32, &mut scratch_buf) {
                    if self.matches_filters(&rec, filters)? {
                        matched_slots.push(slot as u32);
                    }
                }
            }
        }

        let mut updated_count = 0;
        for p in matched_slots {
            if let Some(existing) = self.storage.read(p) {
                if let Ok(mut new_rec) = self.merge_and_validate(&existing, updates) {
                    if let Some(FieldValue::Str(s)) = existing.fields.get(&self.index_field) {
                        self.trie.remove_pointer(s, p);
                    }
                    
                    self.storage.delete(p, false); // Free the slot
                    let _ = self.storage.get_slot(); // Pop it right back to reuse it safely

                    new_rec.record_id = p as i32;
                    let bytes = new_rec.serialize();
                    let offset = self.storage.data_len;
                    write_at_exact(&self.storage.data_fp, offset, &bytes).unwrap();
                    self.storage.data_len += bytes.len() as u64;

                    let entry = IdxEntry { offset, length: bytes.len() as u32, active: 1 };
                    write_at_exact(&self.storage.idx_fp, (p as u64) * 13, &entry.to_bytes()).unwrap();
                    self.storage.index_cache[p as usize] = entry;
                    
                    if let Some(FieldValue::Str(s)) = new_rec.fields.get(&self.index_field) {
                        self.trie.insert(s, p);
                    }
                    updated_count += 1;
                }
            }
        }

        if auto_flush { self.storage.flush(); }
        Ok(updated_count)
    }

    #[pyo3(signature = (record_id, auto_flush=true))]
    fn delete(&mut self, record_id: u32, auto_flush: bool) -> PyResult<bool> {
        if let Some(existing) = self.storage.read(record_id) {
            if let Some(FieldValue::Str(s)) = existing.fields.get(&self.index_field) {
                self.trie.remove_pointer(s, record_id);
            }
        }
        Ok(self.storage.delete(record_id, auto_flush))
    }

    #[pyo3(signature = (filters, auto_flush=true))]
    fn delete_conditional(&mut self, filters: &PyDict, auto_flush: bool) -> PyResult<usize> {
        let mut scratch_buf = Vec::new();
        let mut matched_slots = Vec::new();

        for (slot, entry) in self.storage.index_cache.iter().enumerate() {
            if entry.active == 1 {
                if let Some(rec) = self.storage.read_into(slot as u32, &mut scratch_buf) {
                    if self.matches_filters(&rec, filters)? {
                        matched_slots.push(slot as u32);
                    }
                }
            }
        }

        let mut deleted_count = 0;
        for p in matched_slots {
            if let Some(existing) = self.storage.read(p) {
                if let Some(FieldValue::Str(s)) = existing.fields.get(&self.index_field) {
                    self.trie.remove_pointer(s, p);
                }
            }
            if self.storage.delete(p, false) {
                deleted_count += 1;
            }
        }

        if auto_flush { self.storage.flush(); }
        Ok(deleted_count)
    }

    fn flush(&mut self) -> PyResult<()> {
        self.storage.flush();
        Ok(())
    }
}

// ==========================================
// 5. PYTHON MODULE REGISTRATION
// ==========================================
#[pymodule]
fn blaze_rust(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<Record>()?;
    m.add_class::<BlazeCollection>()?;
    Ok(())
}