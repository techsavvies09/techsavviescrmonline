import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JsonDatabase {
  constructor() {
    this.data = {
      users: [],
      employees: [],
      customers: [],
      productPlans: [],
      issueCategories: [],
      issueTypes: [],
      departments: [],
      issues: [],
      calls: [],
      attendance: [],
      leaves: [],
      bulletins: [],
      emailLogs: [],
      settings: {}
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading database file, initializing defaults:', err.message);
      this.save();
    }
  }

  save() {
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  getCollection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return this.data[name];
  }

  find(collection, filterFn = () => true) {
    return this.getCollection(collection).filter(filterFn);
  }

  findOne(collection, filterFn) {
    return this.getCollection(collection).find(filterFn) || null;
  }

  findById(collection, id) {
    return this.getCollection(collection).find(item => item.id === id) || null;
  }

  insert(collection, item) {
    const list = this.getCollection(collection);
    list.push(item);
    this.save();
    return item;
  }

  update(collection, id, updates) {
    const list = this.getCollection(collection);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return list[index];
  }

  delete(collection, id) {
    const list = this.getCollection(collection);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return false;
    list.splice(index, 1);
    this.save();
    return true;
  }

  getSettings() {
    return this.data.settings || {};
  }

  updateSettings(updates) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.data.settings;
  }
}

export const db = new JsonDatabase();
